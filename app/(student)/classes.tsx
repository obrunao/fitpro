import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Clock, UserCheck, MapPin, Users } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Button, Badge, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { useState } from 'react';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatSchedule(schedules: any[]): string {
  if (!schedules?.length) return 'Sem horário definido';
  return schedules
    .map(
      (s: any) =>
        `${DAY_NAMES[s.day_of_week]} ${formatTime(s.start_time)}-${formatTime(s.end_time)}`
    )
    .join(' | ');
}

export default function StudentClasses() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const userId = session?.user?.id;

  const {
    data: enrollments,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['student-enrollments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select(
          '*, classes:class_id(*, class_schedules(*), profiles:teacher_id(full_name))'
        )
        .eq('student_id', userId!)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: nextSessions } = useQuery({
    queryKey: ['student-next-sessions', userId],
    queryFn: async () => {
      if (!enrollments?.length) return {};
      const n = new Date();
      const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      const classIds = enrollments.map((e: any) => e.class_id);

      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .in('class_id', classIds)
        .gte('date', today)
        .eq('status', 'scheduled')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      const byClass: Record<string, any> = {};
      data?.forEach((s: any) => {
        if (!byClass[s.class_id]) {
          byClass[s.class_id] = s;
        }
      });
      return byClass;
    },
    enabled: !!enrollments?.length,
  });

  const checkinMutation = useMutation({
    mutationFn: async ({
      sessionId,
    }: {
      sessionId: string;
    }) => {
      const { error } = await supabase.from('checkins').insert({
        session_id: sessionId,
        student_id: userId!,
        status: 'confirmed',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-next-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['student-stats'] });
      Alert.alert('Presença confirmada!', 'Você confirmou presença para esta aula.');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível confirmar presença. Tente novamente.');
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const renderClassCard = ({ item }: { item: any }) => {
    const cls = item.classes;
    const schedules = cls?.class_schedules ?? [];
    const teacherName = cls?.profiles?.full_name ?? 'Professor';
    const nextSession = nextSessions?.[item.class_id];
    const color = cls?.color ?? theme.colors.primary[500];

    return (
      <View style={styles.card}>
        {/* Color top bar */}
        <View style={[styles.cardTopBar, { backgroundColor: color }]} />

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleArea}>
              <Text style={styles.className} numberOfLines={1}>
                {cls?.name ?? 'Aula'}
              </Text>
              <Text style={styles.teacherName}>{teacherName}</Text>
            </View>
            <Badge variant={cls?.type === 'personal' ? 'accent' : 'primary'}>
              {cls?.type === 'personal' ? 'Personal' : 'Grupo'}
            </Badge>
          </View>

          {/* Info rows */}
          <View style={styles.infoArea}>
            <View style={styles.infoRow}>
              <Clock size={14} color={theme.colors.neutral[400]} />
              <Text style={styles.infoText}>{formatSchedule(schedules)}</Text>
            </View>
            {cls?.location && (
              <View style={styles.infoRow}>
                <MapPin size={14} color={theme.colors.neutral[400]} />
                <Text style={styles.infoText} numberOfLines={1}>{cls.location}</Text>
              </View>
            )}
          </View>

          {/* Next session */}
          {nextSession && (
            <View style={styles.nextBlock}>
              <View style={styles.nextInfo}>
                <Text style={styles.nextLabel}>PRÓXIMA AULA</Text>
                <Text style={styles.nextDate}>
                  {new Date(nextSession.date).toLocaleDateString('pt-BR', {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  })}{' '}
                  às {formatTime(nextSession.start_time)}
                </Text>
              </View>
              <Button
                title="Confirmar"
                onPress={() =>
                  checkinMutation.mutate({
                    sessionId: nextSession.id,
                  })
                }
                variant="primary"
                size="sm"
                loading={checkinMutation.isPending}
                icon={<UserCheck size={14} color="#FFFFFF" />}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>Minhas Aulas</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {enrollments?.length ?? 0} ativa{(enrollments?.length ?? 0) !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {enrollments?.length ? (
        <FlatList
          data={enrollments}
          renderItem={renderClassCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <EmptyState
          icon={<Dumbbell size={48} color={theme.colors.neutral[300]} />}
          title="Nenhuma aula encontrada"
          description="Você ainda não está matriculado em nenhuma aula. Entre em contato com seu professor para se inscrever."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  screenTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 26,
    color: theme.colors.neutral[900],
    letterSpacing: -0.5,
  },
  countPill: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  countPillText: {
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    color: theme.colors.primary[700],
  },
  list: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  cardTopBar: {
    height: 5,
  },
  cardContent: {
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cardTitleArea: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  className: {
    fontFamily: theme.fonts.subheading,
    fontSize: 18,
    color: theme.colors.neutral[900],
  },
  teacherName: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  infoArea: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    flex: 1,
  },
  nextBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  nextInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  nextLabel: {
    fontFamily: theme.fonts.caption,
    fontSize: 10,
    color: theme.colors.primary[600],
    letterSpacing: 0.8,
  },
  nextDate: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.primary[800],
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
