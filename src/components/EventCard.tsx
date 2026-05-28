import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Radius, Typography, Spacing, Shadow } from '../constants/theme';
import { Event, RsvpStatus } from '../types/database';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function countsByStatus(event: Event) {
  const counts = { yes: 0, maybe: 0, no: 0 };
  event.rsvps?.forEach(r => { counts[r.status as RsvpStatus]++; });
  return counts;
}

type Props = {
  event: Event;
  currentUserId: string;
};

export default function EventCard({ event, currentUserId }: Props) {
  const router = useRouter();
  const counts = countsByStatus(event);
  const myRsvp = event.rsvps?.find(r => r.user_id === currentUserId)?.status ?? null;
  const isOwner = event.created_by === currentUserId;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      {/* Date stripe */}
      <View style={styles.dateStripe}>
        <Text style={styles.dayOfWeek}>
          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
        </Text>
        <Text style={styles.dayNum}>
          {new Date(event.date).getDate()}
        </Text>
      </View>

      {/* Main content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          {isOwner && <Text style={styles.ownerBadge}>Host</Text>}
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatTime(event.date)}</Text>
          {event.location ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
            </>
          ) : null}
        </View>

        {/* RSVP counts */}
        <View style={styles.countsRow}>
          <View style={styles.countChip}>
            <Text style={[styles.countNum, { color: Colors.yes }]}>{counts.yes}</Text>
            <Text style={styles.countLabel}>In</Text>
          </View>
          <View style={styles.countChip}>
            <Text style={[styles.countNum, { color: Colors.maybe }]}>{counts.maybe}</Text>
            <Text style={styles.countLabel}>Maybe</Text>
          </View>
          <View style={styles.countChip}>
            <Text style={[styles.countNum, { color: Colors.textFaint }]}>{counts.no}</Text>
            <Text style={styles.countLabel}>Out</Text>
          </View>

          {/* My RSVP indicator */}
          {myRsvp && (
            <View style={[
              styles.myRsvpPill,
              myRsvp === 'yes' && { backgroundColor: Colors.yesBg },
              myRsvp === 'maybe' && { backgroundColor: Colors.maybeBg },
              myRsvp === 'no' && { backgroundColor: Colors.noBg },
            ]}>
              <Text style={[
                styles.myRsvpText,
                myRsvp === 'yes' && { color: Colors.yes },
                myRsvp === 'maybe' && { color: Colors.maybe },
                myRsvp === 'no' && { color: Colors.no },
              ]}>
                {myRsvp === 'yes' ? 'You\'re in' : myRsvp === 'maybe' ? 'You\'re maybe' : 'You\'re out'}
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
    ...Shadow.sm,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  dateStripe: {
    width: 56,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  dayOfWeek: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 28,
  },
  body: {
    flex: 1,
    padding: Spacing.md,
    gap: 6,
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
  ownerBadge: {
    ...Typography.label,
    fontSize: 10,
    color: Colors.primary,
    backgroundColor: 'rgba(15,52,96,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.bodySm,
    color: Colors.textDim,
    flexShrink: 1,
  },
  dot: {
    color: Colors.textFaint,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  countChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  countNum: {
    ...Typography.titleSm,
  },
  countLabel: {
    ...Typography.bodySm,
    color: Colors.textFaint,
  },
  myRsvpPill: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  myRsvpText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
