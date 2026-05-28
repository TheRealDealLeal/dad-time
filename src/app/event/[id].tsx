import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  Pressable, Share, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../hooks/useEvents';
import RsvpButtons from '../../components/RsvpButtons';
import Button from '../../components/Button';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Event, RsvpStatus } from '../../types/database';
import { supabase } from '../../lib/supabase';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { upsertRsvp } = useEvents(session!.user.id);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    loadEvent();
  }, [id]);

  async function loadEvent() {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, rsvps(*)')
      .eq('id', id)
      .single();
    if (!error && data) setEvent(data as Event);
    setLoading(false);
  }

  async function handleRsvp(status: RsvpStatus) {
    if (!event) return;
    setRsvpLoading(true);
    try {
      await upsertRsvp(event.id, status);
      await loadEvent();
    } catch {
      // loadEvent will re-sync state on failure
    } finally {
      setRsvpLoading(false);
    }
  }

  async function handleShare() {
    if (!event?.invite_code) return;
    const url = `https://dadtime.app/invite/${event.invite_code}`;
    await Share.share({
      message: `You're invited to ${event.title}! RSVP here: ${url}`,
      url,
    });
  }

  async function handleDelete() {
    if (!event) return;
    Alert.alert('Delete Hangout', 'This will remove the event for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('events').delete().eq('id', event.id);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Event not found.</Text>
          <Button label="Go back" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const myRsvp = event.rsvps?.find(r => r.user_id === session!.user.id)?.status as RsvpStatus | null ?? null;
  const isOwner = event.created_by === session!.user.id;
  const counts = { yes: 0, maybe: 0, no: 0 };
  event.rsvps?.forEach(r => { counts[r.status as RsvpStatus]++; });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.backBtn}>← Back</Text>
        </Pressable>
        {isOwner && (
          <Pressable onPress={handleDelete} hitSlop={8}>
            <Text style={styles.deleteBtn}>Delete</Text>
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Event info */}
        <View style={styles.card}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.datetime}>{formatDateTime(event.date)}</Text>
          {event.location ? (
            <Text style={styles.location}>{event.location}</Text>
          ) : null}
          {isOwner && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>You're hosting</Text>
            </View>
          )}
        </View>

        {/* RSVP */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ARE YOU IN?</Text>
          <RsvpButtons
            current={myRsvp}
            onSelect={handleRsvp}
            disabled={rsvpLoading}
          />
        </View>

        {/* Counts */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE CREW</Text>
          <View style={styles.countsRow}>
            <View style={styles.countBlock}>
              <Text style={[styles.countNum, { color: Colors.yes }]}>{counts.yes}</Text>
              <Text style={styles.countLbl}>In</Text>
            </View>
            <View style={styles.countDivider} />
            <View style={styles.countBlock}>
              <Text style={[styles.countNum, { color: Colors.maybe }]}>{counts.maybe}</Text>
              <Text style={styles.countLbl}>Maybe</Text>
            </View>
            <View style={styles.countDivider} />
            <View style={styles.countBlock}>
              <Text style={[styles.countNum, { color: Colors.textFaint }]}>{counts.no}</Text>
              <Text style={styles.countLbl}>Out</Text>
            </View>
          </View>
        </View>

        {/* Share */}
        {event.invite_code && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INVITE LINK</Text>
            <Button
              label="Share Invite Link"
              onPress={handleShare}
              variant="secondary"
              fullWidth
            />
            <Text style={styles.inviteHint}>
              Anyone with the link can RSVP — no app required.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    ...Typography.bodyMd,
    color: Colors.primary,
  },
  deleteBtn: {
    ...Typography.bodySm,
    color: Colors.no,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  title: {
    ...Typography.titleLg,
    color: Colors.text,
  },
  datetime: {
    ...Typography.bodyMd,
    color: Colors.textDim,
  },
  location: {
    ...Typography.bodySm,
    color: Colors.textDim,
  },
  hostBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    backgroundColor: 'rgba(15,52,96,0.08)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  hostBadgeText: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: 12,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textFaint,
  },
  countsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  countBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  countDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  countNum: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  countLbl: {
    ...Typography.bodySm,
    color: Colors.textDim,
  },
  inviteHint: {
    ...Typography.bodySm,
    color: Colors.textFaint,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.bodyMd,
    color: Colors.textDim,
  },
});
