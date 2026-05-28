export type User = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
};

export type Event = {
  id: string;
  title: string;
  date: string;         // ISO timestamptz
  location: string | null;
  note: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
  // joined on fetch
  creator?: User;
  rsvps?: Rsvp[];
};

export type Rsvp = {
  id: string;
  event_id: string;
  user_id: string | null;   // null for guest RSVPs
  guest_name: string | null;
  status: RsvpStatus;
  updated_at: string;
  user?: User;
};

export type RsvpStatus = 'yes' | 'maybe' | 'no';
