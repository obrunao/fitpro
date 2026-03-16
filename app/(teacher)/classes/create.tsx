import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft } from 'lucide-react-native';
import { Button, Input } from '@/components/ui';
import { Screen } from '@/components/layout/Screen';
import { theme } from '@/constants/theme';
import { DAY_NAMES_SHORT } from '@/lib/utils';
import type { ClassType } from '@/types/database';

const MODALITIES = ['Musculação', 'Crossfit', 'Pilates', 'Yoga', 'Funcional', 'Natação', 'Dança', 'Outro'];
const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function CreateClassScreen() {
  const router = useRouter();
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

  const createMutation = useMutation({
    mutationFn: async () => {
      // Create class
      const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert({
          teacher_id: session!.user.id,
          name: name.trim(),
          description: description.trim() || null,
          modality: modality || null,
          type,
          max_students: parseInt(maxStudents) || 30,
          monthly_price: parseFloat(monthlyPrice) || null,
          price_per_class: parseFloat(pricePerClass) || null,
          color,
          location: location.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (classError) throw classError;

      // Create schedules
      if (scheduleDays.length > 0) {
        const schedules = scheduleDays.map((day) => ({
          class_id: newClass.id,
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

      return newClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
      Alert.alert('Sucesso', 'Turma criada com sucesso!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.message ?? 'Falha ao criar turma');
    },
  });

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome da turma é obrigatório');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={theme.colors.neutral[700]} />
          </Pressable>
          <Text style={styles.title}>Nova Turma</Text>
          <View style={{ width: 40 }} />
        </View>

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
          label="Local"
          placeholder="Academia, sala, parque..."
          value={location}
          onChangeText={setLocation}
          containerStyle={styles.field}
        />

        <Button
          title="Criar Turma"
          onPress={handleCreate}
          loading={createMutation.isPending}
          style={{ marginTop: theme.spacing.lg, marginBottom: theme.spacing.xxl }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
