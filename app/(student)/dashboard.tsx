import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  Flame,
  BookOpen,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  MapPin,
  Clock,
} from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Card, Badge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import type { ClassEnrollment } from '@/types/database';
import { useState } from 'react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0];
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function formatWeekday(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export default function StudentDashboard() {
  const { profile, session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const userId = session?.user?.id;

  const {
    data: upcomingSessions,
    isLoading: loadingSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['student-upcoming-sessions', userId],
    queryFn: async () => {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const { data: enrollments, error: enrollErr } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', userId!)
        .eq('status', 'active');

      if (enrollErr) throw enrollErr;
      if (!enrollments?.length) return [];

      const classIds = enrollments.map((e: Pick<ClassEnrollment, 'class_id'>) => e.class_id);

      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, classes:class_id(name, color, location)')
        .in('class_id', classIds)
        .gte('date', today)
        .eq('status', 'scheduled')
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(6);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    data: pendingPayments,
    isLoading: loadingPayments,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['student-pending-payments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, classes:class_id(name)')
        .eq('student_id', userId!)
        .in('status', ['pending', 'overdue'])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const {
    data: stats,
    isLoading: loadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['student-stats', userId],
    queryFn: async () => {
      const { count: totalClasses } = await supabase
        .from('class_enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId!)
        .eq('status', 'active');

      const { count: totalCheckins } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', userId!)
        .eq('status', 'attended');

      const { data: recentCheckins } = await supabase
        .from('checkins')
        .select('status, created_at')
        .eq('student_id', userId!)
        .order('created_at', { ascending: false })
        .limit(30);

      let streak = 0;
      if (recentCheckins) {
        for (const c of recentCheckins) {
          if (c.status === 'attended') {
            streak++;
          } else {
            break;
          }
        }
      }

      return {
        enrolledClasses: totalClasses ?? 0,
        totalCheckins: totalCheckins ?? 0,
        streak,
      };
    },
    enabled: !!userId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSessions(), refetchPayments(), refetchStats()]);
    setRefreshing(false);
  };

  const firstName = profile ? getFirstName(profile.full_name) : '';

  return (
    <Screen scroll={true}>
      <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />

      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.heroName}>{firstName}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Flame size={18} color="#FF6B35" />
            <Text style={styles.streakText}>{stats?.streak ?? 0}</Text>
          </View>
        </View>
      </View>

      {/* Stats Strip */}
      <View style={styles.statsStrip}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.success }]} />
          <Text style={styles.statNumber}>{stats?.totalCheckins ?? 0}</Text>
          <Text style={styles.statLabel}>presenças</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.info }]} />
          <Text style={styles.statNumber}>{stats?.enrolledClasses ?? 0}</Text>
          <Text style={styles.statLabel}>turmas</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: theme.colors.warning }]} />
          <Text style={styles.statNumber}>{pendingPayments?.length ?? 0}</Text>
          <Text style={styles.statLabel}>pendências</Text>
        </View>
      </View>

      {/* Upcoming Sessions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximas aulas</Text>
          <ArrowRight size={18} color={theme.colors.neutral[400]} />
        </View>

        {loadingSessions ? (
          <ActivityIndicator color={theme.colors.primary[500]} style={styles.loader} />
        ) : upcomingSessions?.length ? (
          <View style={styles.sessionsList}>
            {upcomingSessions.slice(0, 4).map((s: any, i: number) => {
              const color = s.classes?.color ?? theme.colors.primary[500];
              const loc = s.location || s.classes?.location;
              return (
                <View
                  key={s.id}
                  style={[
                    styles.sessionRow,
                    i < Math.min(upcomingSessions.length, 4) - 1 && styles.sessionRowBorder,
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
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Nenhuma aula agendada</Text>
          </View>
        )}
      </View>

      {/* Payments */}
      {pendingPayments && pendingPayments.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pagamentos</Text>
          </View>

          <View style={styles.paymentsList}>
            {pendingPayments.map((p: any) => (
              <View key={p.id} style={styles.paymentRow}>
                <View style={styles.paymentLeft}>
                  <AlertCircle
                    size={16}
                    color={p.status === 'overdue' ? theme.colors.error : theme.colors.warning}
                  />
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName} numberOfLines={1}>
                      {p.classes?.name ?? p.description ?? 'Pagamento'}
                    </Text>
                    <Text style={styles.paymentDue}>Vence {formatDate(p.due_date)}</Text>
                  </View>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                  <Badge variant={p.status === 'overdue' ? 'error' : 'warning'}>
                    {p.status === 'overdue' ? 'Atrasado' : 'Pendente'}
                  </Badge>
                </View>
              </View>
            ))}
          </View>
        </View>
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
  },
  streakText: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    color: theme.colors.primary[600],
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statNumber: {
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    color: theme.colors.neutral[900],
    letterSpacing: -0.5,
  },
  statLabel: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.colors.neutral[200],
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
  paymentsList: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontFamily: theme.fonts.caption,
    fontSize: 14,
    color: theme.colors.neutral[800],
  },
  paymentDue: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentAmount: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[900],
  },
  emptyBox: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
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
