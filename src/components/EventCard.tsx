import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Typography, Spacing, Shadow } from '../constants/theme';
import { Event, RsvpStatus } from '../types/database';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function countsByStatus(rsvps: Event['rsvps']) {
  const counts = { yes: 0, maybe: 0, no: 0 };
  rsvps?.forEach(r => { counts[r.status as RsvpStatus]++; });
  return counts;
}

type Props = {
  event: Event;
  currentUserId: string;
};

export default function EventCard({ event, currentUserId }: Props) {
  const router = useRouter();
  const d = new Date(event.date);
  const counts = countsByStatus(event.rsvps);
  const myRsvp = event.rsvps?.find(r => r.user_id === currentUserId)?.status as RsvpStatus | null ?? null;
  const isOwner = event.created_by === currentUserId;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/event/${event.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} at ${formatTime(event.date)}`}
    >
      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={styles.month}>{MONTHS[d.getMonth()]}</Text>
        <Text style={styles.day}>{d.getDate()}</Text>
        <Text style={styles.dow}>{DAYS[d.getDay()]}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Main content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          {isOwner && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>HOST</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.time}>{formatTime(event.date)}</Text>
          {event.location ? (
            <>
              <Text style={styles.dot}> · </Text>
              <Text style={styles.location} numberOfLines={1}>{event.location}</Text>
            </>
          ) : null}
        </View>

        {/* Crew counts */}
        <View style={styles.bottomRow}>
          <View style={styles.counts}>
            <Text style={[styles.countNum, { color: Colors.yes }]}>{counts.yes}</Text>
            <Text style={styles.countLbl}> in</Text>
            <Text style={styles.countSep}>  ·  </Text>
            <Text style={[styles.countNum, { color: Colors.maybe }]}>{counts.maybe}</Text>
            <Text style={styles.countLbl}> maybe</Text>
            {counts.no > 0 && (
              <>
                <Text style={styles.countSep}>  ·  </Text>
                <Text style={[styles.countNum, { color: Colors.no }]}>{counts.no}</Text>
                <Text style={styles.countLbl}> out</Text>
              </>
            )}
          </View>

          {myRsvp && (
            <View style={[
              styles.rsvpPill,
              myRsvp === 'yes'   && { backgroundColor: Colors.yesBg },
              myRsvp === 'maybe' && { backgroundColor: Colors.maybeBg },
              myRsvp === 'no'    && { backgroundColor: Colors.noBg },
            ]}>
              <Text style={[
                styles.rsvpPillText,
                myRsvp === 'yes'   && { color: Colors.yes },
                myRsvp === 'maybe' && { color: Colors.maybe },
                myRsvp === 'no'    && { color: Colors.no },
              ]}>
                {myRsvp === 'yes' ? "You're in" : myRsvp === 'maybe' ? 'Maybe' : "You're out"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  dateCol: {
    width: 62,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 1,
  },
  month: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.65)',
  },
  day: {
    fontSize: 30,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 34,
    letterSpacing: -1,
  },
  dow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  divider: {
    width: 3,
    backgroundColor: Colors.primaryLight,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.titleMd,
    color: Colors.text,
    flex: 1,
  },
  hostBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.primaryMid,
  },
  hostBadgeText: {
    ...Typography.label,
    color: Colors.primaryMid,
    fontSize: 9,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    ...Typography.bodySm,
    color: Colors.textDim,
    fontWeight: '500',
  },
  dot: {
    ...Typography.bodySm,
    color: Colors.textFaint,
  },
  location: {
    ...Typography.bodySm,
    color: Colors.textDim,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  counts: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countNum: {
    fontSize: 14,
    fontWeight: '700',
  },
  countLbl: {
    ...Typography.bodySm,
    color: Colors.textFaint,
  },
  countSep: {
    ...Typography.bodySm,
    color: Colors.border,
  },
  rsvpPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  rsvpPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
