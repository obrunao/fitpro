import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Clock, MapPin, DollarSign } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Badge, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import type { Class, ClassSchedule } from '@/types/database';

interface ClassWithDetails extends Class {
  class_enrollments: { count: number }[];
  class_schedules: ClassSchedule[];
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function formatSchedule(schedules: ClassSchedule[]): string {
  if (!schedules || schedules.length === 0) return 'Sem horario definido';
  return schedules
    .map(
      (s) =>
        `${DAY_NAMES[s.day_of_week]} ${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`
    )
    .join(' | ');
}

function formatPrice(cls: Class): string {
  if (cls.monthly_price) return `R$ ${Number(cls.monthly_price).toFixed(0)}/mes`;
  if (cls.price_per_class) return `R$ ${Number(cls.price_per_class).toFixed(0)}/aula`;
  return 'Preco nao definido';
}

export default function ClassesScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const {
    data: classes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['teacher-classes', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(
          '*, class_enrollments(count), class_schedules(*)'
        )
        .eq('teacher_id', profile!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClassWithDetails[];
    },
    enabled: !!profile?.id,
  });

  const renderClassItem = ({ item }: { item: ClassWithDetails }) => {
    const studentCount = item.class_enrollments?.[0]?.count ?? 0;
    const color = item.color || theme.colors.primary[500];

    return (
      <Pressable
        onPress={() => router.push(`/(teacher)/classes/${item.id}` as any)}
        style={({ pressed }) => pressed && { opacity: 0.95 }}
      >
        <View style={styles.card}>
          <View style={[styles.cardTopBar, { backgroundColor: color }]} />
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleArea}>
                <Text style={styles.className} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.classType}>
                  {item.type === 'group' ? 'Grupo' : 'Personal'}
                  {item.modality ? ` · ${item.modality}` : ''}
                </Text>
              </View>
              <Badge variant={item.is_active ? 'success' : 'neutral'}>
                {item.is_active ? 'Ativa' : 'Inativa'}
              </Badge>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailCell}>
                <Users size={14} color={theme.colors.neutral[400]} />
                <Text style={styles.detailValue}>{studentCount}/{item.max_students}</Text>
                <Text style={styles.detailLabel}>alunos</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailCell}>
                <DollarSign size={14} color={theme.colors.neutral[400]} />
                <Text style={styles.detailValue}>{formatPrice(item)}</Text>
              </View>
            </View>

            {/* Schedule */}
            <View style={styles.metaRow}>
              <Clock size={13} color={theme.colors.neutral[400]} />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatSchedule(item.class_schedules)}
              </Text>
            </View>

            {item.location && (
              <View style={styles.metaRow}>
                <MapPin size={13} color={theme.colors.neutral[400]} />
                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.headerArea}>
        <Text style={styles.screenTitle}>Turmas</Text>
        <View style={styles.countPill}>
          <Text style={styles.countPillText}>
            {classes.length} turma{classes.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {classes.length === 0 ? (
        <EmptyState
          icon={<Users size={48} color={theme.colors.neutral[300]} />}
          title="Nenhuma turma criada"
          description="Crie sua primeira turma para comecar a gerenciar seus alunos"
          actionLabel="Criar turma"
          onAction={() => router.push('/(teacher)/classes/create')}
        />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderClassItem}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={() => router.push('/(teacher)/classes/create')}
      >
        <Plus size={24} color={theme.colors.neutral[0]} />
      </Pressable>
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
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 100,
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
  classType: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  detailCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.neutral[200],
    marginHorizontal: theme.spacing.md,
  },
  detailValue: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.neutral[800],
  },
  detailLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  metaText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    backgroundColor: theme.colors.primary[600],
    transform: [{ scale: 0.95 }],
  },
});
