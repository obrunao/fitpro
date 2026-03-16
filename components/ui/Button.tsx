import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Platform } from 'react-native';
import { theme } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const variantStyles: Record<Variant, { bg: string; bgPressed: string; text: string; border?: string }> = {
  primary: { bg: theme.colors.primary[500], bgPressed: theme.colors.primary[600], text: '#FFFFFF' },
  secondary: { bg: theme.colors.neutral[100], bgPressed: theme.colors.neutral[200], text: theme.colors.neutral[800] },
  outline: { bg: 'transparent', bgPressed: theme.colors.primary[50], text: theme.colors.primary[500], border: theme.colors.primary[500] },
  ghost: { bg: 'transparent', bgPressed: theme.colors.neutral[100], text: theme.colors.neutral[600] },
  danger: { bg: theme.colors.error, bgPressed: '#EF4444', text: '#FFFFFF' },
};

const sizeStyles: Record<Size, { height: number; px: number; fontSize: number }> = {
  sm: { height: 38, px: 14, fontSize: 13 },
  md: { height: 50, px: 22, fontSize: 15 },
  lg: { height: 58, px: 28, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? v.bgPressed : v.bg,
          height: s.height,
          paddingHorizontal: s.px,
          borderColor: v.border ?? 'transparent',
          borderWidth: v.border ? 1.5 : 0,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              { color: v.text, fontSize: s.fontSize } as TextStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    gap: 8,
  },
  text: {
    fontFamily: theme.fonts.subheading,
    letterSpacing: 0.2,
  },
});
