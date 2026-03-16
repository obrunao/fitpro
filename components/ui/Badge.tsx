import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

type Variant = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  children: string;
  variant?: Variant;
}

const variantColors: Record<Variant, { bg: string; text: string }> = {
  primary: { bg: theme.colors.primary[100], text: theme.colors.primary[700] },
  accent: { bg: '#EDE9FE', text: theme.colors.accent[600] },
  success: { bg: '#D1FAE5', text: '#065F46' },
  warning: { bg: '#FEF3C7', text: '#92400E' },
  error: { bg: '#FEE2E2', text: '#991B1B' },
  neutral: { bg: theme.colors.neutral[100], text: theme.colors.neutral[600] },
};

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  const colors = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  text: {
    fontFamily: theme.fonts.caption,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
