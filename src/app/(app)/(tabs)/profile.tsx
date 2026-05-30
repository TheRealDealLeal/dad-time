import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

type Stats = { hangouts: number; friends: number };

function initials(name: string | null | undefined): string {
  if (!name) return 'DA';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const userId = session?.user.id;

  const [displayName, setDisplayName] = useState<string>('');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [stats, setStats] = useState<Stats>({ hangouts: 0, friends: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setLoadingStats(true);
    try {
      const [{ data: user }, { count: hangoutCount }, { count: friendCount }] = await Promise.all([
        supabase
          .from('users')
          .select('display_name')
          .eq('id', userId)
          .single(),
        supabase
          .from('hangouts')
          .select('id', { count: 'exact', head: true })
          .eq('created_by', userId),
        supabase
          .from('friends')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'accepted'),
      ]);

      if (user?.display_name) setDisplayName(user.display_name);
      setStats({
        hangouts: hangoutCount ?? 0,
        friends: friendCount ?? 0,
      });
    } catch (err) {
      console.error('[Profile] load failed:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [userId]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  function startEditing() {
    setDraftName(displayName);
    setEditingName(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function cancelEditing() {
    setEditingName(false);
    setDraftName('');
  }

  async function saveName() {
    const trimmed = draftName.trim();
    if (!trimmed || !userId) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: trimmed })
        .eq('id', userId);
      if (error) throw error;
      setDisplayName(trimmed);
      setEditingName(false);
    } catch {
      Alert.alert('Error', 'Could not save your name. Try again.');
    } finally {
      setSavingName(false);
    }
  }

  const avatarLabel = initials(displayName || session?.user?.user_metadata?.full_name);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Avatar + name */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar} accessibilityLabel={`Avatar for ${displayName || 'you'}`}>
              <Text style={styles.avatarInitials}>{avatarLabel}</Text>
            </View>

            {editingName ? (
              <View style={styles.nameEditRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.nameInput}
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="Your display name"
                  placeholderTextColor={Colors.textFaint}
                  maxLength={40}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={saveName}
                  accessibilityLabel="Display name input"
                />
                <View style={styles.nameEditActions}>
                  <Pressable
                    style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }]}
                    onPress={saveName}
                    disabled={savingName || !draftName.trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Save name"
                  >
                    {savingName
                      ? <ActivityIndicator size="small" color={Colors.white} />
                      : <Text style={styles.saveBtnText}>Save</Text>
                    }
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
                    onPress={cancelEditing}
                    disabled={savingName}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing"
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.nameRow}
                onPress={startEditing}
                accessibilityRole="button"
                accessibilityLabel="Edit display name"
                accessibilityHint="Tap to edit your display name"
              >
                <Text style={styles.displayName}>
                  {displayName || 'Set your name'}
                </Text>
                <Text style={styles.editHint}>✎ Edit</Text>
              </Pressable>
            )}

            <Text style={styles.email}>
              {session?.user?.email ?? 'Anonymous'}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard} accessibilityLabel={`${stats.hangouts} hangouts hosted`}>
              {loadingStats
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.statNum}>{stats.hangouts}</Text>
              }
              <Text style={styles.statLabel}>Hangouts{'\n'}Hosted</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard} accessibilityLabel={`${stats.friends} crew members`}>
              {loadingStats
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <Text style={styles.statNum}>{stats.friends}</Text>
              }
              <Text style={styles.statLabel}>Crew{'\n'}Members</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Sign out */}
          <Pressable
            style={({ pressed }) => [styles.signOutRow, pressed && { opacity: 0.6 }]}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <SymbolView
              // @ts-ignore
              name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }}
              size={20}
              tintColor={Colors.no}
            />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },

  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  avatarSection: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadow.md,
  },
  avatarInitials: { fontSize: 36, fontWeight: '900', color: Colors.white, letterSpacing: 1 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  displayName: { ...Typography.titleLg, color: Colors.text },
  editHint: { ...Typography.bodySm, color: Colors.primaryMid },

  nameEditRow: { width: '100%', gap: Spacing.sm, alignItems: 'stretch' },
  nameInput: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Typography.titleMd, color: Colors.text, textAlign: 'center',
  },
  nameEditActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    minWidth: 88, alignItems: 'center', minHeight: 40, justifyContent: 'center',
  },
  saveBtnText: { ...Typography.titleSm, color: Colors.white },
  cancelBtn: {
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    minWidth: 80, alignItems: 'center', minHeight: 40, justifyContent: 'center',
  },
  cancelBtnText: { ...Typography.titleSm, color: Colors.textDim },

  email: { ...Typography.bodyMd, color: Colors.textFaint },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    overflow: 'hidden', ...Shadow.sm,
  },
  statCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.lg, gap: Spacing.xs,
  },
  statNum: { fontSize: 32, fontWeight: '900', color: Colors.primary, letterSpacing: -1 },
  statLabel: { ...Typography.caption, color: Colors.textFaint, textAlign: 'center', lineHeight: 17 },
  statDivider: { width: 1.5, backgroundColor: Colors.border },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },

  signOutRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1.5, borderColor: Colors.border,
    ...Shadow.sm,
  },
  signOutText: { ...Typography.titleSm, color: Colors.no },
});
