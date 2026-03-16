import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { User, Mail, Lock, GraduationCap, Dumbbell } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components/ui';
import { theme } from '@/constants/theme';
import { strings } from '@/constants/strings';
import type { UserRole } from '@/types/database';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('teacher');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Nome é obrigatório';
    if (!email.trim()) errs.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'E-mail inválido';
    if (!password.trim()) errs.password = 'Senha é obrigatória';
    else if (password.length < 6) errs.password = 'Mínimo de 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp(email.trim(), password, fullName.trim(), role);
      Alert.alert(
        'Conta criada!',
        'Verifique seu e-mail para confirmar o cadastro.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSection}>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            Comece a gerenciar seus treinos agora
          </Text>
        </View>

        {/* Role Selector */}
        <View style={styles.roleSection}>
          <Text style={styles.roleTitle}>Eu sou</Text>
          <View style={styles.roleCards}>
            <Pressable
              onPress={() => setRole('teacher')}
              style={[
                styles.roleCard,
                role === 'teacher' && styles.roleCardActive,
              ]}
            >
              <View style={[
                styles.roleIconBg,
                role === 'teacher' && styles.roleIconBgActive,
              ]}>
                <Dumbbell
                  size={22}
                  color={role === 'teacher' ? theme.colors.primary[500] : theme.colors.neutral[400]}
                />
              </View>
              <Text style={[
                styles.roleCardLabel,
                role === 'teacher' && styles.roleCardLabelActive,
              ]}>
                {strings.onboarding.step2Teacher}
              </Text>
              <Text style={styles.roleCardDesc}>
                Gerencie turmas e alunos
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setRole('student')}
              style={[
                styles.roleCard,
                role === 'student' && styles.roleCardActive,
              ]}
            >
              <View style={[
                styles.roleIconBg,
                role === 'student' && styles.roleIconBgActive,
              ]}>
                <GraduationCap
                  size={22}
                  color={role === 'student' ? theme.colors.primary[500] : theme.colors.neutral[400]}
                />
              </View>
              <Text style={[
                styles.roleCardLabel,
                role === 'student' && styles.roleCardLabelActive,
              ]}>
                {strings.onboarding.step2Student}
              </Text>
              <Text style={styles.roleCardDesc}>
                Acompanhe suas aulas
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <Input
            label={strings.auth.fullName}
            placeholder="João Silva"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
            icon={<User size={18} color={theme.colors.neutral[400]} />}
          />

          <Input
            label={strings.auth.email}
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon={<Mail size={18} color={theme.colors.neutral[400]} />}
            containerStyle={{ marginTop: theme.spacing.md }}
          />

          <Input
            label={strings.auth.password}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={errors.password}
            icon={<Lock size={18} color={theme.colors.neutral[400]} />}
            containerStyle={{ marginTop: theme.spacing.md }}
          />

          <Button
            title={strings.auth.register}
            onPress={handleRegister}
            loading={loading}
            style={{ marginTop: theme.spacing.xl }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{strings.auth.hasAccount} </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>{strings.auth.login}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  topSection: {
    paddingTop: 48,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.fonts.heading,
    fontSize: 32,
    color: theme.colors.neutral[900],
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: theme.fonts.body,
    fontSize: 16,
    color: theme.colors.neutral[500],
    marginTop: theme.spacing.xs,
  },
  roleSection: {
    marginBottom: theme.spacing.xl,
  },
  roleTitle: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.md,
  },
  roleCards: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  roleCard: {
    flex: 1,
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.lg,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  roleCardActive: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  roleIconBg: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBgActive: {
    backgroundColor: theme.colors.primary[100],
  },
  roleCardLabel: {
    fontFamily: theme.fonts.subheading,
    fontSize: 15,
    color: theme.colors.neutral[600],
  },
  roleCardLabelActive: {
    color: theme.colors.primary[700],
  },
  roleCardDesc: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.neutral[400],
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  footerText: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  footerLink: {
    fontFamily: theme.fonts.subheading,
    fontSize: 14,
    color: theme.colors.primary[500],
  },
});
