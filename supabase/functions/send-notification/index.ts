// Deploy with: supabase functions deploy send-notification
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPush(messages: object[]) {
  if (messages.length === 0) return;
  await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let hangoutId: string;
  let event: string;

  try {
    ({ hangoutId, event } = await req.json());
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!hangoutId || !event) {
    return new Response('Missing hangoutId or event', { status: 400 });
  }

  const { data: hangout } = await supabase
    .from('hangouts')
    .select('id, title, created_by')
    .eq('id', hangoutId)
    .single();

  if (!hangout) {
    return new Response('Hangout not found', { status: 404 });
  }

  const messages: object[] = [];

  if (event === 'vote') {
    // Notify the hangout creator that someone voted
    const { data: creator } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', hangout.created_by)
      .single();

    if (creator?.push_token) {
      messages.push({
        to: creator.push_token,
        title: 'New vote on your hangout',
        body: `Someone voted on times for "${hangout.title}"`,
        data: { hangoutId },
        sound: 'default',
      });
    }
  } else if (event === 'confirmed') {
    // Notify everyone who voted (except the creator — they already know)
    const { data: options } = await supabase
      .from('hangout_options')
      .select('id')
      .eq('hangout_id', hangoutId);

    const optionIds = (options ?? []).map((o: any) => o.id as string);

    if (optionIds.length > 0) {
      const { data: votes } = await supabase
        .from('option_votes')
        .select('user_id')
        .in('option_id', optionIds)
        .not('user_id', 'is', null)
        .neq('user_id', hangout.created_by); // skip creator

      const voterIds = [...new Set((votes ?? []).map((v: any) => v.user_id as string))];

      if (voterIds.length > 0) {
        const { data: voters } = await supabase
          .from('users')
          .select('push_token')
          .in('id', voterIds)
          .not('push_token', 'is', null);

        for (const voter of voters ?? []) {
          messages.push({
            to: (voter as any).push_token,
            title: "It's happening! 🍺",
            body: `"${hangout.title}" — a time has been locked in`,
            data: { hangoutId },
            sound: 'default',
          });
        }
      }
    }
  }

  await sendExpoPush(messages);

  return new Response(
    JSON.stringify({ sent: messages.length }),
    { headers: { 'Content-Type': 'application/json' }, status: 200 },
  );
});
