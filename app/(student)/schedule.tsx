import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, CheckCircle, MapPin, Users, Clock } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { useState, useMemo } from 'react';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function getWeekDates(offset: number): Date[] {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + offset * 7);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

function isToday(date: Date): boolean {
  const today = new Date();
  return formatDateKey(date) === formatDateKey(today);
}

function isTodayOrFuture(date: Date): boolean {
  const today = new Date();
  return formatDateKey(date) >= formatDateKey(today);
}

function getMonthLabel(dates: Date[]): string {
  const first = dates[0];
  const last = dates[6];
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  if (first.getMonth() === last.getMonth()) {
    return formatter.format(first);
  }
  const fmtShort = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  return `${fmtShort.format(first)} - ${fmtShort.format(last)} ${last.getFullYear()}`;
}

export default function StudentSchedule() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  const userId = session?.user?.id;
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const selectedDate = weekDates[selectedDay];

  const weekStart = formatDateKey(weekDates[0]);
  const weekEnd = formatDateKey(weekDates[6]);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['student-schedule', userId, weekStart, weekEnd],
    queryFn: async () => {
      const { data: enrollments, error: enrollErr } = await supabase
        .from('class_enrollments')
        .select('class_id')
        .eq('student_id', userId!)
        .eq('status', 'active');

      if (enrollErr) throw enrollErr;
      if (!enrollments?.length) return [];

      const classIds = enrollments.map((e: any) => e.class_id);

      const { data, error } = await supabase
        .from('class_sessions')
        .select('*, classes:class_id(name, color, location)')
        .in('class_id', classIds)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const sessionIds = sessions?.map((s: any) => s.id) ?? [];
  const { data: checkins } = useQuery({
    queryKey: ['student-week-checkins', userId, sessionIds],
    queryFn: async () => {
      if (!sessionIds.length) return [];
      const { data, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('student_id', userId!)
        .in('session_id', sessionIds);

      if (error) throw error;
      return data;
    },
    enabled: !!sessionIds.length,
  });

  const { data: allCheckins } = useQuery({
    queryKey: ['session-all-checkins', sessionIds],
    queryFn: async () => {
      if (!sessionIds.length) return [];
      const { data, error } = await supabase
        .from('checkins')
        .select('*, student:student_id(full_name)')
        .in('session_id', sessionIds);

      if (error) throw error;
      return data;
    },
    enabled: !!sessionIds.length,
  });

  const sessionConfirmedMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    allCheckins?.forEach((c: any) => {
      if (!map[c.session_id]) map[c.session_id] = [];
      const name = c.student?.full_name?.split(' ')[0] ?? 'Aluno';
      map[c.session_id].push(name);
    });
    return map;
  }, [allCheckins]);

  const checkinMap = useMemo(() => {
    const map: Record<string, string> = {};
    checkins?.forEach((c: any) => {
      map[c.session_id] = c.status;
    });
    return map;
  }, [checkins]);

  const checkinMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('checkins').insert({
        session_id: sessionId,
        student_id: userId!,
        status: 'confirmed',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-week-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['session-all-checkins'] });
    },
    onError: () => {
      if (Platform.OS !== 'web') {
        Alert.alert('Erro', 'Não foi possível confirmar presença.');
      }
    },
  });

  const uncheckMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('checkins')
        .delete()
        .eq('session_id', sessionId)
        .eq('student_id', userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-week-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['student-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['session-all-checkins'] });
    },
    onError: () => {
      if (Platform.OS !== 'web') {
        Alert.alert('Erro', 'Não foi possível cancelar presença.');
      }
    },
  });

  const sessionsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    sessions?.forEach((s: any) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  const selectedDateKey = formatDateKey(selectedDate);
  const daySessions = sessionsByDate[selectedDateKey] ?? [];

  const daySessionCounts = useMemo(() => {
    return weekDates.map((d) => (sessionsByDate[formatDateKey(d)]?.length ?? 0));
  }, [weekDates, sessionsByDate]);

  return (
    <Screen scroll={false} padding={false}>
      {/* Compact header with week navigation */}
      <View style={styles.topBar}>
        <Pressable onPress={() => setWeekOffset((o) => o - 1)} style={styles.navBtn}>
          <ChevronLeft size={18} color={theme.colors.neutral[600]} />
        </Pressable>
        <Text style={styles.monthLabel}>{getMonthLabel(weekDates)}</Text>
        <Pressable onPress={() => setWeekOffset((o) => o + 1)} style={styles.navBtn}>
          <ChevronRight size={18} color={theme.colors.neutral[600]} />
        </Pressable>
      </View>

      {/* Calendar Strip */}
      <View style={styles.calStrip}>
        {weekDates.map((date, idx) => {
          const selected = idx === selectedDay;
          const today = isToday(date);
          const hasEvents = daySessionCounts[idx] > 0;

          return (
            <Pressable
              key={idx}
              onPress={() => setSelectedDay(idx)}
              style={[styles.calDay, selected && styles.calDaySelected]}
            >
              <Text style={[styles.calDayLabel, selected && styles.calDayLabelSelected]}>
                {DAY_LABELS[idx]}
              </Text>
              <View style={[
                styles.calDayCircle,
                selected && styles.calDayCircleSelected,
                today && !selected && styles.calDayCircleToday,
              ]}>
                <Text style={[
                  styles.calDayNum,
                  selected && styles.calDayNumSelected,
                  today && !selected && styles.calDayNumToday,
                ]}>
                  {date.getDate()}
                </Text>
              </View>
              {hasEvents && (
                <View style={[styles.calDot, selected && styles.calDotSelected]} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Sessions List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={theme.colors.primary[500]}
            style={styles.loader}
          />
        ) : daySessions.length ? (
          daySessions.map((s: any) => {
            const isConfirmed = !!checkinMap[s.id];
            const color = s.classes?.color ?? theme.colors.primary[500];
            const loc = s.location || s.classes?.location;
            const confirmed = sessionConfirmedMap[s.id] ?? [];

            return (
              <View key={s.id} style={styles.card}>
                <View style={[styles.cardStripe, { backgroundColor: color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {s.classes?.name ?? 'Aula'}
                    </Text>
                    {isConfirmed && (
                      <View style={styles.confirmedBadge}>
                        <CheckCircle size={12} color="#15803D" />
                        <Text style={styles.confirmedBadgeText}>Confirmado</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardMeta}>
                    <Clock size={13} color={theme.colors.neutral[400]} />
                    <Text style={styles.cardMetaText}>
                      {formatTime(s.start_time)} - {formatTime(s.end_time)}
                    </Text>
                  </View>

                  {loc && (
                    <View style={styles.cardMeta}>
                      <MapPin size={13} color={theme.colors.neutral[400]} />
                      <Text style={styles.cardMetaText} numberOfLines={1}>{loc}</Text>
                    </View>
                  )}

                  {confirmed.length > 0 && (
                    <View style={styles.cardMeta}>
                      <Users size={13} color={theme.colors.primary[500]} />
                      <Text style={styles.cardConfirmedText}>
                        {confirmed.length} confirmado{confirmed.length > 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.cardConfirmedNames} numberOfLines={1}>
                        ({confirmed.join(', ')})
                      </Text>
                    </View>
                  )}

                  {isTodayOrFuture(selectedDate) && (
                    <View style={styles.cardActions}>
                      {!isConfirmed ? (
                        <Button
                          title="Confirmar Presença"
                          onPress={() => checkinMutation.mutate(s.id)}
                          size="sm"
                          loading={checkinMutation.isPending}
                          icon={<CheckCircle size={14} color="#FFFFFF" />}
                        />
                      ) : (
                        <Button
                          title="Cancelar Presença"
                          onPress={() => uncheckMutation.mutate(s.id)}
                          size="sm"
                          variant="ghost"
                          loading={uncheckMutation.isPending}
                        />
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayTitle}>Dia livre</Text>
            <Text style={styles.emptyDayText}>
              Nenhuma aula agendada para este dia
            </Text>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[0],
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: theme.fonts.subheading,
    fontSize: 16,
    color: theme.colors.neutral[800],
    textTransform: 'capitalize',
  },
  calStrip: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[0],
    paddingHorizontal: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  calDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    gap: 4,
  },
  calDaySelected: {},
  calDayLabel: {
    fontFamily: theme.fonts.caption,
    fontSize: 11,
    color: theme.colors.neutral[400],
  },
  calDayLabelSelected: {
    color: theme.colors.primary[500],
  },
  calDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircleSelected: {
    backgroundColor: theme.colors.primary[500],
  },
  calDayCircleToday: {
    backgroundColor: theme.colors.primary[50],
  },
  calDayNum: {
    fontFamily: theme.fonts.subheading,
    fontSize: 16,
    color: theme.colors.neutral[800],
  },
  calDayNumSelected: {
    color: '#FFFFFF',
  },
  calDayNumToday: {
    color: theme.colors.primary[600],
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.colors.primary[500],
  },
  calDotSelected: {
    backgroundColor: theme.colors.primary[300],
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
  },
  cardStripe: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: theme.spacing.md,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cardName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 16,
    color: theme.colors.neutral[800],
    flex: 1,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  confirmedBadgeText: {
    fontFamily: theme.fonts.caption,
    fontSize: 11,
    color: '#15803D',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    flex: 1,
  },
  cardConfirmedText: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.primary[600],
  },
  cardConfirmedNames: {
    fontFamily: theme.fonts.body,
    fontSize: 11,
    color: theme.colors.neutral[400],
    flex: 1,
  },
  cardActions: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
  },
  emptyDay: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyDayTitle: {
    fontFamily: theme.fonts.subheading,
    fontSize: 17,
    color: theme.colors.neutral[400],
  },
  emptyDayText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[300],
    marginTop: theme.spacing.xs,
  },
  loader: {
    paddingVertical: theme.spacing.xxl,
  },
});
