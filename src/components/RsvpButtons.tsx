import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '../constants/theme';
import { RsvpStatus } from '../types/database';

const OPTIONS: { status: RsvpStatus; label: string; icon: string }[] = [
  { status: 'yes',   label: "I'm In",   icon: '✓' },
  { status: 'maybe', label: 'Maybe',    icon: '~' },
  { status: 'no',    label: "I'm Out",  icon: '✕' },
];

type Props = {
  current: RsvpStatus | null;
  onSelect: (status: RsvpStatus) => void;
  disabled?: boolean;
};

export default function RsvpButtons({ current, onSelect, disabled }: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map(({ status, label, icon }) => {
        const active = current === status;
        return (
          <Pressable
            key={status}
            onPress={() => !disabled && onSelect(status)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled }}
            accessibilityLabel={label}
            style={({ pressed }) => [
              styles.btn,
              active && styles[`active_${status}` as keyof typeof styles],
              pressed && !disabled && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.icon,
                active && status === 'yes'   && { color: Colors.yes },
                active && status === 'maybe' && { color: Colors.maybe },
                active && status === 'no'    && { color: Colors.no },
                !active && { color: Colors.textFaint },
              ]}
            >
              {icon}
            </Text>
            <Text
              style={[
                styles.label,
                active && status === 'yes'   && { color: Colors.yes },
                active && status === 'maybe' && { color: Colors.maybe },
                active && status === 'no'    && { color: Colors.no },
                !active && { color: Colors.textDim },
              ]}
            >
              {label}
            </Text>
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
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 4,
    minHeight: 64, // WCAG touch target
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
    opacity: 0.72,
    transform: [{ scale: 0.97 }],
  },
  icon: {
    fontSize: 16,
    fontWeight: '800',
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
