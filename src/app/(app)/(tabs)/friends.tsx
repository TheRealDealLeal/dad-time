import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useFriends, FriendRequest } from '../../../hooks/useFriends';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { User } from '../../../types/database';

type Tab = 'friends' | 'requests' | 'search';

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, size = 44 }: { name: string | null; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const {
    friends, incoming, outgoing, loading,
    fetchFriends, searchUsers, sendRequest,
    acceptRequest, declineRequest, removeFriend, cancelRequest,
  } = useFriends(userId);

  const [tab, setTab] = useState<Tab>('friends');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => { fetchFriends(); }, [fetchFriends]));

  function handleQueryChange(text: string) {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (text.trim().length < 2) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchUsers(text);
        // Exclude already-friends and pending requests
        const friendIds = new Set(friends.map(f => f.id));
        const pendingIds = new Set([
          ...outgoing.map(r => r.friend_id),
          ...incoming.map(r => r.user_id),
        ]);
        setResults(data.filter(u => !friendIds.has(u.id) && !pendingIds.has(u.id)));
      } finally {
        setSearching(false);
      }
    }, 350);
  }

  async function handleSendRequest(targetId: string, name: string | null) {
    setActioningId(targetId);
    try {
      await sendRequest(targetId);
      setResults(prev => prev.filter(u => u.id !== targetId));
    } catch {
      Alert.alert('Oops', `Couldn't send request to ${name ?? 'that user'}.`);
    } finally {
      setActioningId(null);
    }
  }

  async function handleAccept(req: FriendRequest) {
    setActioningId(req.id);
    try {
      await acceptRequest(req.id, req.user_id);
    } catch {
      Alert.alert('Oops', 'Could not accept request.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleDecline(req: FriendRequest) {
    setActioningId(req.id);
    try {
      await declineRequest(req.id);
    } catch {
      Alert.alert('Oops', 'Could not decline request.');
    } finally {
      setActioningId(null);
    }
  }

  async function handleRemoveFriend(friend: User) {
    Alert.alert(
      `Remove ${friend.display_name ?? 'friend'}?`,
      'They will be removed from your crew.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActioningId(friend.id);
            try { await removeFriend(friend.id); }
            catch { Alert.alert('Oops', 'Could not remove friend.'); }
            finally { setActioningId(null); }
          },
        },
      ]
    );
  }

  async function handleCancelRequest(req: FriendRequest) {
    setActioningId(req.id);
    try { await cancelRequest(req.id); }
    catch { Alert.alert('Oops', 'Could not cancel request.'); }
    finally { setActioningId(null); }
  }

  const requestCount = incoming.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Crew</Text>
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['friends', 'requests', 'search'] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'friends' ? `Friends${friends.length > 0 ? ` (${friends.length})` : ''}` :
               t === 'requests' ? `Requests${requestCount > 0 ? ` (${requestCount})` : ''}` :
               'Find People'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Friends tab */}
      {tab === 'friends' && (
        loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.primary} size="large" />
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>👋</Text>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptySub}>Search for other dads to add them to your crew.</Text>
            <Pressable
              style={styles.emptyAction}
              onPress={() => setTab('search')}
              accessibilityRole="button"
            >
              <Text style={styles.emptyActionText}>Find People →</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Avatar name={item.display_name} />
                <Text style={styles.rowName} numberOfLines={1}>{item.display_name ?? 'Unknown'}</Text>
                <Pressable
                  style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.6 }]}
                  onPress={() => handleRemoveFriend(item)}
                  disabled={actioningId === item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.display_name ?? 'friend'}`}
                >
                  {actioningId === item.id
                    ? <ActivityIndicator size="small" color={Colors.textFaint} />
                    : <Text style={styles.ghostBtnText}>Remove</Text>
                  }
                </Pressable>
              </View>
            )}
          />
        )
      )}

      {/* Requests tab */}
      {tab === 'requests' && (
        <FlatList
          data={[
            ...incoming.map(r => ({ ...r, kind: 'incoming' as const })),
            ...outgoing.map(r => ({ ...r, kind: 'outgoing' as const })),
          ]}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySub}>Find people to add them to your crew.</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const name = item.kind === 'incoming'
              ? (item.sender as User | undefined)?.display_name
              : (item.receiver as User | undefined)?.display_name;
            const isActioning = actioningId === item.id;

            return (
              <View style={styles.row}>
                <Avatar name={name ?? null} />
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>{name ?? 'Unknown'}</Text>
                  <Text style={styles.rowSub}>
                    {item.kind === 'incoming' ? 'Wants to join your crew' : 'Request sent'}
                  </Text>
                </View>
                {item.kind === 'incoming' ? (
                  <View style={styles.requestActions}>
                    <Pressable
                      style={({ pressed }) => [styles.acceptBtn, pressed && { opacity: 0.75 }]}
                      onPress={() => handleAccept(item)}
                      disabled={isActioning}
                      accessibilityRole="button"
                      accessibilityLabel={`Accept ${name ?? 'request'}`}
                    >
                      {isActioning
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Text style={styles.acceptBtnText}>Accept</Text>
                      }
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.declineBtn, pressed && { opacity: 0.6 }]}
                      onPress={() => handleDecline(item)}
                      disabled={isActioning}
                      accessibilityRole="button"
                      accessibilityLabel={`Decline ${name ?? 'request'}`}
                    >
                      <Text style={styles.declineBtnText}>✕</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.ghostBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => handleCancelRequest(item)}
                    disabled={isActioning}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel request"
                  >
                    {isActioning
                      ? <ActivityIndicator size="small" color={Colors.textFaint} />
                      : <Text style={styles.ghostBtnText}>Cancel</Text>
                    }
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name…"
              placeholderTextColor={Colors.textFaint}
              value={query}
              onChangeText={handleQueryChange}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Search users by name"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => { setQuery(''); setResults([]); }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Text style={styles.clearBtn}>✕</Text>
              </Pressable>
            )}
          </View>

          {searching ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : query.trim().length >= 2 && results.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>No one found</Text>
              <Text style={styles.emptySub}>Try a different name.</Text>
            </View>
          ) : query.trim().length < 2 ? (
            <View style={styles.center}>
              <Text style={styles.emptySub}>Type at least 2 characters to search.</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isActioning = actioningId === item.id;
                return (
                  <View style={styles.row}>
                    <Avatar name={item.display_name} />
                    <Text style={styles.rowName} numberOfLines={1}>{item.display_name ?? 'Unknown'}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.75 }]}
                      onPress={() => handleSendRequest(item.id, item.display_name)}
                      disabled={isActioning}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${item.display_name ?? 'user'}`}
                    >
                      {isActioning
                        ? <ActivityIndicator size="small" color={Colors.white} />
                        : <Text style={styles.addBtnText}>+ Add</Text>
                      }
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </View>
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
  headerTitle: { fontSize: 26, fontWeight: '900', color: Colors.white, letterSpacing: -0.5 },

  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1.5, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, paddingVertical: Spacing.sm + 2, alignItems: 'center',
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: { ...Typography.caption, color: Colors.textFaint, fontWeight: '600' },
  tabTextActive: { color: Colors.primary, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.sm },
  emptyTitle: { ...Typography.titleMd, color: Colors.text, textAlign: 'center' },
  emptySub: { ...Typography.bodyMd, color: Colors.textFaint, textAlign: 'center' },
  emptyAction: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  emptyActionText: { ...Typography.titleSm, color: Colors.white },

  listContent: { padding: Spacing.md, gap: 0 },
  separator: { height: 1, backgroundColor: Colors.border },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm + 4, backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
  },
  rowBody: { flex: 1, gap: 2 },
  rowName: { ...Typography.titleSm, color: Colors.text, flex: 1 },
  rowSub: { ...Typography.bodySm, color: Colors.textFaint },

  avatar: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  avatarText: { fontWeight: '900', color: Colors.primary },

  requestActions: { flexDirection: 'row', gap: Spacing.xs },

  acceptBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    minWidth: 72, alignItems: 'center', minHeight: 36, justifyContent: 'center',
  },
  acceptBtnText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },

  declineBtn: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    borderWidth: 1.5, borderColor: Colors.border,
    minWidth: 36, alignItems: 'center', minHeight: 36, justifyContent: 'center',
  },
  declineBtnText: { ...Typography.caption, color: Colors.textFaint },

  ghostBtn: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.border,
    minWidth: 68, alignItems: 'center', minHeight: 36, justifyContent: 'center',
  },
  ghostBtnText: { ...Typography.caption, color: Colors.textDim, fontWeight: '600' },

  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    minWidth: 68, alignItems: 'center', minHeight: 36, justifyContent: 'center',
  },
  addBtnText: { ...Typography.caption, color: Colors.white, fontWeight: '700' },

  searchContainer: { flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    margin: Spacing.md, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.border, minHeight: 48,
  },
  searchIcon: { fontSize: 16 },
  searchInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  clearBtn: { fontSize: 14, color: Colors.textFaint, padding: 4 },
});
