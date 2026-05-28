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

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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
      // loadEvent will re-sync on failure
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
    Alert.alert(
      'Delete Hangout?',
      'This removes the event for everyone. No take-backs.',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('events').delete().eq('id', event.id);
            if (!error) router.back();
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFoundEmoji}>🤷</Text>
          <Text style={styles.notFoundText}>Event not found.</Text>
          <Button label="Go Back" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const myRsvp = event.rsvps?.find(r => r.user_id === session!.user.id)?.status as RsvpStatus | null ?? null;
  const isOwner = event.created_by === session!.user.id;
  const counts = { yes: 0, maybe: 0, no: 0 };
  event.rsvps?.forEach(r => { counts[r.status as RsvpStatus]++; });
  const d = new Date(event.date);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>HANGOUT</Text>
        {isOwner ? (
          <Pressable
            onPress={handleDelete}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Delete event"
            hitSlop={8}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Event hero card */}
        <View style={styles.heroCard}>
          {/* Date badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeMonth}>
              {['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()]}
            </Text>
            <Text style={styles.dateBadgeDay}>{d.getDate()}</Text>
            <Text style={styles.dateBadgeDow}>
              {['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()]}
            </Text>
          </View>

          <View style={styles.heroBody}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDateTime}>{formatDateTime(event.date)}</Text>
            {event.location ? (
              <Text style={styles.eventLocation}>📍 {event.location}</Text>
            ) : null}
            {event.note ? (
              <Text style={styles.eventNote}>{event.note}</Text>
            ) : null}
          </View>

          {isOwner && (
            <View style={styles.hostBanner}>
              <Text style={styles.hostBannerText}>YOU'RE HOSTING</Text>
            </View>
          )}
        </View>

        {/* RSVP */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR RSVP</Text>
          {rsvpLoading ? (
            <View style={styles.rsvpLoading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <RsvpButtons current={myRsvp} onSelect={handleRsvp} />
          )}
        </View>

        {/* Crew */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THE CREW</Text>
          <View style={styles.crewCard}>
            <View style={styles.crewStat}>
              <Text style={[styles.crewNum, { color: Colors.yes }]}>{counts.yes}</Text>
              <Text style={styles.crewLbl}>In</Text>
            </View>
            <View style={styles.crewDivider} />
            <View style={styles.crewStat}>
              <Text style={[styles.crewNum, { color: Colors.maybe }]}>{counts.maybe}</Text>
              <Text style={styles.crewLbl}>Maybe</Text>
            </View>
            <View style={styles.crewDivider} />
            <View style={styles.crewStat}>
              <Text style={[styles.crewNum, { color: Colors.textFaint }]}>{counts.no}</Text>
              <Text style={styles.crewLbl}>Out</Text>
            </View>
          </View>
        </View>

        {/* Share */}
        {event.invite_code && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>INVITE THE CREW</Text>
            <View style={styles.shareCard}>
              <Text style={styles.shareEmoji}>🔗</Text>
              <View style={styles.shareBody}>
                <Text style={styles.shareTitle}>Share invite link</Text>
                <Text style={styles.shareDesc}>Anyone can RSVP — no app required.</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.75 }]}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share invite link"
              >
                <Text style={styles.shareBtnText}>Share</Text>
              </Pressable>
            </View>
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
  notFoundEmoji: { fontSize: 48 },
  notFoundText: { ...Typography.titleMd, color: Colors.textDim },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.primary,
  },
  backBtn: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: {
    ...Typography.bodyMd,
    color: 'rgba(255,255,255,0.8)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 3,
  },
  deleteBtn: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  deleteBtnText: {
    ...Typography.bodySm,
    color: 'rgba(255,100,100,0.85)',
    fontWeight: '600',
  },

  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  dateBadge: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  dateBadgeMonth: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.6)',
  },
  dateBadgeDay: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 52,
    letterSpacing: -2,
  },
  dateBadgeDow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
  },
  heroBody: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  eventTitle: {
    ...Typography.displayMd,
    color: Colors.text,
  },
  eventDateTime: {
    ...Typography.bodyMd,
    color: Colors.textDim,
    marginTop: 4,
  },
  eventLocation: {
    ...Typography.bodyMd,
    color: Colors.textDim,
  },
  eventNote: {
    ...Typography.bodyMd,
    color: Colors.textDim,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hostBanner: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  hostBannerText: {
    ...Typography.label,
    color: Colors.primaryMid,
    letterSpacing: 2,
  },

  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textFaint,
    letterSpacing: 1.5,
  },
  rsvpLoading: {
    minHeight: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },

  crewCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  crewStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  crewDivider: {
    width: 1.5,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  crewNum: {
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
    letterSpacing: -1,
  },
  crewLbl: {
    ...Typography.caption,
    color: Colors.textDim,
    fontWeight: '600',
  },

  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  shareEmoji: {
    fontSize: 28,
  },
  shareBody: {
    flex: 1,
    gap: 2,
  },
  shareTitle: {
    ...Typography.titleSm,
    color: Colors.text,
  },
  shareDesc: {
    ...Typography.bodySm,
    color: Colors.textDim,
  },
  shareBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  shareBtnText: {
    ...Typography.titleSm,
    color: Colors.white,
  },
});
