export type User = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
};

export type HangoutStatus = 'planning' | 'confirmed';
export type VoteValue = 'yes' | 'maybe' | 'no';

export type Hangout = {
  id: string;
  title: string;
  note: string | null;
  location: string | null;
  invite_code: string;
  created_by: string;
  status: HangoutStatus;
  confirmed_option_id: string | null;
  created_at: string;
  creator?: User;
  options?: HangoutOption[];
};

export type HangoutOption = {
  id: string;
  hangout_id: string;
  suggested_by: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  note: string | null;
  created_at: string;
  suggester?: User;
  votes?: OptionVote[];
};

export type OptionVote = {
  id: string;
  option_id: string;
  user_id: string | null;
  guest_name: string | null;
  value: VoteValue;
  updated_at: string;
};
