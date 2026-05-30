import React, { useCallback } from 'react';
import { View, Text, SectionList, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useHangouts } from '../../../hooks/useHangouts';
import HangoutCard from '../../../components/HangoutCard';
import EmptyState from '../../../components/EmptyState';
import { TAB_BAR_CONTENT_HEIGHT } from '../../../components/TabBar';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { Hangout } from '../../../types/database';

type Section = { key: string; title: string; confirmed: boolean; data: Hangout[] };

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { hangouts, loading, fetchHangouts } = useHangouts(session!.user.id);

  useFocusEffect(useCallback(() => { fetchHangouts(); }, [fetchHangouts]));
  const onRefresh = useCallback(() => { fetchHangouts(); }, [fetchHangouts]);

  const confirmed = hangouts.filter(h => h.status === 'confirmed');
  const planning  = hangouts.filter(h => h.status !== 'confirmed');

  const sections: Section[] = (
    [
      confirmed.length > 0 && { key: 'confirmed', title: 'LOCKED IN', confirmed: true,  data: confirmed },
      planning.length  > 0 && { key: 'planning',  title: 'PLANNING',  confirmed: false, data: planning  },
    ] as (Section | false)[]
  ).filter(Boolean) as Section[];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>WELCOME BACK</Text>
        <Text style={styles.headerTitle}>Dad Time 🍺</Text>
      </View>

      {loading && hangouts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Getting the crew…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={h => h.id}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <HangoutCard hangout={item} currentUserId={session!.user.id} />
            </View>
          )}
          renderSectionHeader={({ section }) => (
            <SectionHeader
              title={section.title}
              count={section.data.length}
              confirmed={section.confirmed}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={hangouts.length === 0 ? styles.emptyContent : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
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

function SectionHeader({ title, count, confirmed }: { title: string; count: number; confirmed: boolean }) {
  return (
    <View style={[styles.sectionHeader, confirmed && styles.sectionHeaderConfirmed]}>
      <View style={styles.sectionTop}>
        {confirmed && <View style={styles.sectionDot} />}
        <Text style={[styles.sectionTitle, confirmed && styles.sectionTitleConfirmed]}>
          {title}
        </Text>
        <View style={[styles.countPill, confirmed && styles.countPillConfirmed]}>
          <Text style={[styles.countPillText, confirmed && styles.countPillTextConfirmed]}>
            {count}
          </Text>
        </View>
      </View>
      {/* Rule extends edge-to-edge via negative margin */}
      <View style={[styles.sectionRule, confirmed && styles.sectionRuleConfirmed]} />
    </View>
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

  // Section headers
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.bg,
  },
  sectionHeaderConfirmed: {
    paddingTop: Spacing.md, // first section sits closer to the top
  },
  sectionTop: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm,
  },
  sectionDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.primary,
  },
  sectionTitle: {
    ...Typography.label, color: Colors.textFaint, letterSpacing: 1.5, flex: 1,
  },
  sectionTitleConfirmed: { color: Colors.primary },
  countPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full,
    minWidth: 22, alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
  },
  countPillConfirmed: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  countPillText: { fontSize: 11, fontWeight: '700', color: Colors.textDim },
  countPillTextConfirmed: { color: Colors.white },
  sectionRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginHorizontal: -Spacing.md, // bleed to full width despite container padding
  },
  sectionRuleConfirmed: { backgroundColor: Colors.primaryMid },

  // List
  cardWrapper: { paddingHorizontal: Spacing.md },
  listContent: { paddingBottom: TAB_BAR_CONTENT_HEIGHT + 24 },
  emptyContent: { flex: 1, paddingHorizontal: Spacing.md },
  separator: { height: Spacing.sm },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  loadingText: { ...Typography.bodySm, color: Colors.textFaint },
});
