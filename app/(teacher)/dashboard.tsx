import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  CalendarCheck,
  DollarSign,
  AlertTriangle,
  Plus,
  UserPlus,
  Clock,
  MapPin,
  ArrowRight,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatWeekday(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Professor';

  const { data: activeStudents = 0, isLoading: loadingStudents } = useQuery({
    queryKey: ['teacher-active-students', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('class_enrollments')
        .select('id, classes!inner(teacher_id)', { count: 'exact', head: true })
        .eq('classes.teacher_id', profile!.id)
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });

  const { data: todaySessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['teacher-today-sessions', profile?.id],
    queryFn: async () => {
      const n = new Date();
      const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, classes(name, color)')
        .eq('classes.teacher_id', profile!.id)
        .eq('date', today)
        .order('start_time');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  const { data: monthRevenue = 0, isLoading: loadingRevenue } = useQuery({
    queryKey: ['teacher-month-revenue', profile?.id],
    queryFn: async () => {
      const now = new Date();
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const startOfMonth = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
      const endOfMonth = fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('teacher_id', profile!.id)
        .eq('status', 'paid')
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth);
      if (error) throw error;
      return (data ?? []).reduce((sum, p) => sum + p.amount, 0);
    },
    enabled: !!profile?.id,
  });

  const { data: overdueCount = 0, isLoading: loadingOverdue } = useQuery({
    queryKey: ['teacher-overdue', profile?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', profile!.id)
        .eq('status', 'overdue');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });

  const { data: upcomingSessions = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['teacher-upcoming-sessions', profile?.id],
    queryFn: async () => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, classes(name, color, location)')
        .eq('classes.teacher_id', profile!.id)
        .gte('date', todayStr)
        .eq('status', 'scheduled')
        .order('date')
        .order('start_time')
        .limit(8);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!profile?.id,
  });

  const isLoading = loadingStudents || loadingSessions || loadingRevenue || loadingOverdue;

  return (
    <Screen scroll={true}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.heroName}>{firstName}</Text>
          </View>
          <View style={styles.todayBadge}>
            <CalendarCheck size={16} color={theme.colors.primary[500]} />
            <Text style={styles.todayBadgeText}>
              {todaySessions.length} aula{todaySessions.length !== 1 ? 's' : ''} hoje
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary[500]} style={{ paddingVertical: 48 }} />
      ) : (
        <>
          {/* Stats Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            <View style={[styles.statCard, { borderLeftColor: theme.colors.primary[500] }]}>
              <Users size={18} color={theme.colors.primary[500]} />
              <Text style={styles.statValue}>{activeStudents}</Text>
              <Text style={styles.statLabel}>Alunos ativos</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: theme.colors.success }]}>
              <DollarSign size={18} color={theme.colors.success} />
              <Text style={styles.statValue}>R$ {Number(monthRevenue).toFixed(0)}</Text>
              <Text style={styles.statLabel}>Receita do mês</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: theme.colors.warning }]}>
              <AlertTriangle size={18} color={theme.colors.warning} />
              <Text style={styles.statValue}>{overdueCount}</Text>
              <Text style={styles.statLabel}>Inadimplentes</Text>
            </View>
          </ScrollView>

          {/* Quick Actions */}
          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionPill, pressed && styles.actionPillPressed]}
              onPress={() => router.push('/(teacher)/classes')}
            >
              <Plus size={16} color={theme.colors.neutral[0]} />
              <Text style={styles.actionPillText}>Nova Turma</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionPill,
                styles.actionPillSecondary,
                pressed && styles.actionPillPressed,
              ]}
              onPress={() => {}}
            >
              <UserPlus size={16} color={theme.colors.primary[600]} />
              <Text style={styles.actionPillTextSecondary}>Convidar Aluno</Text>
            </Pressable>
          </View>

          {/* Upcoming Sessions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximas aulas</Text>
              <ArrowRight size={18} color={theme.colors.neutral[400]} />
            </View>

            {loadingUpcoming ? (
              <ActivityIndicator color={theme.colors.primary[500]} style={styles.loader} />
            ) : upcomingSessions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Clock size={28} color={theme.colors.neutral[300]} />
                <Text style={styles.emptyText}>Nenhuma aula agendada</Text>
              </View>
            ) : (
              <View style={styles.sessionsList}>
                {upcomingSessions.slice(0, 5).map((s: any, i: number) => {
                  const color = s.classes?.color ?? theme.colors.primary[500];
                  const loc = s.location || s.classes?.location;
                  return (
                    <View
                      key={s.id}
                      style={[
                        styles.sessionRow,
                        i < Math.min(upcomingSessions.length, 5) - 1 && styles.sessionRowBorder,
                      ]}
                    >
                      <View style={[styles.sessionAccent, { backgroundColor: color }]} />
                      <View style={styles.sessionDateCol}>
                        <Text style={styles.sessionWeekday}>{formatWeekday(s.date)}</Text>
                        <Text style={styles.sessionDay}>{new Date(s.date + 'T12:00:00').getDate()}</Text>
                      </View>
                      <View style={styles.sessionDetails}>
                        <Text style={styles.sessionName} numberOfLines={1}>
                          {s.classes?.name ?? 'Aula'}
                        </Text>
                        <View style={styles.sessionMeta}>
                          <Clock size={12} color={theme.colors.neutral[400]} />
                          <Text style={styles.sessionMetaText}>
                            {formatTime(s.start_time)} - {formatTime(s.end_time)}
                          </Text>
                        </View>
                        {loc && (
                          <View style={styles.sessionMeta}>
                            <MapPin size={12} color={theme.colors.neutral[400]} />
                            <Text style={styles.sessionMetaText} numberOfLines={1}>{loc}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.neutral[500],
    letterSpacing: 0.3,
  },
  heroName: {
    fontFamily: theme.fonts.heading,
    fontSize: 32,
    color: theme.colors.neutral[900],
    marginTop: 2,
    letterSpacing: -0.5,
  },
  todayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  todayBadgeText: {
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    color: theme.colors.primary[700],
  },
  statsScroll: {
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  statCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderLeftWidth: 4,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 140,
    gap: 6,
  },
  statValue: {
    fontFamily: theme.fonts.heading,
    fontSize: 26,
    color: theme.colors.neutral[900],
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: theme.radius.full,
  },
  actionPillSecondary: {
    backgroundColor: theme.colors.primary[50],
  },
  actionPillPressed: {
    opacity: 0.85,
  },
  actionPillText: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.neutral[0],
  },
  actionPillTextSecondary: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.primary[600],
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontFamily: theme.fonts.subheading,
    fontSize: 17,
    color: theme.colors.neutral[800],
    letterSpacing: 0.2,
  },
  sessionsList: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  sessionAccent: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 14,
  },
  sessionDateCol: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 36,
  },
  sessionWeekday: {
    fontFamily: theme.fonts.caption,
    fontSize: 11,
    color: theme.colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionDay: {
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    color: theme.colors.neutral[800],
    letterSpacing: -0.5,
  },
  sessionDetails: {
    flex: 1,
    gap: 3,
  },
  sessionName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[800],
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  emptyBox: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
  loader: {
    paddingVertical: theme.spacing.lg,
  },
});
