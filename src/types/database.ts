export type User = {
  id: string;
  name: string;
  avatar_url: string | null;
  expo_push_token: string | null;
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
  user_id: string;
  status: RsvpStatus;
  updated_at: string;
  user?: User;
};

export type RsvpStatus = 'yes' | 'maybe' | 'no';
