import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Filter, CheckCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Screen } from '@/components/layout/Screen';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Payment, Profile } from '@/types/database';

type StatusFilter = 'all' | 'pending' | 'overdue' | 'paid';

interface PaymentWithStudent extends Payment {
  profiles: Pick<Profile, 'full_name'>;
}

export default function PaymentsScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>('all');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['teacher-payments', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, profiles!payments_student_id_fkey(full_name)')
        .eq('teacher_id', session!.user.id)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data as PaymentWithStudent[];
    },
    enabled: !!session,
  });

  const markPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', paymentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-payments'] });
    },
  });

  const filtered = payments.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' }> = {
      paid: { label: 'Pago', variant: 'success' },
      pending: { label: 'Pendente', variant: 'warning' },
      overdue: { label: 'Atrasado', variant: 'error' },
      cancelled: { label: 'Cancelado', variant: 'neutral' },
    };
    const s = map[status] ?? map.pending;
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const handleMarkPaid = (paymentId: string, studentName: string) => {
    Alert.alert(
      'Confirmar pagamento',
      `Marcar pagamento de ${studentName} como pago?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => markPaidMutation.mutate(paymentId) },
      ]
    );
  };

  const totalPending = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const renderPayment = ({ item }: { item: PaymentWithStudent }) => (
    <Card style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.studentName}>{item.profiles?.full_name}</Text>
          <Text style={styles.paymentDesc}>{item.description ?? 'Mensalidade'}</Text>
        </View>
        {statusBadge(item.status)}
      </View>
      <View style={styles.paymentDetails}>
        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
        <Text style={styles.dueDate}>Vencimento: {formatDate(item.due_date)}</Text>
      </View>
      {(item.status === 'pending' || item.status === 'overdue') && (
        <Pressable
          onPress={() => handleMarkPaid(item.id, item.profiles?.full_name ?? '')}
          style={styles.markPaidBtn}
        >
          <CheckCircle size={16} color={theme.colors.success} />
          <Text style={styles.markPaidText}>Marcar como pago</Text>
        </Pressable>
      )}
    </Card>
  );

  return (
    <Screen scroll={false} padding={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Financeiro</Text>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>A receber</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>
              {formatCurrency(totalPending)}
            </Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Recebido</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>
              {formatCurrency(totalPaid)}
            </Text>
          </Card>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'pending', 'overdue', 'paid'] as StatusFilter[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendente' : f === 'overdue' ? 'Atrasado' : 'Pago'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={theme.colors.primary[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderPayment}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon={<DollarSign size={40} color={theme.colors.neutral[300]} />}
              title="Nenhum pagamento"
              description="Pagamentos aparecerão aqui quando alunos forem cobrados."
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    color: theme.colors.neutral[900],
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  summaryLabel: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  summaryValue: {
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral[100],
  },
  filterBtnActive: { backgroundColor: theme.colors.primary[100] },
  filterText: {
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  filterTextActive: { color: theme.colors.primary[700] },
  list: { padding: theme.spacing.md, gap: theme.spacing.sm, flexGrow: 1 },
  paymentCard: { padding: theme.spacing.md },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 16,
    color: theme.colors.neutral[800],
  },
  paymentDesc: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  paymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  amount: {
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    color: theme.colors.neutral[900],
  },
  dueDate: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  markPaidText: {
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    color: theme.colors.success,
  },
});
