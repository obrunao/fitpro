import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Mail, Lock, Dumbbell, Zap } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components/ui';
import { theme } from '@/constants/theme';
import { strings } from '@/constants/strings';

export default function LoginScreen() {
  const { signIn, signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = 'E-mail é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'E-mail inválido';
    if (!password.trim()) errs.password = 'Senha é obrigatória';
    else if (password.length < 6) errs.password = 'Mínimo de 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha ao entrar');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Informe um e-mail válido' });
      return;
    }
    setLoading(true);
    try {
      await signInWithMagicLink(email.trim());
      Alert.alert('Sucesso', strings.auth.magicLinkSent);
    } catch (err: any) {
      Alert.alert('Erro', err.message ?? 'Falha ao enviar link');
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
        {/* Brand Area */}
        <View style={styles.brandArea}>
          <View style={styles.logoRow}>
            <View style={styles.logoBg}>
              <Dumbbell size={28} color={theme.colors.primary[500]} />
            </View>
            <Text style={styles.brandName}>FitPro</Text>
          </View>
          <Text style={styles.tagline}>
            Sua plataforma para{'\n'}gestão de treinos
          </Text>
          <View style={styles.featurePills}>
            <View style={styles.pill}>
              <Zap size={12} color={theme.colors.primary[600]} />
              <Text style={styles.pillText}>Turmas</Text>
            </View>
            <View style={styles.pill}>
              <Zap size={12} color={theme.colors.primary[600]} />
              <Text style={styles.pillText}>Agenda</Text>
            </View>
            <View style={styles.pill}>
              <Zap size={12} color={theme.colors.primary[600]} />
              <Text style={styles.pillText}>Pagamentos</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Entrar</Text>

          <Input
            label={strings.auth.email}
            placeholder="seu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            icon={<Mail size={18} color={theme.colors.neutral[400]} />}
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
            title={strings.auth.login}
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: theme.spacing.xl }}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title={strings.auth.magicLink}
            onPress={handleMagicLink}
            variant="outline"
            loading={loading}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{strings.auth.noAccount} </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>{strings.auth.register}</Text>
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
  brandArea: {
    paddingTop: 60,
    paddingBottom: theme.spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing.lg,
  },
  logoBg: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: theme.fonts.heading,
    fontSize: 36,
    color: theme.colors.neutral[900],
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: theme.fonts.body,
    fontSize: 20,
    color: theme.colors.neutral[500],
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  featurePills: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
  },
  pillText: {
    fontFamily: theme.fonts.caption,
    fontSize: 12,
    color: theme.colors.primary[700],
  },
  formCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.xl,
  },
  formTitle: {
    fontFamily: theme.fonts.heading,
    fontSize: 22,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.lg,
    letterSpacing: -0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.neutral[200],
  },
  dividerText: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    color: theme.colors.neutral[400],
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
