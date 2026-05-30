import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useActivity, ActivityItem } from '../../../hooks/useActivity';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { TAB_BAR_CONTENT_HEIGHT } from '../../../components/TabBar';

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ActivityScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { items, loading, fetchActivity } = useActivity(session!.user.id);

  useFocusEffect(useCallback(() => { fetchActivity(); }, [fetchActivity]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ActivityCard
              item={item}
              onPress={() => router.push(`/(app)/hangout/${item.hangoutId}` as any)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.gap} />}
          contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyActivity />}
        />
      )}
    </SafeAreaView>
  );
}

function ActivityCard({ item, onPress }: { item: ActivityItem; onPress: () => void }) {
  const d      = new Date(item.optionStartsAt);
  const isYes  = item.voteValue === 'yes';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.voterName} is ${isYes ? 'free' : 'maybe free'} for ${item.hangoutTitle}`}
    >
      {/* Left colour stripe: green = free, amber = maybe */}
      <View style={[styles.stripe, isYes ? styles.stripeYes : styles.stripeMaybe]} />

      <View style={styles.body}>
        {/* Row 1: voter name + badges */}
        <View style={styles.topRow}>
          <Text style={styles.voterName} numberOfLines={1}>{item.voterName}</Text>
          <View style={styles.badges}>
            {item.isFriend && (
              <View style={styles.friendBadge}>
                <Text style={styles.badgeText}>FRIEND</Text>
              </View>
            )}
            {item.hasConflict && (
              <View style={styles.conflictBadge}>
                <Text style={[styles.badgeText, styles.conflictText]}>⚠︎ CONFLICT</Text>
              </View>
            )}
          </View>
        </View>

        {/* Row 2: availability label */}
        <Text style={[styles.voteLabel, isYes ? styles.voteLabelYes : styles.voteLabelMaybe]}>
          {isYes ? 'Is free' : 'Might be free'}
        </Text>

        {/* Row 3: hangout title */}
        <Text style={styles.hangoutTitle} numberOfLines={1}>{item.hangoutTitle}</Text>

        {/* Row 4: date + time */}
        <Text style={styles.slot}>
          {DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()}
          {'  ·  '}
          {fmt(item.optionStartsAt)}
          {item.optionEndsAt ? ` – ${fmt(item.optionEndsAt)}` : ''}
        </Text>

        {item.optionLocation ? (
          <Text style={styles.location} numberOfLines={1}>📍 {item.optionLocation}</Text>
        ) : null}

        {/* Conflict detail */}
        {item.hasConflict && (
          <View style={styles.conflictDetail}>
            <Text style={styles.conflictDetailText}>
              This time overlaps with a confirmed hangout on your calendar.
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text style={styles.timeAgo}>{relativeTime(item.votedAt)}</Text>
      </View>
    </Pressable>
  );
}

function EmptyActivity() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>All quiet</Text>
      <Text style={styles.emptySub}>
        When someone votes on your hangouts you'll see them here, along with any time conflicts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    backgroundColor: Colors.primary,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: { padding: Spacing.md, paddingBottom: TAB_BAR_CONTENT_HEIGHT + 24 },
  emptyContent: { flex: 1, padding: Spacing.md },
  gap: { height: Spacing.sm },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  emptyTitle: { ...Typography.titleMd, color: Colors.textDim },
  emptySub: { ...Typography.bodyMd, color: Colors.textFaint, textAlign: 'center', maxWidth: 280 },

  // Card
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    flexDirection: 'row', overflow: 'hidden', ...Shadow.sm,
  },

  // Left stripe
  stripe: { width: 5 },
  stripeYes:   { backgroundColor: Colors.yes },
  stripeMaybe: { backgroundColor: Colors.maybe },

  body: { flex: 1, padding: Spacing.md, gap: 4 },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  voterName: { ...Typography.titleSm, color: Colors.text, flex: 1 },

  badges: { flexDirection: 'row', gap: Spacing.xs, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  friendBadge: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.xs, borderWidth: 1, borderColor: Colors.primaryMid,
  },
  conflictBadge: {
    backgroundColor: Colors.maybeBg, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Radius.xs, borderWidth: 1, borderColor: Colors.maybe,
  },
  badgeText: { ...Typography.label, fontSize: 9, color: Colors.primaryMid },
  conflictText: { color: Colors.maybe },

  voteLabel: { ...Typography.label, fontSize: 10, letterSpacing: 1, marginTop: 2 },
  voteLabelYes:   { color: Colors.yes },
  voteLabelMaybe: { color: Colors.maybe },

  hangoutTitle: { ...Typography.bodyMd, color: Colors.text, fontWeight: '600', marginTop: 4 },
  slot:     { ...Typography.bodySm, color: Colors.textDim },
  location: { ...Typography.bodySm, color: Colors.textFaint },

  conflictDetail: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.maybeBg,
    borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.maybe,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  conflictDetailText: { ...Typography.caption, color: Colors.maybe },

  timeAgo: { ...Typography.caption, color: Colors.textFaint, marginTop: Spacing.xs },
});
