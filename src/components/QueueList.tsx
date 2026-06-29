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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => { fetchQueue(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const waitingCount = entries.filter(e => e.status === 'waiting' || e.status === 'registered').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <p className="text-[12px] tracking-[0.18em] uppercase text-[#C9922A] font-semibold">Kön just nu</p>
        <span className="text-[14px] text-[#8A8276] font-medium">{waitingCount} väntar</span>
      </div>

      {entries.length > 0 ? (
        entries.map((e, i) => {
          const isOnStage = e.status === 'your_turn';
          return (
            <div
              key={e.id}
              className="rounded-[10px] px-3.5 py-3 mb-2 flex items-center gap-3"
              style={{
                background: isOnStage ? '#1E1808' : '#1C1C1C',
                border: `1px solid ${isOnStage ? '#C9922A' : '#212121'}`,
              }}
            >
              <div
                className="w-[38px] h-[38px] rounded-full shrink-0 flex items-center justify-center"
                style={{
                  background: isOnStage ? 'rgba(201,146,42,0.14)' : '#262626',
                  fontSize: isOnStage ? 17 : 15,
                  fontWeight: 700,
                  color: isOnStage ? '#C9922A' : '#9A9286',
                }}
              >
                {isOnStage ? '🎤' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[7px] flex-wrap">
                  <span style={{
                    fontSize: 16,
                    fontWeight: isOnStage ? 700 : 500,
                    color: isOnStage ? '#F5F0E8' : '#B0A899',
                  }}>
                    {e.name}
                  </span>
                  {isOnStage && (
                    <span className="text-[9px] bg-[#C9922A] text-[#1A1A1A] px-2 py-[2px] rounded-[3px] font-extrabold tracking-[0.08em] uppercase">
                      LIVE
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: 14,
                  marginTop: 3,
                  color: isOnStage ? '#C9922A' : '#857E72',
                }}>
                  {e.song}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-10 text-[#2E2E2E]">
          <div className="text-4xl mb-2.5">🎤</div>
          <div className="font-[family-name:var(--font-playfair)] text-[#3A3A3A] text-base">Kön är tom</div>
          <div className="text-[13px] text-[#2A2A2A] mt-1">Bli den första att anmäla dig!</div>
        </div>
      )}
    </div>
  );
}
