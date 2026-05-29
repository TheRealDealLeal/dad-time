import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useHangouts } from '../../../hooks/useHangouts';
import HangoutCard from '../../../components/HangoutCard';
import EmptyState from '../../../components/EmptyState';
import { TAB_BAR_CONTENT_HEIGHT } from '../../../components/TabBar';
import { Colors, Typography, Spacing, Radius } from '../../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { hangouts, loading, fetchHangouts } = useHangouts(session!.user.id);

  useFocusEffect(useCallback(() => { fetchHangouts(); }, [fetchHangouts]));
  const onRefresh = useCallback(() => { fetchHangouts(); }, [fetchHangouts]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>WELCOME BACK</Text>
        <Text style={styles.headerTitle}>Dad Time 🍺</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerEyebrow: { ...Typography.label, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, fontSize: 9 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
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
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: TAB_BAR_CONTENT_HEIGHT + 24 },
  emptyContent: { flex: 1, paddingHorizontal: Spacing.md },
  separator: { height: Spacing.sm },
});
