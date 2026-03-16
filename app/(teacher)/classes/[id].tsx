import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components/ui';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { DAY_NAMES_SHORT } from '@/lib/utils';
import type { ClassType } from '@/types/database';

const MODALITIES = ['Musculação', 'Crossfit', 'Pilates', 'Yoga', 'Funcional', 'Natação', 'Dança', 'Outro'];
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function EditClassScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modality, setModality] = useState('');
  const [type, setType] = useState<ClassType>('group');
  const [maxStudents, setMaxStudents] = useState('30');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [pricePerClass, setPricePerClass] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:00');
  const [location, setLocation] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Fetch class data
  const { data: classData, isLoading } = useQuery({
    queryKey: ['teacher-class-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, class_schedules(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Populate form when data loads
  useEffect(() => {
    if (classData) {
      setName(classData.name ?? '');
      setDescription(classData.description ?? '');
      setModality(classData.modality ?? '');
      setType(classData.type ?? 'group');
      setMaxStudents(String(classData.max_students ?? 30));
      setMonthlyPrice(classData.monthly_price ? String(classData.monthly_price) : '');
      setPricePerClass(classData.price_per_class ? String(classData.price_per_class) : '');
      setColor(classData.color ?? COLORS[0]);
      setLocation(classData.location ?? '');
      setIsActive(classData.is_active ?? true);

      const schedules = classData.class_schedules ?? [];
      if (schedules.length > 0) {
        setScheduleDays(schedules.map((s: any) => s.day_of_week));
        setStartTime(schedules[0].start_time?.slice(0, 5) ?? '08:00');
        setEndTime(schedules[0].end_time?.slice(0, 5) ?? '09:00');
      }
    }
  }, [classData]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Update class
      const { error: classError } = await supabase
        .from('classes')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          modality: modality || null,
          type,
          max_students: parseInt(maxStudents) || 30,
          monthly_price: parseFloat(monthlyPrice) || null,
          price_per_class: parseFloat(pricePerClass) || null,
          color,
          location: location.trim() || null,
          is_active: isActive,
        })
        .eq('id', id!);

      if (classError) throw classError;

      // Delete old schedules and insert new ones
      const { error: delError } = await supabase
        .from('class_schedules')
        .delete()
        .eq('class_id', id!);

      if (delError) throw delError;

      if (scheduleDays.length > 0) {
        const schedules = scheduleDays.map((day) => ({
          class_id: id!,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          location: location.trim() || null,
        }));

        const { error: schedError } = await supabase
          .from('class_schedules')
          .insert(schedules);

        if (schedError) throw schedError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      queryClient.invalidateQueries({ queryKey: ['teacher-class-detail', id] });
      Alert.alert('Sucesso', 'Turma atualizada com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.message ?? 'Falha ao atualizar turma');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Delete schedules first
      await supabase.from('class_schedules').delete().eq('class_id', id!);
      // Delete class
      const { error } = await supabase.from('classes').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      Alert.alert('Turma excluída', 'A turma foi removida com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.message ?? 'Falha ao excluir turma. Verifique se não há alunos matriculados.');
    },
  });

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome da turma é obrigatório');
      return;
    }
    updateMutation.mutate();
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.')) {
        deleteMutation.mutate();
      }
    } else {
      Alert.alert(
        'Excluir turma',
        'Tem certeza que deseja excluir esta turma? Esta ação não pode ser desfeita.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate() },
        ]
      );
    }
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
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={theme.colors.neutral[700]} />
          </Pressable>
          <Text style={styles.title}>Editar Turma</Text>
          <Pressable onPress={handleDelete} style={styles.deleteBtn}>
            <Trash2 size={20} color={theme.colors.error} />
          </Pressable>
        </View>

        {/* Active Toggle */}
        <Pressable
          style={[styles.statusToggle, !isActive && styles.statusToggleInactive]}
          onPress={() => setIsActive(!isActive)}
        >
          <View style={[styles.statusDot, { backgroundColor: isActive ? theme.colors.success : theme.colors.neutral[400] }]} />
          <Text style={styles.statusText}>
            {isActive ? 'Turma ativa' : 'Turma inativa'}
          </Text>
          <Text style={styles.statusHint}>Toque para alterar</Text>
        </Pressable>

        <Input
          label="Nome da turma *"
          placeholder="Ex: Turma A - Musculação"
          value={name}
          onChangeText={setName}
          containerStyle={styles.field}
        />

        <Input
          label="Descrição"
          placeholder="Detalhes sobre a turma..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          containerStyle={styles.field}
        />

        <Text style={styles.label}>Modalidade</Text>
        <View style={styles.chipRow}>
          {MODALITIES.map((m) => (
            <Pressable
              key={m}
              onPress={() => setModality(modality === m ? '' : m)}
              style={[styles.chip, modality === m && styles.chipActive]}
            >
              <Text style={[styles.chipText, modality === m && styles.chipTextActive]}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Tipo</Text>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setType('group')}
            style={[styles.typeBtn, type === 'group' && styles.typeBtnActive]}
          >
            <Text style={[styles.typeText, type === 'group' && styles.typeTextActive]}>
              Grupo
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType('personal')}
            style={[styles.typeBtn, type === 'personal' && styles.typeBtnActive]}
          >
            <Text style={[styles.typeText, type === 'personal' && styles.typeTextActive]}>
              Personal
            </Text>
          </Pressable>
        </View>

        {type === 'group' && (
          <Input
            label="Máximo de alunos"
            placeholder="30"
            value={maxStudents}
            onChangeText={setMaxStudents}
            keyboardType="numeric"
            containerStyle={styles.field}
          />
        )}

        <View style={styles.priceRow}>
          <Input
            label="Mensalidade (R$)"
            placeholder="150.00"
            value={monthlyPrice}
            onChangeText={setMonthlyPrice}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
          />
          <Input
            label="Preço/aula (R$)"
            placeholder="50.00"
            value={pricePerClass}
            onChangeText={setPricePerClass}
            keyboardType="decimal-pad"
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Text style={styles.label}>Cor</Text>
        <View style={styles.colorRow}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
            />
          ))}
        </View>

        <Text style={styles.label}>Dias da semana</Text>
        <View style={styles.daysRow}>
          {DAY_NAMES_SHORT.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => toggleDay(i)}
              style={[styles.dayBtn, scheduleDays.includes(i) && styles.dayBtnActive]}
            >
              <Text style={[styles.dayText, scheduleDays.includes(i) && styles.dayTextActive]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.timeRow}>
          <Input
            label="Início"
            placeholder="08:00"
            value={startTime}
            onChangeText={setStartTime}
            containerStyle={{ flex: 1 }}
          />
          <Input
            label="Fim"
            placeholder="09:00"
            value={endTime}
            onChangeText={setEndTime}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Input
          label="Local / Endereço"
          placeholder="Academia, parque, estúdio..."
          value={location}
          onChangeText={setLocation}
          containerStyle={styles.field}
        />

        <Button
          title="Salvar Alterações"
          onPress={handleSave}
          loading={updateMutation.isPending}
          style={{ marginTop: theme.spacing.xl }}
        />

        <Button
          title="Excluir Turma"
          onPress={handleDelete}
          variant="danger"
          loading={deleteMutation.isPending}
          icon={<Trash2 size={16} color="#FFFFFF" />}
          style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xxl }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: 22,
    color: theme.colors.neutral[900],
    letterSpacing: -0.3,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: theme.radius.md,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  statusToggleInactive: {
    backgroundColor: theme.colors.neutral[100],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.neutral[800],
    flex: 1,
  },
  statusHint: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  field: { marginTop: theme.spacing.md },
  label: {
    fontFamily: theme.fonts.caption,
    fontSize: 14,
    color: theme.colors.neutral[600],
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.neutral[100],
  },
  chipActive: { backgroundColor: theme.colors.primary[100] },
  chipText: {
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    color: theme.colors.neutral[600],
  },
  chipTextActive: { color: theme.colors.primary[700] },
  typeRow: { flexDirection: 'row', gap: theme.spacing.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  typeText: {
    fontFamily: theme.fonts.caption,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  typeTextActive: { color: theme.colors.primary[700] },
  priceRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  colorRow: { flexDirection: 'row', gap: theme.spacing.sm },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: theme.colors.neutral[800],
  },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
  },
  dayBtnActive: { backgroundColor: theme.colors.primary[500] },
  dayText: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.neutral[600],
  },
  dayTextActive: { color: '#FFF' },
  timeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
});
