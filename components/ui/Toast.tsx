import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  style?: ViewStyle;
}

const typeColors: Record<ToastType, string> = {
  success: theme.colors.success,
  error: theme.colors.error,
  info: theme.colors.info,
  warning: theme.colors.warning,
};

export function Toast({
  message,
  type = 'success',
  visible,
  onHide,
  duration = 3000,
  style,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: typeColors[type], opacity, transform: [{ translateY }] },
        style,
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    zIndex: 999,
  },
  text: {
    fontFamily: theme.fonts.caption,
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
