import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useHangouts } from '../../../hooks/useHangouts';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { Hangout, HangoutOption, VoteValue } from '../../../types/database';
import { supabase } from '../../../lib/supabase';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function optionDate(iso: string) {
  const d = new Date(iso);
  return { month: MONTHS[d.getMonth()], day: d.getDate(), dow: DAYS_LONG[d.getDay()] };
}

function voteCounts(option: HangoutOption) {
  const votes = option.votes ?? [];
  return {
    yes: votes.filter(v => v.value === 'yes').length,
    maybe: votes.filter(v => v.value === 'maybe').length,
    no: votes.filter(v => v.value === 'no').length,
  };
}

const VOTE_OPTIONS: { value: VoteValue; label: string }[] = [
  { value: 'yes',   label: "I'm Free" },
  { value: 'maybe', label: 'Maybe'    },
  { value: 'no',    label: "Can't"    },
];

export default function HangoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { castVote, confirmOption, deleteHangout } = useHangouts(session!.user.id);

  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('hangouts')
      .select(`*, creator:users!created_by(id, display_name, avatar_url), options:hangout_options!hangout_id(*, suggester:users!suggested_by(id, display_name, avatar_url), votes:option_votes(*))`)
      .eq('id', id)
      .single();
    if (data) {
      const sorted = { ...data, options: [...(data.options ?? [])].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()) };
      setHangout(sorted as Hangout);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myVoteFor = (option: HangoutOption): VoteValue | null =>
    option.votes?.find(v => v.user_id === session!.user.id)?.value ?? null;

  async function handleVote(optionId: string, value: VoteValue) {
    setVotingId(optionId);
    try {
      await castVote(optionId, value);
      await load();
    } catch (e) {
      console.error('vote failed', e);
    } finally {
      setVotingId(null);
    }
  }

  async function handleConfirm(optionId: string) {
    Alert.alert('Lock this in?', "This picks the time for everyone. You can't undo it.", [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Lock it in', onPress: async () => {
        await confirmOption(hangout!.id, optionId);
        await load();
      }},
    ]);
  }

  async function handleDelete() {
    Alert.alert('Delete hangout?', 'Removes it for everyone.', [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteHangout(hangout!.id);
        router.back();
      }},
    ]);
  }

  async function handleShare() {
    if (!hangout?.invite_code) return;
    const inviteUrl = `dadtime://invite/${hangout.invite_code}`;
    await Share.share({
      // iOS uses `url` as the tappable hyperlink; Android embeds it in `message`
      message: `You're invited to ${hangout.title}! Vote on what time works for you: ${inviteUrl}`,
      url: inviteUrl,
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!hangout) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.notFoundEmoji}>🤷</Text>
          <Text style={styles.notFoundText}>Hangout not found.</Text>
          <Pressable onPress={() => router.back()} style={styles.backLink}><Text style={styles.backLinkText}>← Go back</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = hangout.created_by === session!.user.id;
  const options = hangout.options ?? [];
  const confirmedOption = hangout.confirmed_option_id ? options.find(o => o.id === hangout.confirmed_option_id) : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backBtnText}>← Back</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{hangout.title}</Text>
          <View style={[styles.statusBadge, hangout.status === 'confirmed' && styles.statusBadgeConfirmed]}>
            <Text style={[styles.statusText, hangout.status === 'confirmed' && styles.statusTextConfirmed]}>
              {hangout.status === 'confirmed' ? '✓ CONFIRMED' : '● PLANNING'}
            </Text>
          </View>
        </View>
        {isOwner ? (
          <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
            <Text style={styles.deleteBtnText}>Delete</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Confirmed hero */}
        {confirmedOption && (
          <View style={styles.confirmedHero}>
            <Text style={styles.confirmedLabel}>IT'S HAPPENING</Text>
            {(() => { const { dow, month, day } = optionDate(confirmedOption.starts_at); return (
              <Text style={styles.confirmedDate}>{dow}, {month} {day}</Text>
            ); })()}
            <Text style={styles.confirmedTime}>
              {fmt(confirmedOption.starts_at)}
              {confirmedOption.ends_at ? ` – ${fmt(confirmedOption.ends_at)}` : ''}
            </Text>
            {confirmedOption.location ? <Text style={styles.confirmedLocation}>📍 {confirmedOption.location}</Text> : null}
            <View style={styles.confirmedCrew}>
              <Text style={styles.confirmedCrewNum}>{confirmedOption.votes?.filter(v => v.value === 'yes').length ?? 0}</Text>
              <Text style={styles.confirmedCrewLabel}> people said they're free</Text>
            </View>
          </View>
        )}

        {/* Note */}
        {hangout.note ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>{hangout.note}</Text>
          </View>
        ) : null}

        {/* Options */}
        {hangout.status === 'planning' && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>PROPOSED TIMES</Text>
              <Text style={styles.sectionSub}>Tap to vote on each</Text>
            </View>

            {options.length === 0 ? (
              <View style={styles.emptyOptions}>
                <Text style={styles.emptyOptionsText}>No times proposed yet. Be the first!</Text>
              </View>
            ) : (
              options.map(option => {
                const { dow, month, day } = optionDate(option.starts_at);
                const counts = voteCounts(option);
                const myVote = myVoteFor(option);
                const isVoting = votingId === option.id;

                return (
                  <View key={option.id} style={styles.optionCard}>
                    {/* Date strip */}
                    <View style={styles.optionDateStrip}>
                      <Text style={styles.optionMonth}>{month}</Text>
                      <Text style={styles.optionDay}>{day}</Text>
                      <Text style={styles.optionDow}>{dow.slice(0, 3).toUpperCase()}</Text>
                    </View>

                    <View style={styles.optionBody}>
                      {/* Time */}
                      <Text style={styles.optionTime}>
                        {fmt(option.starts_at)}
                        {option.ends_at ? ` – ${fmt(option.ends_at)}` : ''}
                      </Text>

                      {option.location ? <Text style={styles.optionLocation}>📍 {option.location}</Text> : null}
                      {option.note ? <Text style={styles.optionNote}>{option.note}</Text> : null}

                      {/* Vote counts */}
                      <View style={styles.countsRow}>
                        <Text style={[styles.countChip, styles.countYes]}>{counts.yes} free</Text>
                        <Text style={[styles.countChip, styles.countMaybe]}>{counts.maybe} maybe</Text>
                        {counts.no > 0 && <Text style={[styles.countChip, styles.countNo]}>{counts.no} can't</Text>}
                      </View>

                      {/* Vote buttons */}
                      {isVoting ? (
                        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.sm }} />
                      ) : (
                        <View style={styles.voteRow}>
                          {VOTE_OPTIONS.map(({ value, label }) => (
                            <Pressable
                              key={value}
                              style={({ pressed }) => [
                                styles.voteBtn,
                                myVote === value && value === 'yes'   && styles.voteBtnActive_yes,
                                myVote === value && value === 'maybe' && styles.voteBtnActive_maybe,
                                myVote === value && value === 'no'    && styles.voteBtnActive_no,
                                pressed && styles.voteBtnPressed,
                              ]}
                              onPress={() => handleVote(option.id, value)}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: myVote === value }}
                            >
                              <Text style={[
                                styles.voteBtnText,
                                myVote === value && value === 'yes'   && styles.voteBtnTextActive_yes,
                                myVote === value && value === 'maybe' && styles.voteBtnTextActive_maybe,
                                myVote === value && value === 'no'    && styles.voteBtnTextActive_no,
                              ]}>
                                {label}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}

                      {/* Host: pick this time */}
                      {isOwner && (
                        <Pressable
                          style={({ pressed }) => [styles.pickBtn, pressed && { opacity: 0.75 }]}
                          onPress={() => handleConfirm(option.id)}
                        >
                          <Text style={styles.pickBtnText}>Lock this in →</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Propose a time */}
            <Pressable
              style={({ pressed }) => [styles.addOptionBtn, pressed && { opacity: 0.75 }]}
              onPress={() => router.push({ pathname: '/(app)/hangout/add-option', params: { hangoutId: hangout.id, defaultLocation: hangout.location ?? '' } })}
              accessibilityRole="button"
            >
              <Text style={styles.addOptionIcon}>+</Text>
              <Text style={styles.addOptionText}>Propose a Time</Text>
            </Pressable>
          </>
        )}

        {/* Share */}
        <View style={styles.shareCard}>
          <Text style={styles.shareEmoji}>🔗</Text>
          <View style={styles.shareBody}>
            <Text style={styles.shareTitle}>Invite the crew</Text>
            <Text style={styles.shareDesc}>Anyone with the link can vote on times.</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.75 }]} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
        </View>

        {/* Done — back to list. Only visible once at least one time has been proposed. */}
        {options.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.75 }]}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.doneBtnText}>← Back to all hangouts</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  notFoundEmoji: { fontSize: 48 },
  notFoundText: { ...Typography.titleMd, color: Colors.textDim },
  backLink: { marginTop: Spacing.sm },
  backLinkText: { ...Typography.bodyMd, color: Colors.primaryMid },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.primary,
  },
  backBtn: { minWidth: 60, minHeight: 44, justifyContent: 'center' },
  backBtnText: { ...Typography.bodyMd, color: 'rgba(255,255,255,0.8)' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: Spacing.sm },
  headerTitle: { fontSize: 16, fontWeight: '900', color: Colors.white, letterSpacing: 1 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  statusBadgeConfirmed: { backgroundColor: 'rgba(255,255,255,0.25)' },
  statusText: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  statusTextConfirmed: { color: Colors.white },
  deleteBtn: { minWidth: 60, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
  deleteBtnText: { ...Typography.bodySm, color: 'rgba(255,100,100,0.85)', fontWeight: '600' },

  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  confirmedHero: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    padding: Spacing.lg, gap: Spacing.xs, alignItems: 'center',
  },
  confirmedLabel: { ...Typography.label, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  confirmedDate: { fontSize: 22, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  confirmedTime: { ...Typography.titleLg, color: 'rgba(255,255,255,0.9)' },
  confirmedLocation: { ...Typography.bodyMd, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  confirmedCrew: { flexDirection: 'row', alignItems: 'baseline', marginTop: Spacing.sm },
  confirmedCrewNum: { fontSize: 28, fontWeight: '900', color: Colors.white },
  confirmedCrewLabel: { ...Typography.bodyMd, color: 'rgba(255,255,255,0.7)' },

  noteBox: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.md,
  },
  noteText: { ...Typography.bodyMd, color: Colors.textDim, fontStyle: 'italic' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { ...Typography.label, color: Colors.textFaint, letterSpacing: 1.5 },
  sectionSub: { ...Typography.caption, color: Colors.textFaint },

  emptyOptions: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    padding: Spacing.lg, alignItems: 'center', borderWidth: 1.5,
    borderColor: Colors.border, borderStyle: 'dashed',
  },
  emptyOptionsText: { ...Typography.bodyMd, color: Colors.textFaint, textAlign: 'center' },

  optionCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, ...Shadow.sm,
  },
  optionDateStrip: {
    width: 60, backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, gap: 1,
    borderRightWidth: 1.5, borderRightColor: Colors.border,
  },
  optionMonth: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, color: Colors.primaryMid },
  optionDay: { fontSize: 26, fontWeight: '900', color: Colors.primary, lineHeight: 30, letterSpacing: -1 },
  optionDow: { fontSize: 9, fontWeight: '700', letterSpacing: 1, color: Colors.primaryMid },

  optionBody: { flex: 1, padding: Spacing.md, gap: Spacing.sm },
  optionTime: { ...Typography.titleSm, color: Colors.text },
  optionLocation: { ...Typography.bodySm, color: Colors.textDim },
  optionNote: { ...Typography.bodySm, color: Colors.textFaint, fontStyle: 'italic' },

  countsRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap' },
  countChip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
  countYes: { backgroundColor: Colors.yesBg, color: Colors.yes },
  countMaybe: { backgroundColor: Colors.maybeBg, color: Colors.maybe },
  countNo: { backgroundColor: Colors.noBg, color: Colors.no },

  voteRow: { flexDirection: 'row', gap: Spacing.xs },
  voteBtn: {
    flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center',
  },
  voteBtnActive_yes: { backgroundColor: Colors.yesBg, borderColor: Colors.yes },
  voteBtnActive_maybe: { backgroundColor: Colors.maybeBg, borderColor: Colors.maybe },
  voteBtnActive_no: { backgroundColor: Colors.noBg, borderColor: Colors.no },
  voteBtnPressed: { opacity: 0.7 },
  voteBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textDim },
  voteBtnTextActive_yes: { color: Colors.yes },
  voteBtnTextActive_maybe: { color: Colors.maybe },
  voteBtnTextActive_no: { color: Colors.no },

  pickBtn: {
    alignSelf: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, marginTop: 4,
  },
  pickBtnText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },

  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, paddingVertical: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 2, borderColor: Colors.primary,
    borderStyle: 'dashed', backgroundColor: Colors.primaryLight,
  },
  addOptionIcon: { fontSize: 20, color: Colors.primary, fontWeight: '300' },
  addOptionText: { ...Typography.titleSm, color: Colors.primary },

  shareCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: Spacing.md, gap: Spacing.sm, ...Shadow.sm,
  },
  shareEmoji: { fontSize: 28 },
  shareBody: { flex: 1, gap: 2 },
  shareTitle: { ...Typography.titleSm, color: Colors.text },
  shareDesc: { ...Typography.bodySm, color: Colors.textDim },
  shareBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: Radius.md, minHeight: 44, justifyContent: 'center',
  },
  shareBtnText: { ...Typography.titleSm, color: Colors.white },

  doneBtn: {
    alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  doneBtnText: { ...Typography.titleSm, color: Colors.primaryMid },
});
