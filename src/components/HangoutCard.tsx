import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Typography, Spacing, Shadow } from '../constants/theme';
import { Hangout, HangoutOption } from '../types/database';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function yesCount(options: HangoutOption[]) {
  return options.reduce((acc, o) => acc + (o.votes?.filter(v => v.value === 'yes').length ?? 0), 0);
}

type Props = { hangout: Hangout; currentUserId: string };

export default function HangoutCard({ hangout, currentUserId }: Props) {
  const router = useRouter();
  const options = hangout.options ?? [];
  const isOwner = hangout.created_by === currentUserId;
  const confirmed = hangout.status === 'confirmed';
  const confirmedOption = confirmed
    ? options.find(o => o.id === hangout.confirmed_option_id)
    : null;
  const earliestOption = !confirmed && options.length > 0
    ? options.reduce((min, o) => new Date(o.starts_at) < new Date(min.starts_at) ? o : min)
    : null;
  const displayOption = confirmedOption ?? earliestOption;
  const d = displayOption ? new Date(displayOption.starts_at) : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/(app)/hangout/${hangout.id}` as any)}
      accessibilityRole="button"
      accessibilityLabel={hangout.title}
    >
      {/* Left accent */}
      <View style={[styles.accent, confirmed && styles.accentConfirmed]}>
        {d ? (
          <>
            <Text style={styles.accentMonth}>{MONTHS[d.getMonth()]}</Text>
            <Text style={styles.accentDay}>{d.getDate()}</Text>
            <Text style={styles.accentDow}>{DAYS[d.getDay()]}</Text>
          </>
        ) : (
          <Text style={styles.accentIcon}>🗓</Text>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{hangout.title}</Text>
          <View style={[styles.badge, confirmed && styles.badgeConfirmed]}>
            <Text style={[styles.badgeText, confirmed && styles.badgeTextConfirmed]}>
              {confirmed ? 'CONFIRMED' : 'PLANNING'}
            </Text>
          </View>
        </View>

        {confirmed && confirmedOption ? (
          <Text style={styles.meta}>
            {formatTime(confirmedOption.starts_at)}
            {confirmedOption.ends_at ? ` – ${formatTime(confirmedOption.ends_at)}` : ''}
            {confirmedOption.location ? `  ·  ${confirmedOption.location}` : ''}
          </Text>
        ) : (
          <Text style={styles.meta}>
            {options.length === 0
              ? 'No times proposed yet'
              : `${options.length} option${options.length === 1 ? '' : 's'}  ·  ${yesCount(options)} free`}
          </Text>
        )}

        {isOwner && (
          <View style={styles.hostPill}>
            <Text style={styles.hostPillText}>HOST</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  accent: {
    width: 64, backgroundColor: Colors.primaryMid,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, gap: 1,
  },
  accentConfirmed: { backgroundColor: Colors.primary },
  accentMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(255,255,255,0.65)' },
  accentDay: { fontSize: 28, fontWeight: '900', color: Colors.white, lineHeight: 32, letterSpacing: -1 },
  accentDow: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.55)' },
  accentIcon: { fontSize: 24 },
  body: { flex: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.titleMd, color: Colors.text, flex: 1 },
  badge: {
    backgroundColor: Colors.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.xs, borderWidth: 1, borderColor: Colors.border,
  },
  badgeConfirmed: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  badgeText: { ...Typography.label, color: Colors.textFaint, fontSize: 9 },
  badgeTextConfirmed: { color: Colors.primaryMid },
  meta: { ...Typography.bodySm, color: Colors.textDim },
  hostPill: {
    alignSelf: 'flex-start', backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs,
    borderWidth: 1, borderColor: Colors.primaryMid, marginTop: 2,
  },
  hostPillText: { ...Typography.label, color: Colors.primaryMid, fontSize: 9 },
});
