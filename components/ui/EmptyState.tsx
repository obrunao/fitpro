import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="sm"
          style={{ marginTop: theme.spacing.md }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },
  icon: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontFamily: theme.fonts.subheading,
    fontSize: 17,
    color: theme.colors.neutral[800],
    textAlign: 'center',
  },
  description: {
    fontFamily: theme.fonts.body,
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
});
