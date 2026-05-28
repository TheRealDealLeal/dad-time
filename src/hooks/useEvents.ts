import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Event, RsvpStatus } from '../types/database';

const EVENT_QUERY = `
  *,
  creator:users!events_created_by_fkey(id, name, avatar_url),
  rsvps(*, user:users(id, name, avatar_url))
`;

export function useEvents(userId: string | undefined) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // Events created by this user OR user has an RSVP
      const { data: created, error: e1 } = await supabase
        .from('events')
        .select(EVENT_QUERY)
        .eq('created_by', userId)
        .gte('date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // include events from last 24h
        .order('date', { ascending: true });

      const { data: rsvped, error: e2 } = await supabase
        .from('rsvps')
        .select(`event:events(${EVENT_QUERY})`)
        .eq('user_id', userId);

      if (e1 || e2) throw e1 || e2;

      const rsvpedEvents = (rsvped ?? [])
        .map((r: any) => r.event)
        .filter(Boolean)
        .filter((e: Event) => new Date(e.date) >= new Date(Date.now() - 24 * 60 * 60 * 1000));

      // Merge and deduplicate
      const all = [...(created ?? []), ...rsvpedEvents];
      const seen = new Set<string>();
      const unique = all.filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });

      unique.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setEvents(unique);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createEvent = async (data: {
    title: string;
    date: Date;
    location?: string;
    note?: string;
  }): Promise<Event | null> => {
    if (!userId) return null;
    const { data: event, error } = await supabase
      .from('events')
      .insert({
        title: data.title.trim(),
        date: data.date.toISOString(),
        location: data.location?.trim() || null,
        note: data.note?.trim() || null,
        created_by: userId,
      })
      .select(EVENT_QUERY)
      .single();

    if (error) throw error;

    // Auto-RSVP creator as 'yes'
    await supabase.from('rsvps').insert({
      event_id: event.id,
      user_id: userId,
      status: 'yes',
    });

    await fetchEvents();
    return event;
  };

  const upsertRsvp = async (eventId: string, status: RsvpStatus): Promise<void> => {
    if (!userId) return;

    // Optimistic update
    setEvents(prev =>
      prev.map(e => {
        if (e.id !== eventId) return e;
        const existingRsvps = (e.rsvps ?? []).filter(r => r.user_id !== userId);
        return {
          ...e,
          rsvps: [...existingRsvps, {
            id: 'optimistic',
            event_id: eventId,
            user_id: userId,
            status,
            updated_at: new Date().toISOString(),
          }],
        };
      })
    );

    const { error } = await supabase.from('rsvps').upsert(
      { event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() },
      { onConflict: 'event_id,user_id' }
    );

    if (error) {
      // Revert on failure
      await fetchEvents();
      throw error;
    }
  };

  const fetchEventByInviteCode = async (code: string): Promise<Event | null> => {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_QUERY)
      .eq('invite_code', code)
      .single();
    if (error) return null;
    return data;
  };

  return {
    events,
    loading,
    error,
    fetchEvents,
    createEvent,
    upsertRsvp,
    fetchEventByInviteCode,
  };
}
