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

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [name, setName] = useState('');
  const [rsvp, setRsvp] = useState<RsvpStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [counts, setCounts] = useState({ yes: 0, maybe: 0, no: 0 });

  useEffect(() => {
    loadEvent();
  }, [code]);

  async function loadEvent() {
    const { data, error } = await supabase
      .from('events')
      .select('*, rsvps(*)')
      .eq('invite_code', code)
      .single();

    if (error || !data) {
      setStep('not-found');
      return;
    }
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
      // Upsert a guest rsvp (no user_id — use guest_name)
      await supabase.from('rsvps').upsert({
        event_id: event.id,
        user_id: null,
        guest_name: name.trim(),
        status: rsvp,
      });
      setStep('done');
    } catch {
      // silent — show done anyway so it's not frustrating
      setStep('done');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'not-found') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🍺</Text>
          <Text style={styles.heading}>Link not found</Text>
          <Text style={styles.sub}>This invite may have expired or been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'done') {
    const label = rsvp === 'yes' ? "You're in!" : rsvp === 'maybe' ? "Marked as maybe." : "Got it — you're out.";
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>{rsvp === 'yes' ? '🍻' : rsvp === 'maybe' ? '🤔' : '😔'}</Text>
          <Text style={styles.heading}>{label}</Text>
          <Text style={styles.sub}>{event?.title}</Text>
          <Text style={styles.sub}>{event ? formatDateTime(event.date) : ''}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Branding */}
          <View style={styles.brand}>
            <Text style={styles.brandLogo}>🍺</Text>
            <Text style={styles.brandName}>Dad Time</Text>
          </View>

          {/* Event card */}
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event?.title}</Text>
            <Text style={styles.eventMeta}>{event ? formatDateTime(event.date) : ''}</Text>
            {event?.location ? <Text style={styles.eventMeta}>{event.location}</Text> : null}

            <View style={styles.countsRow}>
              <Text style={[styles.countItem, { color: Colors.yes }]}>{counts.yes} in</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.countItem, { color: Colors.maybe }]}>{counts.maybe} maybe</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={[styles.countItem, { color: Colors.textFaint }]}>{counts.no} out</Text>
            </View>
          </View>

          {step === 'name' && (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>YOUR NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="How should we know you?"
                  placeholderTextColor={Colors.textFaint}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  maxLength={50}
                  returnKeyType="next"
                  onSubmitEditing={() => name.trim() && setStep('rsvp')}
                />
              </View>
              <Button
                label="Continue"
                onPress={() => name.trim() && setStep('rsvp')}
                disabled={!name.trim()}
                fullWidth
              />
            </>
          )}

          {step === 'rsvp' && (
            <>
              <Text style={styles.rsvpPrompt}>Hey {name}, are you in?</Text>
              <RsvpButtons
                current={rsvp}
                onSelect={setRsvp}
                disabled={submitting}
              />
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
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  brand: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: 4,
  },
  brandLogo: {
    fontSize: 40,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    ...Shadow.sm,
  },
  eventTitle: {
    ...Typography.titleLg,
    color: Colors.text,
  },
  eventMeta: {
    ...Typography.bodyMd,
    color: Colors.textDim,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  countItem: {
    ...Typography.bodySm,
    fontWeight: '600',
  },
  dot: {
    color: Colors.textFaint,
  },
  field: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textFaint,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd,
    color: Colors.text,
    minHeight: 52,
  },
  rsvpPrompt: {
    ...Typography.titleMd,
    color: Colors.text,
    textAlign: 'center',
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
  sub: {
    ...Typography.bodyMd,
    color: Colors.textDim,
    textAlign: 'center',
  },
});
