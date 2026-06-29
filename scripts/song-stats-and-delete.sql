-- Run this in your Supabase SQL Editor.
-- 1) A separate stats table so deleting history never loses song statistics.
-- 2) Atomic counter functions called from the app.
-- 3) Grants so the admin can delete queue entries and read/write stats.

create table if not exists song_stats (
  song_key      text primary key,
  song_label    text not null,
  play_count    int  not null default 0,
  request_count int  not null default 0,
  last_at       timestamptz default now()
);

-- Count a song the moment a guest registers it (a "request" / wish).
create or replace function record_song_request(p_label text)
returns void language plpgsql security definer as $$
begin
  insert into song_stats (song_key, song_label, request_count, last_at)
  values (lower(trim(p_label)), trim(p_label), 1, now())
  on conflict (song_key) do update
    set request_count = song_stats.request_count + 1,
        song_label    = excluded.song_label,
        last_at       = now();
end; $$;

-- Count a song when it is actually performed (status set to "done").
create or replace function record_song_play(p_label text)
returns void language plpgsql security definer as $$
begin
  insert into song_stats (song_key, song_label, play_count, last_at)
  values (lower(trim(p_label)), trim(p_label), 1, now())
  on conflict (song_key) do update
    set play_count = song_stats.play_count + 1,
        song_label = excluded.song_label,
        last_at    = now();
end; $$;

grant execute on function record_song_request(text) to anon, authenticated;
grant execute on function record_song_play(text)    to anon, authenticated;
grant select, insert, update on song_stats to anon, authenticated;

-- Allow the admin panel to delete history entries.
grant delete on queue_entries to anon, authenticated;

-- If you have Row Level Security ENABLED on queue_entries, also add a delete
-- policy (uncomment). If RLS is disabled, the grant above is enough.
-- create policy "allow delete" on queue_entries for delete using (true);
