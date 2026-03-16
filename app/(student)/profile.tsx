import {
  View,
  Text,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, Phone, Target, BookOpen } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Card, Button, Avatar, Input, Badge } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { theme } from '@/constants/theme';
import { useState, useEffect } from 'react';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function StudentProfile() {
  const { profile, session, signOut, updateProfile } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  useEffect(() => {
    if (profile) {
      setPhone(profile.phone ?? '');
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  const userId = session?.user?.id;

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['student-profile-enrollments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_enrollments')
        .select('*, classes:class_id(name, monthly_price, price_per_class, type)')
        .eq('student_id', userId!)
        .eq('status', 'active');

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await updateProfile({
        phone: phone || null,
        bio: bio || null,
      });
    },
    onSuccess: () => {
      setEditing(false);
      Alert.alert('Perfil atualizado', 'Suas informações foram salvas com sucesso.');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    },
  });

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      signOut();
    } else {
      Alert.alert(
        'Sair da conta',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: signOut },
        ]
      );
    }
  };

  if (!profile) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Cover Header */}
      <View style={styles.coverHeader}>
        <View style={styles.coverBg} />
        <View style={styles.avatarRow}>
          <Avatar
            uri={profile.avatar_url}
            name={profile.full_name}
            size={80}
          />
          <View style={styles.nameArea}>
            <Text style={styles.profileName}>{profile.full_name}</Text>
            <Text style={styles.profileEmail}>{session?.user?.email}</Text>
          </View>
        </View>
      </View>

      {/* Personal Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Informações</Text>
          {!editing && (
            <Button
              title="Editar"
              onPress={() => setEditing(true)}
              variant="ghost"
              size="sm"
            />
          )}
        </View>

        <View style={styles.infoCard}>
          {editing ? (
            <View style={styles.form}>
              <Input
                label="Telefone"
                value={phone}
                onChangeText={setPhone}
                placeholder="(11) 99999-9999"
                keyboardType="phone-pad"
                icon={<Phone size={18} color={theme.colors.neutral[400]} />}
              />
              <Input
                label="Bio / Objetivos"
                value={bio}
                onChangeText={setBio}
                placeholder="Seus objetivos de treino..."
                multiline
                numberOfLines={3}
                style={styles.textArea}
                icon={<Target size={18} color={theme.colors.neutral[400]} />}
                containerStyle={styles.inputSpacing}
              />
              <View style={styles.formActions}>
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setEditing(false);
                    setPhone(profile.phone ?? '');
                    setBio(profile.bio ?? '');
                  }}
                  variant="ghost"
                  size="sm"
                  style={styles.cancelBtn}
                />
                <Button
                  title="Salvar"
                  onPress={() => saveMutation.mutate()}
                  variant="primary"
                  size="sm"
                  loading={saveMutation.isPending}
                  style={styles.saveBtn}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Phone size={16} color={theme.colors.neutral[400]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Telefone</Text>
                  <Text style={styles.infoValue}>
                    {profile.phone ?? 'Não informado'}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Target size={16} color={theme.colors.neutral[400]} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bio / Objetivos</Text>
                  <Text style={styles.infoValue} numberOfLines={3}>
                    {profile.bio ?? 'Não informado'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* My Plan */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meu Plano</Text>

        {loadingEnrollments ? (
          <ActivityIndicator
            color={theme.colors.primary[500]}
            style={styles.loader}
          />
        ) : enrollments?.length ? (
          <View style={styles.planList}>
            {enrollments.map((e: any) => {
              const cls = e.classes;
              return (
                <View key={e.id} style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <BookOpen size={16} color={theme.colors.primary[500]} />
                    <Text style={styles.planName} numberOfLines={1}>
                      {cls?.name ?? 'Aula'}
                    </Text>
                    <Badge
                      variant={cls?.type === 'personal' ? 'accent' : 'primary'}
                    >
                      {cls?.type === 'personal' ? 'Personal' : 'Grupo'}
                    </Badge>
                  </View>
                  <View style={styles.planDetails}>
                    {cls?.monthly_price ? (
                      <Text style={styles.planPrice}>
                        {formatCurrency(cls.monthly_price)}/mês
                      </Text>
                    ) : cls?.price_per_class ? (
                      <Text style={styles.planPrice}>
                        {formatCurrency(cls.price_per_class)}/aula
                      </Text>
                    ) : null}
                    <Text style={styles.planSince}>
                      Desde {formatDate(e.enrolled_at)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyPlan}>
            <Text style={styles.emptyPlanText}>
              Nenhuma matrícula ativa
            </Text>
          </View>
        )}
      </View>

      {/* Sign Out */}
      <View style={styles.signOutSection}>
        <Button
          title="Sair da Conta"
          onPress={handleSignOut}
          variant="danger"
          icon={<LogOut size={18} color="#FFFFFF" />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  coverHeader: {
    marginBottom: theme.spacing.lg,
  },
  coverBg: {
    height: 80,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.radius.lg,
    marginBottom: -40,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.md,
  },
  nameArea: {
    flex: 1,
    paddingBottom: theme.spacing.xs,
  },
  profileName: {
    fontFamily: theme.fonts.heading,
    fontSize: 22,
    color: theme.colors.neutral[900],
  },
  profileEmail: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.fonts.subheading,
    fontSize: 17,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing.sm,
  },
  infoCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.lg,
  },
  form: {
    gap: theme.spacing.xs,
  },
  inputSpacing: {
    marginTop: theme.spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  cancelBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.neutral[400],
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.neutral[800],
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[100],
    marginVertical: theme.spacing.xs,
  },
  planList: {
    gap: theme.spacing.sm,
  },
  planCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  planName: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[800],
    flex: 1,
  },
  planDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planPrice: {
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    color: theme.colors.primary[600],
  },
  planSince: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[400],
  },
  emptyPlan: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  emptyPlanText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
  signOutSection: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    paddingVertical: theme.spacing.lg,
  },
});
