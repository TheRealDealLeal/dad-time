import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type ActivityItem = {
  id: string;
  hangoutId: string;
  hangoutTitle: string;
  optionId: string;
  optionStartsAt: string;
  optionEndsAt: string | null;
  optionLocation: string | null;
  voterUserId: string | null;
  voterName: string;
  voteValue: 'yes' | 'maybe';
  votedAt: string;
  isFriend: boolean;
  hasConflict: boolean;
};

type ConfirmedSlot = { starts_at: string; ends_at: string | null };

const TWO_HOURS = 2 * 60 * 60 * 1000;

function overlaps(a: ConfirmedSlot, bStart: string, bEnd: string | null): boolean {
  const as = new Date(a.starts_at).getTime();
  const ae = a.ends_at ? new Date(a.ends_at).getTime() : as + TWO_HOURS;
  const bs = new Date(bStart).getTime();
  const be = bEnd ? new Date(bEnd).getTime() : bs + TWO_HOURS;
  return as < be && ae > bs;
}

export function useActivity(userId: string | undefined) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. My hangouts — needed for option IDs and conflict detection
      const { data: myHangouts, error: e1 } = await supabase
        .from('hangouts')
        .select(`
          id, title, status, confirmed_option_id,
          options:hangout_options(id, starts_at, ends_at)
        `)
        .eq('created_by', userId);

      if (e1) throw e1;

      const myOptionIds = (myHangouts ?? []).flatMap(
        h => ((h as any).options ?? []).map((o: any) => o.id as string)
      );

      // Build a map of confirmed time slots for conflict checking
      const confirmedSlots: ConfirmedSlot[] = [];
      for (const h of myHangouts ?? []) {
        if ((h as any).status === 'confirmed' && (h as any).confirmed_option_id) {
          const opt = ((h as any).options ?? []).find(
            (o: any) => o.id === (h as any).confirmed_option_id
          );
          if (opt) confirmedSlots.push(opt as ConfirmedSlot);
        }
      }

      const hangoutTitleMap = new Map<string, string>(
        (myHangouts ?? []).map(h => [(h as any).id, (h as any).title])
      );

      if (myOptionIds.length === 0) {
        setItems([]);
        return;
      }

      // 2. Recent yes/maybe votes on my hangout options
      //    Include guest votes (user_id IS NULL) and other users' votes
      const { data: votes, error: e2 } = await supabase
        .from('option_votes')
        .select(`
          id, user_id, guest_name, value, updated_at, option_id,
          voter:users!user_id(id, display_name),
          option:hangout_options!option_id(id, hangout_id, starts_at, ends_at, location)
        `)
        .in('option_id', myOptionIds)
        .in('value', ['yes', 'maybe'])
        .or(`user_id.neq.${userId},user_id.is.null`)
        .order('updated_at', { ascending: false })
        .limit(60);

      if (e2) throw e2;

      // 3. My friends list — best-effort (table may not exist yet)
      const { data: friendRows } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId);

      const friendIds = new Set((friendRows ?? []).map((f: any) => f.friend_id as string));

      // 4. Assemble activity items
      const result: ActivityItem[] = (votes ?? []).map((v: any) => {
        const opt = v.option;
        const hasConflict = confirmedSlots.some(
          slot => overlaps(slot, opt.starts_at, opt.ends_at)
        );

        return {
          id: v.id,
          hangoutId: opt.hangout_id,
          hangoutTitle: hangoutTitleMap.get(opt.hangout_id) ?? 'Hangout',
          optionId: v.option_id,
          optionStartsAt: opt.starts_at,
          optionEndsAt: opt.ends_at,
          optionLocation: opt.location ?? null,
          voterUserId: v.user_id,
          voterName: v.voter?.display_name ?? v.guest_name ?? 'Someone',
          voteValue: v.value as 'yes' | 'maybe',
          votedAt: v.updated_at,
          isFriend: v.user_id ? friendIds.has(v.user_id) : false,
          hasConflict,
        };
      });

      setItems(result);
    } catch (err) {
      console.error('[useActivity] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return { items, loading, fetchActivity };
}
