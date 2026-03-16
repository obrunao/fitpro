import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Dumbbell, GraduationCap, ChevronRight, User } from 'lucide-react-native';
import { Screen } from '@/components/layout/Screen';
import { Button, Input } from '@/components/ui';
import { theme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/database';

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile, session } = useAuth();
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole | null>(null);
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!role) return;
    setLoading(true);
    try {
      await updateProfile({
        role,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        full_name: session?.user?.user_metadata?.full_name ?? 'Usuário',
      });
      if (role === 'teacher') {
        router.replace('/(teacher)/dashboard');
      } else {
        router.replace('/(student)/dashboard');
      }
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha ao salvar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        {step === 0 && (
          <View style={styles.content}>
            <View style={styles.iconLarge}>
              <Dumbbell size={56} color={theme.colors.primary[500]} />
            </View>
            <Text style={styles.title}>{strings.onboarding.step1Title}</Text>
            <Text style={styles.subtitle}>{strings.onboarding.step1Subtitle}</Text>
            <Button
              title={strings.common.next}
              onPress={() => setStep(1)}
              style={styles.nextBtn}
              icon={<ChevronRight size={20} color="#FFF" />}
            />
          </View>
        )}

        {step === 1 && (
          <View style={styles.content}>
            <Text style={styles.title}>{strings.onboarding.step2Title}</Text>
            <View style={styles.roles}>
              <Pressable
                onPress={() => setRole('teacher')}
                style={[styles.roleCard, role === 'teacher' && styles.roleCardActive]}
              >
                <GraduationCap
                  size={36}
                  color={role === 'teacher' ? theme.colors.primary[500] : theme.colors.neutral[400]}
                />
                <Text style={[styles.roleLabel, role === 'teacher' && styles.roleLabelActive]}>
                  {strings.onboarding.step2Teacher}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRole('student')}
                style={[styles.roleCard, role === 'student' && styles.roleCardActive]}
              >
                <User
                  size={36}
                  color={role === 'student' ? theme.colors.primary[500] : theme.colors.neutral[400]}
                />
                <Text style={[styles.roleLabel, role === 'student' && styles.roleLabelActive]}>
                  {strings.onboarding.step2Student}
                </Text>
              </Pressable>
            </View>
            <Button
              title={strings.common.next}
              onPress={() => role && setStep(2)}
              disabled={!role}
              style={styles.nextBtn}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.content}>
            <Text style={styles.title}>
              {role === 'teacher'
                ? strings.onboarding.step3TeacherTitle
                : strings.onboarding.step3StudentTitle}
            </Text>
            <Input
              label="Telefone (opcional)"
              placeholder="(11) 99999-9999"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              containerStyle={{ marginTop: theme.spacing.lg }}
            />
            <Input
              label={role === 'teacher' ? 'Sobre você / especialidades' : 'Seus objetivos'}
              placeholder={
                role === 'teacher'
                  ? 'Personal trainer, especialista em...'
                  : 'Quero emagrecer, ganhar massa...'
              }
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              containerStyle={{ marginTop: theme.spacing.md }}
            />
            <Button
              title={strings.common.done}
              onPress={handleFinish}
              loading={loading}
              style={styles.nextBtn}
            />
          </View>
        )}

        {step > 0 && (
          <Pressable onPress={() => setStep(step - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>{strings.common.back}</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xxl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: theme.spacing.xxl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.neutral[200],
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.primary[500],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconLarge: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: 26,
    color: theme.colors.neutral[900],
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 24,
  },
  roles: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  roleCard: {
    flex: 1,
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[0],
    gap: theme.spacing.sm,
  },
  roleCardActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  roleLabel: {
    fontFamily: theme.fonts.subheading,
    fontSize: 16,
    color: theme.colors.neutral[500],
  },
  roleLabelActive: {
    color: theme.colors.primary[700],
  },
  nextBtn: {
    marginTop: theme.spacing.xl,
  },
  backBtn: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.md,
  },
  backText: {
    fontFamily: theme.fonts.caption,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
});
