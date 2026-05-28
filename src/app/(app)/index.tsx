import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../hooks/useEvents';
import EventCard from '../../components/EventCard';
import EmptyState from '../../components/EmptyState';
import { Colors, Typography, Spacing, Shadow } from '../../constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { events, loading, fetchEvents } = useEvents(session!.user.id);

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dad Time</Text>
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.signOutBtn}>Sign out</Text>
        </Pressable>
      </View>

      {loading && events.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <EventCard event={item} currentUserId={session!.user.id} />
          )}
          contentContainerStyle={events.length === 0 ? styles.emptyContent : styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Nothing on the books"
              subtitle="Create a hangout and get the crew together."
              actionLabel="Plan something"
              onAction={() => router.push('/(app)/create')}
            />
          }
        />
      )}

      <View style={styles.fab}>
        <Pressable
          style={({ pressed }) => [styles.fabBtn, pressed && styles.fabPressed]}
          onPress={() => router.push('/(app)/create')}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  signOutBtn: {
    ...Typography.bodySm,
    color: Colors.textDim,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.md,
  },
  emptyContent: {
    flex: 1,
    padding: Spacing.md,
  },
  separator: {
    height: Spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.md,
  },
  fabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    fontSize: 28,
    color: Colors.white,
    lineHeight: 32,
    fontWeight: '300',
  },
});
