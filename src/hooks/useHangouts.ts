import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Hangout, HangoutOption, VoteValue } from '../types/database';

const OPTION_QUERY = `
  *,
  suggester:users!suggested_by(id, display_name, avatar_url),
  votes:option_votes(*)
`;

const HANGOUT_QUERY = `
  *,
  creator:users!created_by(id, display_name, avatar_url),
  options:hangout_options!hangout_id(${OPTION_QUERY})
`;

function hangoutSortKey(h: Hangout): number {
  if (h.status === 'confirmed' && h.confirmed_option_id) {
    const opt = (h.options ?? []).find(o => o.id === h.confirmed_option_id);
    if (opt) return new Date(opt.starts_at).getTime();
  }
  const opts = h.options ?? [];
  if (opts.length > 0) {
    return Math.min(...opts.map(o => new Date(o.starts_at).getTime()));
  }
  return Infinity; // no options yet — handled separately in sort
}

export function useHangouts(userId: string | undefined) {
  const [hangouts, setHangouts] = useState<Hangout[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHangouts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: created, error: e1 } = await supabase
        .from('hangouts')
        .select(HANGOUT_QUERY)
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      const { data: voted, error: e2 } = await supabase
        .from('option_votes')
        .select(`option:hangout_options!inner(hangout:hangouts!inner(${HANGOUT_QUERY}))`)
        .eq('user_id', userId);

      if (e1 || e2) throw e1 || e2;

      const votedHangouts = (voted ?? [])
        .map((v: any) => v.option?.hangout)
        .filter(Boolean);

      const all = [...(created ?? []), ...votedHangouts];
      const seen = new Set<string>();
      const unique = all.filter(h => {
        if (seen.has(h.id)) return false;
        seen.add(h.id);
        return true;
      });

      unique.sort((a, b) => {
        const aKey = hangoutSortKey(a);
        const bKey = hangoutSortKey(b);
        // No-option hangouts sink to the bottom, sorted newest-first among themselves
        if (aKey === Infinity && bKey === Infinity) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (aKey === Infinity) return 1;
        if (bKey === Infinity) return -1;
        return aKey - bKey; // ascending: soonest hangout first
      });
      setHangouts(unique);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load hangouts');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createHangout = async (data: {
    title: string;
    note?: string;
    location?: string;
  }): Promise<Hangout | null> => {
    if (!userId) return null;
    const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data: hangout, error } = await supabase
      .from('hangouts')
      .insert({
        title: data.title.trim(),
        note: data.note?.trim() || null,
        location: data.location?.trim() || null,
        created_by: userId,
        invite_code,
      })
      .select(HANGOUT_QUERY)
      .single();

    if (error) throw error;
    await fetchHangouts();
    return hangout;
  };

  const addOption = async (hangoutId: string, option: {
    starts_at: Date;
    ends_at?: Date;
    location?: string;
    note?: string;
  }): Promise<HangoutOption | null> => {
    const { data, error } = await supabase
      .from('hangout_options')
      .insert({
        hangout_id: hangoutId,
        suggested_by: userId || null,
        starts_at: option.starts_at.toISOString(),
        ends_at: option.ends_at?.toISOString() || null,
        location: option.location?.trim() || null,
        note: option.note?.trim() || null,
      })
      .select(OPTION_QUERY)
      .single();

    if (error) throw error;
    return data;
  };

  const castVote = async (optionId: string, value: VoteValue): Promise<void> => {
    if (!userId) return;
    const { error } = await supabase
      .from('option_votes')
      .upsert(
        { option_id: optionId, user_id: userId, value, updated_at: new Date().toISOString() },
        { onConflict: 'option_id,user_id' }
      );
    if (error) throw error;
  };

  const castGuestVote = async (
    optionId: string,
    guestName: string,
    value: VoteValue
  ): Promise<void> => {
    const { error } = await supabase
      .from('option_votes')
      .insert({ option_id: optionId, guest_name: guestName, value });
    if (error) throw error;
  };

  const confirmOption = async (hangoutId: string, optionId: string): Promise<void> => {
    const { error } = await supabase
      .from('hangouts')
      .update({ status: 'confirmed', confirmed_option_id: optionId })
      .eq('id', hangoutId)
      .eq('created_by', userId);
    if (error) throw error;
  };

  const deleteHangout = async (hangoutId: string): Promise<void> => {
    const { error } = await supabase
      .from('hangouts')
      .delete()
      .eq('id', hangoutId)
      .eq('created_by', userId);
    if (error) throw error;
  };

  const fetchHangoutByInviteCode = async (code: string): Promise<Hangout | null> => {
    const { data, error } = await supabase
      .from('hangouts')
      .select(HANGOUT_QUERY)
      .eq('invite_code', code)
      .single();
    if (error) return null;
    return data;
  };

  return {
    hangouts,
    loading,
    error,
    fetchHangouts,
    createHangout,
    addOption,
    castVote,
    castGuestVote,
    confirmOption,
    deleteHangout,
    fetchHangoutByInviteCode,
  };
}
