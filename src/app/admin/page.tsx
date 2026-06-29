'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import { getTodaySessionId } from '@/lib/session';

type SongStat = {
  song_key: string;
  song_label: string;
  play_count: number;
  request_count: number;
  last_at: string | null;
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [history, setHistory] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<SongStat[]>([]);
  const [tab, setTab] = useState<'queue' | 'history' | 'stats'>('queue');
  const [statSort, setStatSort] = useState<'request' | 'play'>('request');

  const fetchStats = useCallback(async () => {
    const { data } = await supabase
      .from('song_stats')
      .select('*')
      .order('request_count', { ascending: false })
      .limit(200);
    if (data) setStats(data as SongStat[]);
  }, []);

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('session_id', getTodaySessionId())
      .not('status', 'in', '("done","skipped")')
      .order('created_at', { ascending: true });
    if (data) setEntries(data as QueueEntry[]);
  }, []);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('queue_entries')
      .select('*')
      .in('status', ['done', 'skipped'])
      .order('session_id', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setHistory(data as QueueEntry[]);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchQueue();
    fetchHistory();
    fetchStats();
    const channel = supabase
      .channel('admin-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'queue_entries' }, () => { fetchQueue(); fetchHistory(); fetchStats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authenticated, fetchQueue, fetchHistory, fetchStats]);

  const pressPin = (digit: string) => {
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
    if (status === 'waiting' || status === 'your_turn') {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: id, status }),
      }).catch(() => {});
    }
  };

  const recordTimestamp = async (id: string) => {
    await supabase.from('queue_entries').update({ recorded_at: new Date().toISOString() }).eq('id', id);
  };

  const markDone = async (e: QueueEntry) => {
    await updateStatus(e.id, 'done');
    if (e.song && e.song !== 'Valfri / Any song') {
      await supabase.rpc('record_song_play', { p_label: e.song });
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Ta bort den här artisten ur historiken? Statistiken påverkas inte.')) return;
    await supabase.from('queue_entries').delete().eq('id', id);
    fetchHistory();
  };

  const clearHistory = async () => {
    if (!confirm('Rensa HELA historiken? Detta tar bort alla avslutade och hoppade artister. Statistiken över låtar behålls.')) return;
    if (!confirm('Är du helt säker? Detta går inte att ångra.')) return;
    await supabase.from('queue_entries').delete().in('status', ['done', 'skipped']);
    fetchHistory();
  };

  const copyStats = () => {
    const sorted = [...stats].sort((a, b) =>
      statSort === 'play' ? b.play_count - a.play_count : b.request_count - a.request_count);
    const lines = sorted.map((s) => `${s.song_label} (önskad ${s.request_count}× / spelad ${s.play_count}×)`);
    navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
  };

  // PIN SCREEN
  if (!authenticated) {
    const numpadKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-[#1A1A1A] relative max-w-[480px] md:max-w-[540px] mx-auto">
        <a href="/" className="absolute top-5 left-4 bg-transparent border border-[#222] text-[#3A3A3A] text-xs px-[13px] py-[7px] rounded-[7px] tracking-[0.03em]">
          ← Gäst
        </a>

        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#333] mb-3 font-medium">Admin-panel</p>
          <img src="/assets/logo-neon-dark.png" alt="DC's Live Music" className="h-[52px] w-[52px] object-contain rounded-lg mb-2.5 mx-auto" />
          <div className="font-[family-name:var(--font-playfair)] font-black text-[28px] tracking-[0.12em] uppercase text-[#C9922A]">
            OPEN STAGE
          </div>
          <div className="font-[family-name:var(--font-dancing)] font-bold text-[22px] text-[#C1440E] mt-0.5">
            with Demir
          </div>
        </div>

        {/* PIN dots */}
        <div className="flex items-center gap-5 mb-7">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-[18px] h-[18px] rounded-full transition-all duration-150"
              style={{
                background: i < pin.length ? '#C9922A' : 'transparent',
                border: `2px solid ${i < pin.length ? '#C9922A' : '#2E2E2E'}`,
              }}
            />
          ))}
        </div>

        {pinError && (
          <p className="text-[#C1440E] text-[13px] mb-4 tracking-[0.02em]" style={{ animation: 'slide-down 0.3s ease' }}>
            Fel PIN-kod. Försök igen.
          </p>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2.5 w-[264px] mb-3.5">
          {numpadKeys.map((d, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (d === '⌫') { setPin(p => p.slice(0, -1)); setPinError(false); }
                else if (d) pressPin(d);
              }}
              disabled={!d}
              className="w-full rounded-xl transition"
              style={{
                background: d === '' ? 'transparent' : '#222',
                border: d === '' ? 'none' : '1px solid #2A2A2A',
                padding: '18px 0',
                fontSize: d === '⌫' ? 20 : 28,
                fontWeight: 500,
                lineHeight: 1,
                color: d === '⌫' ? '#444' : '#F5F0E8',
                cursor: d === '' ? 'default' : 'pointer',
                fontFamily: d === '⌫' ? "'Inter', sans-serif" : 'var(--font-playfair)',
                pointerEvents: d === '' ? 'none' : 'auto',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ADMIN QUEUE
  const waitingCount = entries.filter(e => e.status === 'registered' || e.status === 'waiting').length;

  return (
    <div className="min-h-screen bg-[#1A1A1A] w-full max-w-[1500px] mx-auto">
      {/* Admin header */}
      <header className="sticky top-0 z-50 backdrop-blur-[18px] border-b border-[#1E1E1E] px-4 md:px-6 py-3 md:py-4"
        style={{ background: 'rgba(14,14,14,0.98)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[7px]">
            <div className="w-[9px] h-[9px] rounded-full bg-[#00C853]"
              style={{ boxShadow: '0 0 7px rgba(0,200,83,0.6)', animation: 'pulse-dot 2.5s ease-in-out infinite' }} />
            <span className="text-[11px] text-[#3A3A3A] font-medium tracking-[0.06em]">Live</span>
          </div>
          <div className="text-center">
            <div className="font-[family-name:var(--font-playfair)] font-black text-[17px] md:text-xl tracking-[0.12em] uppercase text-[#C9922A] leading-[1.1]">
              OPEN STAGE
            </div>
            <div className="font-[family-name:var(--font-dancing)] font-bold text-xs md:text-sm text-[#C1440E]">with Demir</div>
            <div className="text-[9px] text-[#3A3A3A] tracking-[0.14em] uppercase font-semibold">Admin</div>
          </div>
          <div className="bg-[rgba(201,146,42,0.09)] border border-[rgba(201,146,42,0.22)] rounded-[20px] px-[13px] py-1">
            <span className="text-[14px] md:text-[18px] text-[#C9922A] font-bold">{waitingCount} väntar</span>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex px-3.5 md:px-6 pt-3.5 md:pt-5 gap-2 md:gap-3">
        <button
          onClick={() => setTab('queue')}
          className="flex-1 py-3 md:py-4 rounded-lg text-[15px] md:text-[18px] font-bold tracking-[0.04em] transition-all"
          style={{
            background: tab === 'queue' ? 'rgba(201,146,42,0.12)' : 'transparent',
            color: tab === 'queue' ? '#C9922A' : '#3A3A3A',
            border: `1px solid ${tab === 'queue' ? 'rgba(201,146,42,0.28)' : '#222'}`,
          }}
        >
          🎤 Kö ({entries.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className="flex-1 py-3 md:py-4 rounded-lg text-[15px] md:text-[18px] font-bold tracking-[0.04em] transition-all"
          style={{
            background: tab === 'history' ? 'rgba(201,146,42,0.12)' : 'transparent',
            color: tab === 'history' ? '#C9922A' : '#3A3A3A',
            border: `1px solid ${tab === 'history' ? 'rgba(201,146,42,0.28)' : '#222'}`,
          }}
        >
          📋 Historik ({history.length})
        </button>
        <button
          onClick={() => setTab('stats')}
          className="flex-1 py-3 md:py-4 rounded-lg text-[15px] md:text-[18px] font-bold tracking-[0.04em] transition-all"
          style={{
            background: tab === 'stats' ? 'rgba(201,146,42,0.12)' : 'transparent',
            color: tab === 'stats' ? '#C9922A' : '#3A3A3A',
            border: `1px solid ${tab === 'stats' ? 'rgba(201,146,42,0.28)' : '#222'}`,
          }}
        >
          📊 Statistik
        </button>
      </div>

      {/* Queue cards */}
      {tab === 'queue' && <div className="px-3.5 md:px-6 pt-[18px] md:pt-6 pb-[52px]">
        {entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 items-start">
          {entries.map((e) => {
            const isOnStage = e.status === 'your_turn';
            const isWaiting = e.status === 'waiting';
            return (
              <div
                key={e.id}
                className="rounded-[14px] p-4 md:p-5"
                style={{
                  background: '#202020',
                  border: `1px solid ${isOnStage ? '#C9922A' : '#272727'}`,
                  boxShadow: isOnStage ? '0 0 28px rgba(201,146,42,0.1)' : 'none',
                }}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-[11px]">
                    <div className="w-11 h-11 md:w-[52px] md:h-[52px] rounded-full bg-[rgba(201,146,42,0.1)] border border-[rgba(201,146,42,0.22)] flex items-center justify-center font-[family-name:var(--font-playfair)] font-extrabold text-[#C9922A] text-base md:text-lg shrink-0">
                      {getInitials(e.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-[#F5F0E8] text-[16px] md:text-[19px] flex items-center gap-2 leading-[1.2] flex-wrap">
                        {e.name}
                        {e.video_consent ? (
                          <span className="text-[10px] bg-[rgba(0,200,83,0.12)] text-[#00C853] border border-[rgba(0,200,83,0.25)] px-1.5 py-[2px] rounded font-bold tracking-[0.04em]">🎥 OK</span>
                        ) : (
                          <span className="text-[10px] bg-[rgba(255,60,60,0.08)] text-[#FF4444] border border-[rgba(255,60,60,0.2)] px-1.5 py-[2px] rounded font-bold tracking-[0.04em]">🚫 Nej</span>
                        )}
                      </div>
                      <div className="text-[14px] md:text-[16px] text-[#8C8478] mt-1">
                        {e.song}
                        {e.custom_song && <span className="text-[#C9922A] ml-1">+ {e.custom_song}</span>}
                      </div>
                      {e.email && <div className="text-[12px] md:text-[13px] text-[#6A6358] mt-0.5">📧 {e.email}</div>}
                    </div>
                  </div>
                  <span
                    className="text-[12px] md:text-[14px] font-semibold whitespace-nowrap shrink-0 px-[11px] py-1.5 rounded-[20px]"
                    style={{
                      background: isOnStage ? 'rgba(201,146,42,0.1)' : 'rgba(255,255,255,0.03)',
                      color: isOnStage ? '#C9922A' : '#6A6358',
                      border: `1px solid ${isOnStage ? 'rgba(201,146,42,0.28)' : '#242424'}`,
                    }}
                  >
                    {isOnStage ? '🎤 På scen' : isWaiting ? '⏳ Nästa' : '📋 Registrerad'}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-[7px] md:gap-2.5 flex-wrap">
                  <button onClick={() => updateStatus(e.id, 'waiting')}
                    className="flex-1 bg-[rgba(201,146,42,0.12)] text-[#C9922A] border border-[rgba(201,146,42,0.28)] rounded-lg py-3 md:py-3.5 px-1 text-[13px] md:text-[15px] font-bold cursor-pointer min-w-[72px] whitespace-nowrap">
                    📣 Nästa
                  </button>
                  <button onClick={() => updateStatus(e.id, 'your_turn')}
                    className="flex-1 bg-[rgba(0,200,83,0.09)] text-[#00C853] border border-[rgba(0,200,83,0.22)] rounded-lg py-3 md:py-3.5 px-1 text-[13px] md:text-[15px] font-bold cursor-pointer min-w-[72px] whitespace-nowrap">
                    🎤 Din tur
                  </button>
                  <button onClick={() => recordTimestamp(e.id)}
                    className="flex-1 rounded-lg py-3 md:py-3.5 px-1 text-[13px] md:text-[15px] cursor-pointer min-w-[72px] whitespace-nowrap"
                    style={{
                      background: e.video_consent ? 'rgba(193,68,14,0.16)' : 'transparent',
                      color: e.video_consent ? '#FF6040' : '#2E2E2E',
                      border: `1px solid ${e.video_consent ? 'rgba(193,68,14,0.45)' : '#242424'}`,
                      fontWeight: e.video_consent ? 700 : 500,
                      opacity: e.recorded_at ? 0.5 : 1,
                    }}
                    title={e.recorded_at ? `Inspelad ${new Date(e.recorded_at).toLocaleTimeString('sv-SE')}` : ''}
                  >
                    ⏺ Spela in
                  </button>
                  <button onClick={() => markDone(e)}
                    className="flex-1 bg-[#1C1C1C] text-[#9A9286] border border-[#2E2E2E] rounded-lg py-3 md:py-3.5 px-1 text-[13px] md:text-[15px] font-medium cursor-pointer min-w-[60px] whitespace-nowrap">
                    ✓ Klar
                  </button>
                  <button onClick={() => updateStatus(e.id, 'skipped')}
                    className="bg-transparent border border-[#2A2A2A] text-[#5A5A52] rounded-lg py-3 md:py-3.5 px-3 text-[12px] md:text-[14px] cursor-pointer whitespace-nowrap">
                    Hoppa
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        ) : (
          <div className="text-center py-[72px] px-5 text-[#282828]">
            <div className="text-[52px] mb-4">🎸</div>
            <div className="font-[family-name:var(--font-playfair)] text-[#383838] text-lg mb-1.5">Kön är tom</div>
            <div className="text-[13px] text-[#262626]">Inga anmälda artister just nu</div>
          </div>
        )}

        <div className="text-center mt-7 pt-6 border-t border-[#1C1C1C]">
          <a href="/" className="bg-transparent border border-[#1E1E1E] text-[#2E2E2E] py-[9px] px-[22px] rounded-[7px] cursor-pointer text-xs tracking-[0.04em] inline-block">
            🔒 Lås admin
          </a>
        </div>
      </div>}

      {/* History view */}
      {tab === 'history' && <div className="px-3.5 md:px-6 pt-[18px] md:pt-6 pb-[52px]">
        {history.length > 0 ? (
          (() => {
            const grouped: Record<string, QueueEntry[]> = {};
            history.forEach((e) => {
              if (!grouped[e.session_id]) grouped[e.session_id] = [];
              grouped[e.session_id].push(e);
            });
            return Object.entries(grouped).map(([sessionId, items]) => (
              <div key={sessionId} className="mb-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="text-[13px] md:text-[15px] font-bold tracking-[0.1em] uppercase text-[#C9922A] whitespace-nowrap">📅 {sessionId}</div>
                  <div className="flex-1 h-px bg-[#2A2A2A]" />
                  <div className="text-[12px] text-[#6A6358] whitespace-nowrap">{items.length} st</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
                {items.map((e) => {
                  const createdTime = new Date(e.created_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Stockholm' });
                  const recordedTime = e.recorded_at
                    ? new Date(e.recorded_at).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Stockholm' })
                    : null;
                  return (
                    <div
                      key={e.id}
                      className="rounded-[14px] p-4"
                      style={{
                        background: '#202020',
                        border: `1px solid ${e.status === 'skipped' ? '#2A1A1A' : '#272727'}`,
                        opacity: e.status === 'skipped' ? 0.6 : 1,
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-[11px]">
                          <div className="w-11 h-11 md:w-[52px] md:h-[52px] rounded-full bg-[rgba(201,146,42,0.1)] border border-[rgba(201,146,42,0.22)] flex items-center justify-center font-[family-name:var(--font-playfair)] font-extrabold text-[#C9922A] text-base md:text-lg shrink-0">
                            {getInitials(e.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-[#F5F0E8] text-[16px] md:text-[18px] flex items-center gap-2 leading-[1.2] flex-wrap">
                              {e.name}
                              {e.video_consent ? (
                                <span className="text-[9px] bg-[rgba(0,200,83,0.12)] text-[#00C853] border border-[rgba(0,200,83,0.25)] px-1.5 py-[2px] rounded font-bold">🎥 OK</span>
                              ) : (
                                <span className="text-[9px] bg-[rgba(255,60,60,0.08)] text-[#FF4444] border border-[rgba(255,60,60,0.2)] px-1.5 py-[2px] rounded font-bold">🚫 Nej</span>
                              )}
                              {e.video_requested && (
                                <span className="text-[9px] bg-[rgba(100,140,255,0.1)] text-[#7B9FFF] border border-[rgba(100,140,255,0.25)] px-1.5 py-[2px] rounded font-bold">📨 Vill ha video</span>
                              )}
                            </div>
                            <div className="text-[14px] md:text-[15px] text-[#8C8478] mt-1">{e.song}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[12px] md:text-[13px] font-semibold px-[11px] py-1.5 rounded-[20px] ${
                            e.status === 'skipped'
                              ? 'bg-[rgba(255,60,60,0.08)] text-[#FF4444] border border-[rgba(255,60,60,0.15)]'
                              : 'bg-[rgba(0,200,83,0.08)] text-[#00C853] border border-[rgba(0,200,83,0.2)]'
                          }`}>
                            {e.status === 'skipped' ? '⏭ Hoppade' : '✓ Klar'}
                          </span>
                          <button onClick={() => deleteEntry(e.id)}
                            className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-[#3A2020] text-[#C0504A] cursor-pointer text-[15px] shrink-0"
                            title="Ta bort ur historiken">
                            🗑
                          </button>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="flex gap-4 mt-2.5 pt-2.5 border-t border-[#2A2A2A] flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px] text-[#555]">
                          <span className="text-[#3A3A3A]">📋</span>
                          <span>Anmäld: <span className="text-[#888] font-medium">{createdTime}</span></span>
                        </div>
                        {recordedTime && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#555]">
                            <span className="text-[#C1440E]">⏺</span>
                            <span>Inspelad: <span className="text-[#C9922A] font-medium">{recordedTime}</span></span>
                          </div>
                        )}
                        {e.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-[#555]">
                            <span>✉</span>
                            <span className="text-[#888] font-medium">{e.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ));
          })()
        ) : (
          <div className="text-center py-[72px] px-5 text-[#282828]">
            <div className="text-[52px] mb-4">📋</div>
            <div className="font-[family-name:var(--font-playfair)] text-[#383838] text-lg mb-1.5">Ingen historik än</div>
            <div className="text-[13px] text-[#262626]">Avslutade uppträdanden visas här</div>
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#241818] text-center">
            <button onClick={clearHistory}
              className="bg-[rgba(193,68,14,0.1)] border border-[rgba(193,68,14,0.4)] text-[#E0603A] py-3 px-6 rounded-xl cursor-pointer text-[14px] md:text-[16px] font-bold inline-flex items-center gap-2">
              🗑 Rensa hela historiken
            </button>
            <p className="text-[12px] text-[#5A5248] mt-2.5">Statistiken över låtar behålls även efter rensning.</p>
          </div>
        )}
      </div>}

      {/* Statistics view */}
      {tab === 'stats' && (() => {
        const sortedStats = [...stats].sort((a, b) =>
          statSort === 'play' ? b.play_count - a.play_count : b.request_count - a.request_count);
        const maxVal = Math.max(1, ...sortedStats.map((s) => (statSort === 'play' ? s.play_count : s.request_count)));
        return (
          <div className="px-3.5 md:px-6 pt-[18px] md:pt-6 pb-[52px]">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div className="flex gap-2">
                <button onClick={() => setStatSort('request')}
                  className="py-2 px-3.5 rounded-lg text-[13px] md:text-[15px] font-bold cursor-pointer"
                  style={{
                    background: statSort === 'request' ? 'rgba(201,146,42,0.14)' : 'transparent',
                    color: statSort === 'request' ? '#C9922A' : '#5A544A',
                    border: `1px solid ${statSort === 'request' ? 'rgba(201,146,42,0.3)' : '#262626'}`,
                  }}>
                  ❤️ Mest önskade
                </button>
                <button onClick={() => setStatSort('play')}
                  className="py-2 px-3.5 rounded-lg text-[13px] md:text-[15px] font-bold cursor-pointer"
                  style={{
                    background: statSort === 'play' ? 'rgba(201,146,42,0.14)' : 'transparent',
                    color: statSort === 'play' ? '#C9922A' : '#5A544A',
                    border: `1px solid ${statSort === 'play' ? 'rgba(201,146,42,0.3)' : '#262626'}`,
                  }}>
                  🎤 Mest framförda
                </button>
              </div>
              {sortedStats.length > 0 && (
                <button onClick={copyStats}
                  className="py-2 px-3.5 rounded-lg text-[13px] md:text-[15px] font-bold bg-[#202020] border border-[#2E2E2E] text-[#B0A899] cursor-pointer">
                  📋 Kopiera lista
                </button>
              )}
            </div>

            {sortedStats.length > 0 ? (
              <div className="flex flex-col gap-2">
                {sortedStats.map((s, i) => {
                  const val = statSort === 'play' ? s.play_count : s.request_count;
                  return (
                    <div key={s.song_key} className="rounded-[12px] p-3.5 md:p-4 bg-[#202020] border border-[#272727] flex items-center gap-3">
                      <div className="w-8 md:w-10 text-center font-[family-name:var(--font-playfair)] font-extrabold text-[#C9922A] text-[16px] md:text-[20px] shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] md:text-[17px] text-[#F5F0E8] font-medium truncate">{s.song_label}</div>
                        <div className="mt-2 h-2 rounded-full bg-[#171717] overflow-hidden">
                          <div className="h-full rounded-full bg-[#C9922A]" style={{ width: `${Math.round((val / maxVal) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className="text-[13px] md:text-[15px] font-bold text-[#E0789A]">❤️ {s.request_count}</span>
                        <span className="text-[13px] md:text-[15px] font-bold text-[#00C853]">🎤 {s.play_count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-[72px] px-5 text-[#282828]">
                <div className="text-[52px] mb-4">📊</div>
                <div className="font-[family-name:var(--font-playfair)] text-[#383838] text-lg mb-1.5">Ingen statistik än</div>
                <div className="text-[13px] text-[#262626]">Önskade och framförda låtar räknas här</div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
