import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Button from '../../components/Button';
import RsvpButtons from '../../components/RsvpButtons';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Event, RsvpStatus } from '../../types/database';

type Step = 'loading' | 'not-found' | 'name' | 'rsvp' | 'done';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [name, setName] = useState('');
  const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState({ yes: 0, maybe: 0, no: 0 });

  useEffect(() => { loadEvent(); }, [code]);

  async function loadEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*, rsvps(*)')
      .eq('invite_code', code)
      .single();

    if (error || !data) { setStep('not-found'); return; }

    setEvent(data as Event);
    const c = { yes: 0, maybe: 0, no: 0 };
    (data.rsvps ?? []).forEach((r: any) => { c[r.status as RsvpStatus]++; });
    setCounts(c);
    setStep('name');
  }

  async function handleSubmit() {
    if (!name.trim() || !rsvp || !event) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('rsvps').insert({
        event_id: event.id,
        user_id: null,
        guest_name: name.trim(),
        status: rsvp,
      });
      // 23505 = unique_violation — already RSVPed with this name, treat as success
      if (error && error.code !== '23505') throw error;
      setStep('done');
    } catch {
      setStep('done');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not Found ──────────────────────────────────────────────────────────────
  if (step === 'not-found') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🤷</Text>
          <Text style={styles.heading}>Link not found</Text>
          <Text style={styles.sub}>This invite may have expired or been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  if (step === 'done') {
    const emoji = rsvp === 'yes' ? '🍻' : rsvp === 'maybe' ? '🤔' : '😔';
    const headline = rsvp === 'yes' ? "You're in!" : rsvp === 'maybe' ? 'Marked as maybe.' : 'Got it — you\'re out.';
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.doneBadge}>
            <Text style={styles.doneEmoji}>{emoji}</Text>
          </View>
          <Text style={styles.heading}>{headline}</Text>
          <Text style={styles.eventNameDone}>{event?.title}</Text>
          <Text style={styles.sub}>{event ? formatDateTime(event.date) : ''}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Name + RSVP ───────────────────────────────────────────────────────────
  const eventDate = event ? new Date(event.date) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand header */}
          <View style={styles.brandHeader}>
            <Text style={styles.brandEmoji}>🍺</Text>
            <View style={styles.brandText}>
              <Text style={styles.brandEyebrow}>YOU'RE INVITED</Text>
              <Text style={styles.brandName}>DAD TIME</Text>
            </View>
          </View>

          {/* Event card */}
          {event && eventDate && (
            <View style={styles.eventCard}>
              <View style={styles.eventDateStripe}>
                <Text style={styles.stripeMonth}>{MONTHS[eventDate.getMonth()]}</Text>
                <Text style={styles.stripeDay}>{eventDate.getDate()}</Text>
                <Text style={styles.stripeDow}>{DAYS[eventDate.getDay()]}</Text>
              </View>
              <View style={styles.eventCardBody}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{formatDateTime(event.date)}</Text>
                {event.location ? <Text style={styles.eventMeta}>📍 {event.location}</Text> : null}
                <View style={styles.crewLine}>
                  <Text style={[styles.crewCount, { color: Colors.yes }]}>{counts.yes} in</Text>
                  <Text style={styles.crewDot}> · </Text>
                  <Text style={[styles.crewCount, { color: Colors.maybe }]}>{counts.maybe} maybe</Text>
                </View>
              </View>
            </View>
          )}

          {/* Name step */}
          {step === 'name' && (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>YOUR NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What should we call you?"
                  placeholderTextColor={Colors.textFaint}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={50}
                  returnKeyType="next"
                  onSubmitEditing={() => name.trim() && setStep('rsvp')}
                  accessibilityLabel="Your name"
                />
              </View>
              <Button
                label="Continue →"
                onPress={() => name.trim() && setStep('rsvp')}
                disabled={!name.trim()}
                fullWidth
              />
            </>
          )}

          {/* RSVP step */}
          {step === 'rsvp' && (
            <>
              <View style={styles.promptRow}>
                <Text style={styles.promptText}>Hey {name}, </Text>
                <Text style={styles.promptBold}>are you in?</Text>
              </View>
              <RsvpButtons current={rsvp} onSelect={setRsvp} disabled={submitting} />
              <Button
                label="Send RSVP"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!rsvp}
                fullWidth
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.sm,
  },
  brandEmoji: {
    fontSize: 40,
  },
  brandText: {
    gap: 2,
  },
  brandEyebrow: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 2.5,
    fontSize: 9,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 3,
  },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  eventDateStripe: {
    width: 60,
    backgroundColor: Colors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: 1,
  },
  stripeMonth: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.65)',
  },
  stripeDay: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.white,
    lineHeight: 32,
    letterSpacing: -1,
  },
  stripeDow: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.55)',
  },
  eventCardBody: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  eventTitle: {
    ...Typography.titleMd,
    color: Colors.text,
  },
  eventMeta: {
    ...Typography.bodySm,
    color: Colors.textDim,
  },
  crewLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  crewCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  crewDot: {
    ...Typography.bodySm,
    color: Colors.textFaint,
  },

  field: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textFaint,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd,
    color: Colors.text,
    minHeight: 52,
  },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  promptText: {
    ...Typography.titleLg,
    color: Colors.textDim,
  },
  promptBold: {
    ...Typography.titleLg,
    color: Colors.text,
  },

  // Done state
  doneBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryLight,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  doneEmoji: {
    fontSize: 48,
  },
  bigEmoji: {
    fontSize: 64,
    marginBottom: Spacing.sm,
  },
  heading: {
    ...Typography.titleLg,
    color: Colors.text,
    textAlign: 'center',
  },
  eventNameDone: {
    ...Typography.displayMd,
    color: Colors.primary,
    textAlign: 'center',
  },
  sub: {
    ...Typography.bodyMd,
    color: Colors.textDim,
    textAlign: 'center',
  },
});
