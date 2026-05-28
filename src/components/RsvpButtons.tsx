import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../constants/theme';
import { RsvpStatus } from '../types/database';

const OPTIONS: { status: RsvpStatus; label: string; emoji: string }[] = [
  { status: 'yes',   label: 'In',    emoji: '✓' },
  { status: 'maybe', label: 'Maybe', emoji: '?' },
  { status: 'no',    label: 'Out',   emoji: '✕' },
];

type Props = {
  current: RsvpStatus | null;
  onSelect: (status: RsvpStatus) => void;
  disabled?: boolean;
};

export default function RsvpButtons({ current, onSelect, disabled }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map(({ status, label, emoji }) => {
        const active = current === status;
        return (
          <Pressable
            key={status}
            onPress={() => !disabled && onSelect(status)}
            style={({ pressed }) => [
              styles.btn,
              active && styles[`active_${status}` as keyof typeof styles],
              pressed && !disabled && styles.pressed,
            ]}
          >
            <Text style={[styles.emoji, active && styles.emojiActive]}>{emoji}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 4,
  },
  active_yes: {
    backgroundColor: Colors.yesBg,
    borderColor: Colors.yes,
  },
  active_maybe: {
    backgroundColor: Colors.maybeBg,
    borderColor: Colors.maybe,
  },
  active_no: {
    backgroundColor: Colors.noBg,
    borderColor: Colors.no,
  },
  pressed: {
    opacity: 0.75,
  },
  emoji: {
    fontSize: 18,
    color: Colors.textFaint,
  },
  emojiActive: {
    color: Colors.text,
  },
  label: {
    ...Typography.titleSm,
    color: Colors.textDim,
  },
  labelActive: {
    color: Colors.text,
  },
});
