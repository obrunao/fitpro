import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, X, MapPin, Clock, Users, CheckCircle } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6);

function getWeekDates(referenceDate: Date): Date[] {
  const day = referenceDate.getDay();
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function timeToHour(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

interface SessionWithClass {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  location: string | null;
  notes: string | null;
  classes: {
    name: string;
    color: string;
    location: string | null;
  } | null;
}

export default function ScheduleScreen() {
  const { profile } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSession, setSelectedSession] = useState<SessionWithClass | null>(null);

  const referenceDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(referenceDate), [referenceDate]);

  const startDate = formatDateISO(weekDates[0]);
  const endDate = formatDateISO(weekDates[6]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teacher-week-sessions', profile?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_sessions')
        .select('id, date, start_time, end_time, status, location, notes, classes(name, color, location)')
        .eq('classes.teacher_id', profile!.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('start_time');
      if (error) throw error;
      return (data ?? []) as unknown as SessionWithClass[];
    },
    enabled: !!profile?.id,
  });

  const { data: sessionCheckins } = useQuery({
    queryKey: ['session-checkins', selectedSession?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checkins')
        .select('*, student:student_id(full_name)')
        .eq('session_id', selectedSession!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSession?.id,
  });

  const sessionsByDate = useMemo(() => {
    const map: Record<string, SessionWithClass[]> = {};
    for (const s of sessions) {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    }
    return map;
  }, [sessions]);

  const today = formatDateISO(new Date());

  const monthLabel = useMemo(() => {
    const mid = weekDates[3];
    return mid.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [weekDates]);

  return (
    <Screen scroll={false} padding={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekOffset((o) => o - 1)}
            style={styles.navButton}
          >
            <ChevronLeft size={18} color={theme.colors.neutral[600]} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable
            onPress={() => setWeekOffset((o) => o + 1)}
            style={styles.navButton}
          >
            <ChevronRight size={18} color={theme.colors.neutral[600]} />
          </Pressable>
        </View>

        <View style={styles.dayHeaders}>
          {weekDates.map((date, i) => {
            const dateStr = formatDateISO(date);
            const isToday = dateStr === today;
            return (
              <View key={i} style={styles.dayHeaderCell}>
                <Text
                  style={[
                    styles.dayLabel,
                    isToday && styles.dayLabelToday,
                  ]}
                >
                  {DAY_LABELS[i]}
                </Text>
                <View
                  style={[
                    styles.dayNumber,
                    isToday && styles.dayNumberToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      isToday && styles.dayNumberTextToday,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          style={styles.gridScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            <View style={styles.hourColumn}>
              {HOURS.map((h) => (
                <View key={h} style={styles.hourCell}>
                  <Text style={styles.hourText}>{String(h).padStart(2, '0')}:00</Text>
                </View>
              ))}
            </View>

            {weekDates.map((date, dayIndex) => {
              const dateStr = formatDateISO(date);
              const daySessions = sessionsByDate[dateStr] ?? [];

              return (
                <View key={dayIndex} style={styles.dayColumn}>
                  {HOURS.map((h) => (
                    <View key={h} style={styles.gridCell} />
                  ))}
                  {daySessions.map((session) => {
                    const startH = timeToHour(session.start_time);
                    const endH = timeToHour(session.end_time);
                    const top = (startH - 6) * 60;
                    const height = Math.max((endH - startH) * 60, 24);
                    const color = session.classes?.color ?? theme.colors.primary[500];

                    return (
                      <Pressable
                        key={session.id}
                        style={[
                          styles.sessionBlock,
                          {
                            top,
                            height,
                            backgroundColor: color + '20',
                            borderLeftColor: color,
                          },
                        ]}
                        onPress={() => setSelectedSession(session)}
                      >
                        <Text
                          style={[styles.sessionBlockText, { color }]}
                          numberOfLines={2}
                        >
                          {session.classes?.name ?? 'Aula'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Session detail modal */}
      <Modal
        visible={!!selectedSession}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSession(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedSession(null)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes da aula</Text>
              <Pressable onPress={() => setSelectedSession(null)}>
                <X size={20} color={theme.colors.neutral[500]} />
              </Pressable>
            </View>

            {selectedSession && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <View
                    style={[
                      styles.modalColorDot,
                      {
                        backgroundColor:
                          selectedSession.classes?.color ??
                          theme.colors.primary[500],
                      },
                    ]}
                  />
                  <Text style={styles.modalClassName}>
                    {selectedSession.classes?.name ?? 'Aula'}
                  </Text>
                </View>

                <View style={styles.modalInfoRow}>
                  <Clock size={16} color={theme.colors.neutral[400]} />
                  <Text style={styles.modalInfoText}>
                    {selectedSession.start_time.slice(0, 5)} -{' '}
                    {selectedSession.end_time.slice(0, 5)}
                  </Text>
                </View>

                {(selectedSession.location || selectedSession.classes?.location) && (
                  <View style={styles.modalInfoRow}>
                    <MapPin size={16} color={theme.colors.neutral[400]} />
                    <Text style={styles.modalInfoText}>
                      {selectedSession.location || selectedSession.classes?.location}
                    </Text>
                  </View>
                )}

                <View style={styles.modalInfoRow}>
                  <Users size={16} color={theme.colors.neutral[400]} />
                  <Text style={styles.modalInfoText}>
                    {sessionCheckins?.length ?? 0} aluno{(sessionCheckins?.length ?? 0) !== 1 ? 's' : ''} confirmado{(sessionCheckins?.length ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>

                {sessionCheckins && sessionCheckins.length > 0 && (
                  <View style={styles.checkinList}>
                    {sessionCheckins.map((c: any) => (
                      <View key={c.id} style={styles.checkinItem}>
                        <CheckCircle size={14} color={theme.colors.primary[500]} />
                        <Text style={styles.checkinName}>
                          {c.student?.full_name ?? 'Aluno'}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {selectedSession.notes && (
                  <View style={styles.modalNotes}>
                    <Text style={styles.modalNotesLabel}>Observações</Text>
                    <Text style={styles.modalNotesText}>
                      {selectedSession.notes}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  navButton: {
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
  dayHeaders: {
    flexDirection: 'row',
    paddingLeft: 48,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    fontFamily: theme.fonts.caption,
    fontSize: 11,
    color: theme.colors.neutral[400],
  },
  dayLabelToday: {
    color: theme.colors.primary[500],
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberToday: {
    backgroundColor: theme.colors.primary[500],
  },
  dayNumberText: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.neutral[700],
  },
  dayNumberTextToday: {
    color: theme.colors.neutral[0],
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridScroll: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  grid: {
    flexDirection: 'row',
    minHeight: HOURS.length * 60,
  },
  hourColumn: {
    width: 48,
  },
  hourCell: {
    height: 60,
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingRight: theme.spacing.xs,
    alignItems: 'flex-end',
  },
  hourText: {
    fontFamily: theme.fonts.caption,
    fontSize: 10,
    color: theme.colors.neutral[400],
  },
  dayColumn: {
    flex: 1,
    borderLeftWidth: 0.5,
    borderLeftColor: theme.colors.neutral[200],
    position: 'relative',
  },
  gridCell: {
    height: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.neutral[200],
  },
  sessionBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    borderLeftWidth: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  sessionBlockText: {
    fontFamily: theme.fonts.caption,
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.xl,
    width: '100%',
    maxWidth: 360,
    padding: theme.spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    color: theme.colors.neutral[800],
  },
  modalBody: {
    gap: theme.spacing.md,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  modalClassName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 17,
    color: theme.colors.neutral[800],
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  modalInfoText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[600],
  },
  checkinList: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  checkinItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkinName: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[700],
  },
  modalNotes: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  modalNotesLabel: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.neutral[400],
    marginBottom: theme.spacing.xs,
  },
  modalNotesText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[600],
  },
});
