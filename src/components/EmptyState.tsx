import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import Button from './Button';

type Props = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function EmptyState({ title, subtitle, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      {/* Illustrated badge */}
      <View style={styles.badge}>
        <Text style={styles.badgeEmoji}>🍺</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          style={styles.btn}
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
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryLight,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  badgeEmoji: {
    fontSize: 44,
  },
  title: {
    ...Typography.titleLg,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.textDim,
    textAlign: 'center',
    maxWidth: 260,
  },
  btn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
});
