import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types/database';

export type FriendRequest = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
  sender?: User;
  receiver?: User;
};

export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<User[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Accepted friends: rows where I am user_id
      const { data: friendRows } = await supabase
        .from('friends')
        .select('friend_id, users!friend_id(id, display_name, avatar_url, push_token, created_at)')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      setFriends(
        (friendRows ?? [])
          .map((r: any) => r.users)
          .filter(Boolean) as User[]
      );

      // Incoming: they sent to me, still pending
      const { data: inRows } = await supabase
        .from('friends')
        .select('id, user_id, friend_id, status, created_at, sender:users!user_id(id, display_name, avatar_url, push_token, created_at)')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      // Supabase returns joined rows as arrays; flatten to single objects
      setIncoming(
        (inRows ?? []).map((r: any) => ({
          ...r,
          sender: Array.isArray(r.sender) ? r.sender[0] ?? null : r.sender,
        })) as FriendRequest[]
      );

      // Outgoing: I sent, still pending
      const { data: outRows } = await supabase
        .from('friends')
        .select('id, user_id, friend_id, status, created_at, receiver:users!friend_id(id, display_name, avatar_url, push_token, created_at)')
        .eq('user_id', userId)
        .eq('status', 'pending');

      setOutgoing(
        (outRows ?? []).map((r: any) => ({
          ...r,
          receiver: Array.isArray(r.receiver) ? r.receiver[0] ?? null : r.receiver,
        })) as FriendRequest[]
      );
    } catch (err) {
      console.error('[useFriends] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const searchUsers = async (query: string): Promise<User[]> => {
    if (!userId || query.trim().length < 2) return [];
    const { data } = await supabase
      .from('users')
      .select('id, display_name, avatar_url, push_token, created_at')
      .ilike('display_name', `%${query.trim()}%`)
      .neq('id', userId)
      .limit(20);
    return (data ?? []) as User[];
  };

  const sendRequest = async (targetId: string): Promise<void> => {
    if (!userId) return;
    const { error } = await supabase
      .from('friends')
      .insert({ user_id: userId, friend_id: targetId, status: 'pending' });
    if (error) throw error;
    await fetchFriends();
  };

  const acceptRequest = async (requestId: string, senderId: string): Promise<void> => {
    if (!userId) return;
    // Update original row to accepted
    const { error: e1 } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);
    if (e1) throw e1;

    // Insert the reverse so both sides can query .eq('user_id', me)
    const { error: e2 } = await supabase
      .from('friends')
      .upsert(
        { user_id: userId, friend_id: senderId, status: 'accepted' },
        { onConflict: 'user_id,friend_id' }
      );
    if (e2) throw e2;
    await fetchFriends();
  };

  const declineRequest = async (requestId: string): Promise<void> => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);
    if (error) throw error;
    await fetchFriends();
  };

  const removeFriend = async (friendId: string): Promise<void> => {
    if (!userId) return;
    // Delete both directions
    await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`);
    await fetchFriends();
  };

  const cancelRequest = async (requestId: string): Promise<void> => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);
    if (error) throw error;
    await fetchFriends();
  };

  return {
    friends,
    incoming,
    outgoing,
    loading,
    fetchFriends,
    searchUsers,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    cancelRequest,
  };
}
