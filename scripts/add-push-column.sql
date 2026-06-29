-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS push_subscription text;
