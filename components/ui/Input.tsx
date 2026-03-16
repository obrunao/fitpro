import { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { theme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  icon,
  containerStyle,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? { paddingLeft: 0 } : null]}
          placeholderTextColor={theme.colors.neutral[400]}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: theme.fonts.caption,
    fontSize: 13,
    color: theme.colors.neutral[600],
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.neutral[200],
    paddingHorizontal: theme.spacing.md,
    height: 52,
  },
  inputFocused: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.neutral[0],
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  icon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.body,
    fontSize: 15,
    color: theme.colors.neutral[900],
    paddingVertical: 0,
  },
  error: {
    fontFamily: theme.fonts.body,
    fontSize: 12,
    color: theme.colors.error,
    marginTop: 4,
  },
});
