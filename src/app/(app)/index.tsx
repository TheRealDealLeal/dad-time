import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, SafeAreaView, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useHangouts } from '../../hooks/useHangouts';
import HangoutCard from '../../components/HangoutCard';
import EmptyState from '../../components/EmptyState';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { hangouts, loading, fetchHangouts } = useHangouts(session!.user.id);

  useFocusEffect(useCallback(() => { fetchHangouts(); }, [fetchHangouts]));

  const onRefresh = useCallback(() => { fetchHangouts(); }, [fetchHangouts]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>WELCOME BACK</Text>
          <Text style={styles.headerTitle}>Dad Time 🍺</Text>
        </View>
        <Pressable onPress={signOut} style={styles.signOutBtn} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>YOUR HANGOUTS</Text>
        {hangouts.length > 0 && (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{hangouts.length}</Text>
          </View>
        )}
      </View>

      {loading && hangouts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Getting the crew…</Text>
        </View>
      ) : (
        <FlatList
          data={hangouts}
          keyExtractor={h => h.id}
          renderItem={({ item }) => <HangoutCard hangout={item} currentUserId={session!.user.id} />}
          contentContainerStyle={hangouts.length === 0 ? styles.emptyContent : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Nothing on the books"
              subtitle="Start a hangout and let the crew pick a time that works for everyone."
              actionLabel="Plan Something"
              onAction={() => router.push('/(app)/create')}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.fabContainer}>
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => router.push('/(app)/create')}
          accessibilityRole="button"
          accessibilityLabel="Start a new hangout"
        >
          <Text style={styles.fabIcon}>+</Text>
          <Text style={styles.fabLabel}>NEW HANGOUT</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerEyebrow: { ...Typography.label, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, fontSize: 9 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  signOutBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
    minHeight: 44, justifyContent: 'center',
  },
  signOutText: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  sectionLabel: { ...Typography.label, color: Colors.textFaint, letterSpacing: 1.5 },
  countPill: {
    backgroundColor: Colors.primary, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full, minWidth: 22, alignItems: 'center',
  },
  countPillText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingText: { ...Typography.bodySm, color: Colors.textFaint },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  emptyContent: { flex: 1, paddingHorizontal: Spacing.md },
  separator: { height: Spacing.sm },
  fabContainer: { position: 'absolute', bottom: Spacing.xl, left: Spacing.md, right: Spacing.md, alignItems: 'center' },
  fab: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full, gap: Spacing.sm, ...Shadow.md,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  fabIcon: { fontSize: 22, color: Colors.white, fontWeight: '300', lineHeight: 26 },
  fabLabel: { ...Typography.label, color: Colors.white, letterSpacing: 2, fontSize: 12 },
});
