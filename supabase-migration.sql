create table queue_entries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default now(),
  name text not null,
  song text not null,
  custom_song text,
  email text,
  video_consent boolean default false,
  status text default 'registered',
  recorded_at timestamp with time zone,
  session_id text not null
);

alter table queue_entries enable row level security;

create policy "Allow anonymous read" on queue_entries for select using (true);
create policy "Allow anonymous insert" on queue_entries for insert with check (true);
create policy "Allow anonymous update" on queue_entries for update using (true);

alter table queue_entries replica identity full;
drop publication if exists supabase_realtime;
create publication supabase_realtime for table queue_entries;
