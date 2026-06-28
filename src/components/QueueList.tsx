'use client';

import { useEffect, useState } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import { getTodaySessionId } from '@/lib/session';

export default function QueueList() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);

  const fetchQueue = async () => {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('session_id', getTodaySessionId())
      .in('status', ['registered', 'waiting', 'your_turn'])
      .order('created_at', { ascending: true });
    if (data) setEntries(data);
  };

  useEffect(() => {
    fetchQueue();

    const channel = supabase
      .channel('queue-public')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        () => { fetchQueue(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-[#C9922A] mb-3">
        Kölista / Queue
      </h2>
      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.id}
            className={`rounded-lg px-4 py-3 flex items-center justify-between ${
              e.status === 'your_turn'
                ? 'bg-[#00C853]/20 border border-[#00C853]/40'
                : 'bg-white/5 border border-white/10'
            }`}
          >
            <div>
              <span className="font-medium">{e.name}</span>
              <span className="text-white/40 mx-2">—</span>
              <span className="text-white/60">{e.song}</span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                e.status === 'your_turn'
                  ? 'bg-[#00C853]/30 text-[#00C853]'
                  : 'bg-white/10 text-white/40'
              }`}
            >
              {e.status === 'your_turn' ? 'På scen / On stage' : 'Väntar / Waiting'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
