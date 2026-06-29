import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key'
);

export type QueueEntry = {
  id: string;
  created_at: string;
  name: string;
  song: string;
  custom_song: string | null;
  email: string | null;
  video_consent: boolean;
  status: 'registered' | 'waiting' | 'your_turn' | 'done' | 'skipped';
  recorded_at: string | null;
  video_requested: boolean;
  session_id: string;
  push_subscription: string | null;
};
