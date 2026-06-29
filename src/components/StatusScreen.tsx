'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';

const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || '';
const SWISH_NUMBER = process.env.NEXT_PUBLIC_SWISH_NUMBER || '';
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || '';
const YOUTUBE_URL = process.env.NEXT_PUBLIC_YOUTUBE_URL || '';

export default function StatusScreen({ entry: initial, onBack }: { entry: QueueEntry; onBack: () => void }) {
  const [entry, setEntry] = useState(initial);
  const [videoRequested, setVideoRequested] = useState(initial.video_requested);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [videoEmail, setVideoEmail] = useState('');
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* Wake Lock not supported or denied */ }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`entry-${initial.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue_entries', filter: `id=eq.${initial.id}` },
        (payload) => { setEntry(payload.new as QueueEntry); }
      )
      .subscribe();

    requestWakeLock();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      wakeLockRef.current?.release();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [initial.id, requestWakeLock]);

  const swishData = JSON.stringify({ format: 'raw', version: 1, payee: { value: SWISH_NUMBER }, message: { value: 'Open Stage tip' } });
  const swishUrl = `swish://payment?data=${encodeURIComponent(swishData)}`;

  if (entry.status === 'waiting') {
    return (
      <div className="fixed inset-0 bg-[#FFD600] flex flex-col items-center justify-center px-7 py-10 text-center z-50"
        style={{ animation: 'status-pulse 2.8s ease-in-out infinite' }}>
        <div className="text-[58px] mb-7">⏳</div>
        <p className="text-[11px] tracking-[0.2em] uppercase text-black/[0.38] mb-2.5 font-bold">Håll dig redo</p>
        <h1 className="font-[family-name:var(--font-playfair)] text-[46px] font-black text-[#1A1A1A] leading-none mb-2">
          Snart är det<br />din tur!
        </h1>
        <p className="font-[family-name:var(--font-playfair)] italic text-[22px] text-black/40 mb-[22px]">
          You&apos;re up next!
        </p>
        <p className="text-[15px] text-black/50 max-w-[280px] leading-[1.65] font-medium">
          Förbered dig — det är snart dags att ta scenen. Håll ögonen på skärmen!
        </p>
        <button onClick={onBack}
          className="mt-10 bg-black/15 border-2 border-black/20 text-black/70 rounded-xl py-3.5 px-8 text-[14px] cursor-pointer font-bold">
          🎤 Sjung en till!
        </button>
      </div>
    );
  }

  if (entry.status === 'your_turn') {
    return (
      <div className="fixed inset-0 bg-[#00C853] flex flex-col items-center justify-center px-7 py-10 text-center z-50">
        <div className="text-[84px] mb-6" style={{ animation: 'strong-pulse 1s ease-in-out infinite' }}>🎤</div>
        <p className="text-[11px] tracking-[0.24em] uppercase text-black/[0.38] mb-2.5 font-bold">Nu!</p>
        <h1 className="font-[family-name:var(--font-playfair)] text-[54px] font-black text-[#1A1A1A] leading-[0.98] mb-2"
          style={{ animation: 'strong-pulse 1s ease-in-out infinite' }}>
          Det är<br />din tur!
        </h1>
        <p className="font-[family-name:var(--font-playfair)] italic text-[26px] text-black/[0.38] mb-[22px]">
          It&apos;s your turn!
        </p>
        <p className="text-base text-black/[0.55] max-w-[240px] leading-[1.55] font-semibold">
          Gå upp på scen och visa vad du går för! 🔥
        </p>
        <button onClick={onBack}
          className="mt-10 bg-black/15 border-2 border-black/20 text-black/70 rounded-xl py-3.5 px-8 text-[14px] cursor-pointer font-bold">
          🎤 Sjung en till!
        </button>
      </div>
    );
  }

  const requestVideo = async () => {
    if (entry.email) {
      await supabase.from('queue_entries').update({ video_requested: true }).eq('id', entry.id);
      setVideoRequested(true);
    } else {
      setShowEmailInput(true);
    }
  };

  const submitVideoEmail = async () => {
    const trimmed = videoEmail.trim();
    if (!trimmed) return;
    await supabase.from('queue_entries').update({ email: trimmed, video_requested: true }).eq('id', entry.id);
    localStorage.setItem('os_email', trimmed);
    setVideoRequested(true);
    setShowEmailInput(false);
  };

  if (entry.status === 'done') {
    return (
      <div className="min-h-screen bg-[#1C1409] flex flex-col items-center justify-center px-6 py-10 text-center"
        style={{ animation: 'fade-up 0.5s ease' }}>
        <div className="text-[64px] mb-5">🌟</div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9922A] mb-2.5 font-semibold">Bravissimo!</p>
        <h1 className="font-[family-name:var(--font-playfair)] text-[34px] font-extrabold text-[#F5F0E8] leading-[1.2] mb-[7px]">
          Tack för att du vågade!
        </h1>
        <p className="font-[family-name:var(--font-playfair)] italic text-lg text-[#F5F0E8]/[0.35] mb-9">
          Thanks for being brave!
        </p>

        <div className="w-full max-w-[320px] flex flex-col gap-[11px]" style={{ animation: 'fade-up 0.5s 0.25s ease both' }}>
          {!videoRequested ? (
            showEmailInput ? (
              <div className="w-full bg-[rgba(100,140,255,0.08)] border border-[rgba(100,140,255,0.25)] rounded-xl p-4">
                <p className="text-[12px] text-[#7B9FFF] mb-3 font-medium">Ange din e-post så skickar vi videon:</p>
                <input
                  type="email"
                  value={videoEmail}
                  onChange={(e) => setVideoEmail(e.target.value)}
                  placeholder="din@email.se"
                  className="w-full px-3.5 py-3 bg-[#2A2A2A] border border-[#444] rounded-[9px] text-[#F5F0E8] text-base outline-none focus:border-[#7B9FFF] transition placeholder:text-[#666] mb-3"
                  autoFocus
                />
                <button onClick={submitVideoEmail}
                  className="w-full bg-[#7B9FFF] text-[#1A1A1A] rounded-lg py-[11px] text-[14px] font-bold cursor-pointer">
                  📨 Skicka videon till mig
                </button>
              </div>
            ) : (
              <button onClick={requestVideo}
                className="w-full bg-[rgba(100,140,255,0.1)] text-[#7B9FFF] border border-[rgba(100,140,255,0.3)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer">
                📨 Skicka videon till mig
              </button>
            )
          ) : (
            <div className="w-full bg-[rgba(0,200,83,0.08)] text-[#00C853] border border-[rgba(0,200,83,0.2)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2">
              ✓ Vi skickar videon till dig!
            </div>
          )}
          <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
            className="w-full bg-[rgba(201,146,42,0.12)] text-[#C9922A] border border-[rgba(201,146,42,0.3)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2">
            ★ Lämna en Google-recension
          </a>
          <a href={swishUrl}
            className="w-full bg-[rgba(0,200,83,0.1)] text-[#00C853] border border-[rgba(0,200,83,0.25)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2">
            💚 Swisha ett bidrag
          </a>
          <div className="flex gap-2.5">
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-[#1A2535] text-[#5090CF] border border-[#1E3050] rounded-xl py-[13px] text-sm font-semibold text-center">
              Facebook
            </a>
            <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-[#2A1515] text-[#FF6666] border border-[#3D1C1C] rounded-xl py-[13px] text-sm font-semibold text-center">
              YouTube
            </a>
          </div>
          <button onClick={onBack}
            className="w-full bg-[#C9922A] text-[#1A1A1A] rounded-xl py-[15px] text-[15px] font-bold cursor-pointer mt-1"
            style={{ boxShadow: '0 0 26px rgba(201,146,42,0.32)' }}>
            🎤 Sjung en till!
          </button>
        </div>
      </div>
    );
  }

  // registered
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center"
      style={{ animation: 'fade-up 0.45s ease' }}>
      <div className="w-[82px] h-[82px] rounded-full bg-[rgba(201,146,42,0.07)] border-2 border-[rgba(201,146,42,0.35)] flex items-center justify-center mb-9"
        style={{ animation: 'glow-ring 2.5s ease-in-out infinite' }}>
        <div className="w-6 h-6 rounded-full bg-[#C9922A]" style={{ animation: 'pulse-dot 1.8s ease-in-out infinite' }} />
      </div>
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9922A] mb-2.5 font-semibold">Registrerad</p>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-extrabold text-[#F5F0E8] mb-3 leading-[1.15]">
        Du är i kön!
      </h1>
      <p className="text-[15px] text-[#555] max-w-[280px] leading-[1.7]">
        Vi meddelar dig när det är dags. Håll koll på skärmen — du behöver inte göra något mer.
      </p>
      <button onClick={onBack}
        className="mt-10 bg-[rgba(201,146,42,0.12)] border border-[rgba(201,146,42,0.3)] text-[#C9922A] rounded-xl py-3.5 px-8 text-[14px] cursor-pointer font-bold">
        🎤 Sjung en till!
      </button>
    </div>
  );
}
