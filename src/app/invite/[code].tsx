import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';
import { Hangout, HangoutOption, VoteValue } from '../../types/database';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

type Step = 'loading' | 'not-found' | 'name' | 'vote' | 'done';
type VoteMap = Record<string, VoteValue>;

const VOTE_OPTIONS: { value: VoteValue; label: string }[] = [
  { value: 'yes',   label: "I'm Free" },
  { value: 'maybe', label: 'Maybe'    },
  { value: 'no',    label: "Can't"    },
];

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { session } = useAuth();
  const isLoggedIn = !!session?.user && !session.user.is_anonymous;

  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [step, setStep] = useState<Step>('loading');
  const [name, setName] = useState('');
  const [votes, setVotes] = useState<VoteMap>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadHangout(); }, [code]);

  async function loadHangout() {
    const { data, error } = await supabase
      .from('hangouts')
      .select(`*, options:hangout_options!hangout_id(*, votes:option_votes(*))`)
      .eq('invite_code', code)
      .single();

    if (error || !data) { setStep('not-found'); return; }
    const sorted = {
      ...data,
      options: [...(data.options ?? [])].sort((a: HangoutOption, b: HangoutOption) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      ),
    };
    setHangout(sorted as Hangout);
    // Logged-in users skip the name step
    setStep(isLoggedIn ? 'vote' : 'name');
  }

  async function handleSubmit() {
    if (!hangout) return;
    if (!isLoggedIn && !name.trim()) return;
    setSubmitting(true);
    try {
      const options = hangout.options ?? [];
      for (const option of options) {
        const value = votes[option.id];
        if (!value) continue;
        if (isLoggedIn && session?.user.id) {
          // Upsert so repeated visits just update the vote
          await supabase.from('option_votes').upsert(
            { option_id: option.id, user_id: session.user.id, value, updated_at: new Date().toISOString() },
            { onConflict: 'option_id,user_id' }
          );
        } else {
          await supabase.from('option_votes').insert({
            option_id: option.id,
            guest_name: name.trim(),
            value,
          });
        }
      }
      setStep('done');
    } catch (e) {
      console.error('vote failed', e);
      setStep('done');
    } finally {
      setSubmitting(false);
    }
  }

  const options = hangout?.options ?? [];
  const votedCount = Object.keys(votes).length;
  const displayName = isLoggedIn
    ? (session?.user.user_metadata?.full_name ?? session?.user.email?.split('@')[0] ?? 'You')
    : name.trim();
  const canSubmit = (isLoggedIn || name.trim().length > 0) && votedCount > 0;

  if (step === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

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

  if (step === 'done') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.doneBadge}><Text style={styles.doneEmoji}>🍻</Text></View>
          <Text style={styles.heading}>You're in the mix, {displayName}!</Text>
          <Text style={styles.sub}>{hangout?.title}</Text>
          <Text style={styles.subSm}>The host will pick a time based on everyone's availability.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Brand header */}
          <View style={styles.brandHeader}>
            <Text style={styles.brandEmoji}>🍺</Text>
            <View>
              <Text style={styles.brandEyebrow}>YOU'RE INVITED</Text>
              <Text style={styles.brandName}>DAD TIME</Text>
            </View>
          </View>

          {/* Hangout card */}
          <View style={styles.hangoutCard}>
            <Text style={styles.hangoutTitle}>{hangout?.title}</Text>
            {hangout?.note ? <Text style={styles.hangoutNote}>{hangout.note}</Text> : null}
            <Text style={styles.hangoutMeta}>{options.length} time{options.length === 1 ? '' : 's'} proposed — vote on what works for you</Text>
          </View>

          {/* Name field */}
          {step === 'name' && (
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>YOUR NAME</Text>
                <TextInput
                  style={styles.input}
                  placeholder="What should we call you?"
                  placeholderTextColor={Colors.textFaint}
                  value={name} onChangeText={setName}
                  autoFocus maxLength={50} returnKeyType="done"
                  onSubmitEditing={() => name.trim() && options.length > 0 && setStep('vote')}
                  accessibilityLabel="Your name"
                />
              </View>
              <Button
                label="See the Options →"
                onPress={() => name.trim() && options.length > 0 && setStep('vote')}
                disabled={!name.trim() || options.length === 0}
                fullWidth
              />
              {options.length === 0 && (
                <Text style={styles.noOptionsNote}>No times have been proposed yet. Check back later!</Text>
              )}
            </>
          )}

          {/* Voting */}
          {/* Logged-in user greeting before vote list */}
          {step === 'vote' && isLoggedIn && (
            <View style={styles.loggedInBanner}>
              <Text style={styles.loggedInText}>Voting as <Text style={styles.loggedInName}>{displayName}</Text></Text>
            </View>
          )}

          {step === 'vote' && (
            <>
              <Text style={styles.votePrompt}>
                {isLoggedIn ? 'Mark your availability for each option:' : `Hey ${name}, mark your availability for each option:`}
              </Text>

              {options.map(option => {
                const d = new Date(option.starts_at);
                const myVote = votes[option.id];
                return (
                  <View key={option.id} style={styles.optionCard}>
                    <View style={styles.optionStripe}>
                      <Text style={styles.stripeMonth}>{MONTHS[d.getMonth()]}</Text>
                      <Text style={styles.stripeDay}>{d.getDate()}</Text>
                    </View>
                    <View style={styles.optionBody}>
                      <Text style={styles.optionTime}>
                        {fmt(option.starts_at)}
                        {option.ends_at ? ` – ${fmt(option.ends_at)}` : ''}
                      </Text>
                      {option.location ? <Text style={styles.optionLocation}>📍 {option.location}</Text> : null}
                      {option.note ? <Text style={styles.optionNote}>{option.note}</Text> : null}

                      <View style={styles.voteRow}>
                        {VOTE_OPTIONS.map(({ value, label }) => (
                          <Pressable
                            key={value}
                            style={({ pressed }) => [
                              styles.voteBtn,
                              myVote === value && value === 'yes'   && styles.voteActive_yes,
                              myVote === value && value === 'maybe' && styles.voteActive_maybe,
                              myVote === value && value === 'no'    && styles.voteActive_no,
                              pressed && styles.voteBtnPressed,
                            ]}
                            onPress={() => setVotes(prev => ({ ...prev, [option.id]: value }))}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: myVote === value }}
                          >
                            <Text style={[
                              styles.voteBtnText,
                              myVote === value && value === 'yes'   && styles.voteTextActive_yes,
                              myVote === value && value === 'maybe' && styles.voteTextActive_maybe,
                              myVote === value && value === 'no'    && styles.voteTextActive_no,
                            ]}>
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })}

              <Button
                label={`Send Availability (${votedCount}/${options.length} voted)`}
                onPress={handleSubmit}
                loading={submitting}
                disabled={!canSubmit}
                fullWidth
              />
              {!canSubmit && votedCount < options.length && (
                <Text style={styles.voteHint}>Vote on at least one option to submit.</Text>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.lg },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  brandHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md, ...Shadow.sm,
  },
  brandEmoji: { fontSize: 40 },
  brandEyebrow: { ...Typography.label, color: 'rgba(255,255,255,0.55)', letterSpacing: 2.5, fontSize: 9 },
  brandName: { fontSize: 24, fontWeight: '900', color: Colors.white, letterSpacing: 3 },

  hangoutCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md, gap: 4, ...Shadow.sm,
  },
  hangoutTitle: { ...Typography.titleLg, color: Colors.text },
  hangoutNote: { ...Typography.bodyMd, color: Colors.textDim, fontStyle: 'italic' },
  hangoutMeta: { ...Typography.bodySm, color: Colors.textFaint, marginTop: 4 },

  field: { gap: Spacing.xs },
  fieldLabel: { ...Typography.label, color: Colors.textFaint, letterSpacing: 1.5 },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd, color: Colors.text, minHeight: 52,
  },
  noOptionsNote: { ...Typography.bodySm, color: Colors.textFaint, textAlign: 'center' },

  votePrompt: { ...Typography.titleMd, color: Colors.text },

  optionCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  optionStripe: {
    width: 56, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md,
    borderRightWidth: 1.5, borderRightColor: Colors.border, gap: 1,
  },
  stripeMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: Colors.primaryMid },
  stripeDay: { fontSize: 24, fontWeight: '900', color: Colors.primary, lineHeight: 28, letterSpacing: -1 },
  optionBody: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  optionTime: { ...Typography.titleSm, color: Colors.text },
  optionLocation: { ...Typography.bodySm, color: Colors.textDim },
  optionNote: { ...Typography.bodySm, color: Colors.textFaint, fontStyle: 'italic' },

  voteRow: { flexDirection: 'row', gap: Spacing.xs },
  voteBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  voteActive_yes: { backgroundColor: Colors.yesBg, borderColor: Colors.yes },
  voteActive_maybe: { backgroundColor: Colors.maybeBg, borderColor: Colors.maybe },
  voteActive_no: { backgroundColor: Colors.noBg, borderColor: Colors.no },
  voteBtnPressed: { opacity: 0.7 },
  voteBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textDim },
  voteTextActive_yes: { color: Colors.yes },
  voteTextActive_maybe: { color: Colors.maybe },
  voteTextActive_no: { color: Colors.no },

  voteHint: { ...Typography.bodySm, color: Colors.textFaint, textAlign: 'center' },

  loggedInBanner: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  loggedInText: { ...Typography.bodySm, color: Colors.primaryMid },
  loggedInName: { fontWeight: '700', color: Colors.primary },

  doneBadge: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primaryLight,
    borderWidth: 3, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  doneEmoji: { fontSize: 48 },
  bigEmoji: { fontSize: 64 },
  heading: { ...Typography.titleLg, color: Colors.text, textAlign: 'center' },
  sub: { ...Typography.titleMd, color: Colors.primary, textAlign: 'center' },
  subSm: { ...Typography.bodyMd, color: Colors.textDim, textAlign: 'center' },
});
