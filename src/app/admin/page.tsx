'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import { getTodaySessionId } from '@/lib/session';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [entries, setEntries] = useState<QueueEntry[]>([]);

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('session_id', getTodaySessionId())
      .not('status', 'in', '("done","skipped")')
      .order('created_at', { ascending: true });
    if (data) setEntries(data as QueueEntry[]);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchQueue();

    const channel = supabase
      .channel('admin-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        () => { fetchQueue(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [authenticated, fetchQueue]);

  const handlePinSubmit = async () => {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      setAuthenticated(true);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handleKeyPress = (digit: string) => {
    setPinError(false);
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        fetch('/api/admin/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: next }),
        }).then((res) => {
          if (res.ok) setAuthenticated(true);
          else { setPinError(true); setPin(''); }
        });
      }, 100);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('queue_entries').update({ status }).eq('id', id);
  };

  const recordTimestamp = async (id: string) => {
    await supabase
      .from('queue_entries')
      .update({ recorded_at: new Date().toISOString() })
      .eq('id', id);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#C9922A] mb-6">Admin</h1>
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full ${
                  pin.length > i ? 'bg-[#C9922A]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          {pinError && (
            <p className="text-[#C1440E] text-sm mb-4">Fel PIN / Wrong PIN</p>
          )}
          <div className="grid grid-cols-3 gap-3 max-w-[240px] mx-auto">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d) => (
              <button
                key={d || 'empty'}
                disabled={!d}
                onClick={() => {
                  if (d === '⌫') { setPin((p) => p.slice(0, -1)); setPinError(false); }
                  else if (d) handleKeyPress(d);
                }}
                className={`h-14 rounded-lg text-xl font-medium transition ${
                  !d
                    ? 'invisible'
                    : 'bg-white/10 hover:bg-white/20 text-white active:bg-white/30'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const waitingCount = entries.filter(
    (e) => e.status === 'registered' || e.status === 'waiting'
  ).length;

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#C9922A]">🎤 Admin</h1>
          <div className="bg-[#C9922A]/20 text-[#C9922A] px-4 py-2 rounded-full font-semibold text-sm">
            {waitingCount} väntar
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="text-center text-white/30 py-20">
            <p className="text-4xl mb-4">🎵</p>
            <p>Inga i kön just nu / No one in the queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.id}
                className={`rounded-xl p-4 border transition ${
                  e.status === 'your_turn'
                    ? 'bg-[#00C853]/10 border-[#00C853]/30'
                    : e.status === 'waiting'
                    ? 'bg-[#FFD600]/10 border-[#FFD600]/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-lg">{e.name}</span>
                      {e.video_consent && (
                        <span title="Video consent">🎥</span>
                      )}
                      {e.email && (
                        <span className="text-xs text-white/30 truncate max-w-[200px]">
                          📧 {e.email}
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-sm">
                      {e.song}
                      {e.custom_song && (
                        <span className="text-[#C9922A] ml-2">
                          + {e.custom_song}
                        </span>
                      )}
                    </p>
                    <span
                      className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                        e.status === 'your_turn'
                          ? 'bg-[#00C853]/20 text-[#00C853]'
                          : e.status === 'waiting'
                          ? 'bg-[#FFD600]/20 text-[#FFD600]'
                          : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {e.status === 'your_turn'
                        ? 'På scen'
                        : e.status === 'waiting'
                        ? 'Nästa'
                        : 'Registrerad'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(e.id, 'waiting')}
                      className="px-3 py-2 bg-[#FFD600]/20 hover:bg-[#FFD600]/30 text-[#FFD600] rounded-lg text-sm font-medium transition"
                    >
                      Nästa
                    </button>
                    <button
                      onClick={() => updateStatus(e.id, 'your_turn')}
                      className="px-3 py-2 bg-[#00C853]/20 hover:bg-[#00C853]/30 text-[#00C853] rounded-lg text-sm font-medium transition"
                    >
                      Din tur
                    </button>
                    <button
                      onClick={() => recordTimestamp(e.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        e.video_consent
                          ? 'bg-red-500/30 hover:bg-red-500/40 text-red-400 ring-2 ring-red-500/50'
                          : 'bg-white/10 hover:bg-white/15 text-white/50'
                      } ${e.recorded_at ? 'opacity-50' : ''}`}
                      title={e.recorded_at ? `Inspelad ${new Date(e.recorded_at).toLocaleTimeString('sv-SE')}` : ''}
                    >
                      ⏺ Spela in
                    </button>
                    <button
                      onClick={() => updateStatus(e.id, 'done')}
                      className="px-3 py-2 bg-[#C9922A]/20 hover:bg-[#C9922A]/30 text-[#C9922A] rounded-lg text-sm font-medium transition"
                    >
                      ✓ Klar
                    </button>
                    <button
                      onClick={() => updateStatus(e.id, 'skipped')}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/30 rounded-lg text-sm font-medium transition"
                    >
                      Hoppa över
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
