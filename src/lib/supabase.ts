import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
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
  session_id: string;
};
