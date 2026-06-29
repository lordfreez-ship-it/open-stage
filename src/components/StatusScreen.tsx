'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';

const GOOGLE_REVIEW_URL = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL || '';
const SWISH_NUMBER = process.env.NEXT_PUBLIC_SWISH_NUMBER || '';
const FACEBOOK_URL = process.env.NEXT_PUBLIC_FACEBOOK_URL || '';
const YOUTUBE_URL = process.env.NEXT_PUBLIC_YOUTUBE_URL || '';

async function subscribeToPush(entryId: string) {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, subscription: existing.toJSON() }),
      });
      return;
    }

    const res = await fetch('/api/push/vapid');
    const { publicKey } = await res.json();
    if (!publicKey) return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId, subscription: subscription.toJSON() }),
    });
  } catch { /* push not supported */ }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

function alertUser(status: string) {
  if (status === 'waiting' || status === 'your_turn') {
    try { navigator.vibrate?.([300, 100, 300, 100, 300]); } catch { /* */ }
  }

  if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
    const msg = status === 'your_turn'
      ? { title: 'NU! Din tur!', body: 'Gå upp på scen — det är dags!' }
      : { title: 'Snart din tur!', body: 'Gör dig redo — det är snart dags!' };

    new Notification(msg.title, {
      body: msg.body,
      icon: '/icons/icon-192x192.png',
      tag: 'open-stage-status',
    } as NotificationOptions);
  }
}

export default function StatusScreen({ entry: initial, onBack }: { entry: QueueEntry; onBack: () => void }) {
  const [entry, setEntry] = useState(initial);
  const [videoRequested, setVideoRequested] = useState(initial.video_requested);
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [videoEmail, setVideoEmail] = useState('');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const prevStatusRef = useRef(initial.status);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* Wake Lock not supported or denied */ }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      subscribeToPush(initial.id);
    }
  }, [initial.id]);

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`entry-${initial.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue_entries', filter: `id=eq.${initial.id}` },
        (payload) => {
          const updated = payload.new as QueueEntry;
          setEntry(updated);
          if (updated.status !== prevStatusRef.current) {
            alertUser(updated.status);
            prevStatusRef.current = updated.status;
          }
        }
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

  const notifBanner = notifPermission === 'default' && (
    <button
      onClick={requestNotificationPermission}
      className="fixed top-0 left-0 right-0 z-[60] bg-[rgba(201,146,42,0.15)] border-b border-[rgba(201,146,42,0.3)] py-3 px-5 text-center cursor-pointer"
      style={{ animation: 'slide-down 0.3s ease' }}
    >
      <span className="text-[13px] text-[#C9922A] font-semibold">
        Aktivera notiser så vi kan meddela dig när det är din tur
      </span>
    </button>
  );

  if (entry.status === 'waiting') {
    return (
      <>
        {notifBanner}
        <div className="fixed inset-0 bg-[#FFD600] flex flex-col items-center justify-center px-7 md:px-12 py-10 text-center z-50"
          style={{ animation: 'status-pulse 2.8s ease-in-out infinite' }}>
          <div className="text-[58px] mb-7">&#x23F3;</div>
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
            &#x1F3A4; Sjung en till!
          </button>
        </div>
      </>
    );
  }

  if (entry.status === 'your_turn') {
    return (
      <>
        {notifBanner}
        <div className="fixed inset-0 bg-[#00C853] flex flex-col items-center justify-center px-7 md:px-12 py-10 text-center z-50">
          <div className="text-[84px] mb-6" style={{ animation: 'strong-pulse 1s ease-in-out infinite' }}>&#x1F3A4;</div>
          <p className="text-[11px] tracking-[0.24em] uppercase text-black/[0.38] mb-2.5 font-bold">Nu!</p>
          <h1 className="font-[family-name:var(--font-playfair)] text-[54px] font-black text-[#1A1A1A] leading-[0.98] mb-2"
            style={{ animation: 'strong-pulse 1s ease-in-out infinite' }}>
            Det är<br />din tur!
          </h1>
          <p className="font-[family-name:var(--font-playfair)] italic text-[26px] text-black/[0.38] mb-[22px]">
            It&apos;s your turn!
          </p>
          <p className="text-base text-black/[0.55] max-w-[240px] leading-[1.55] font-semibold">
            Gå upp på scen och visa vad du går för! &#x1F525;
          </p>
          <button onClick={onBack}
            className="mt-10 bg-black/15 border-2 border-black/20 text-black/70 rounded-xl py-3.5 px-8 text-[14px] cursor-pointer font-bold">
            &#x1F3A4; Sjung en till!
          </button>
        </div>
      </>
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
      <div className="min-h-screen bg-[#1C1409] flex flex-col items-center justify-center px-6 md:px-12 py-10 text-center"
        style={{ animation: 'fade-up 0.5s ease' }}>
        <div className="text-[64px] mb-5">&#x1F31F;</div>
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9922A] mb-2.5 font-semibold">Bravissimo!</p>
        <h1 className="font-[family-name:var(--font-playfair)] text-[34px] font-extrabold text-[#F5F0E8] leading-[1.2] mb-[7px]">
          Tack för att du vågade!
        </h1>
        <p className="font-[family-name:var(--font-playfair)] italic text-lg text-[#F5F0E8]/[0.35] mb-9">
          Thanks for being brave!
        </p>

        <div className="w-full max-w-[320px] md:max-w-[420px] flex flex-col gap-[11px] md:gap-3.5" style={{ animation: 'fade-up 0.5s 0.25s ease both' }}>
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
                  &#x1F4E8; Skicka videon till mig
                </button>
              </div>
            ) : (
              <button onClick={requestVideo}
                className="w-full bg-[rgba(100,140,255,0.1)] text-[#7B9FFF] border border-[rgba(100,140,255,0.3)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2 cursor-pointer">
                &#x1F4E8; Skicka videon till mig
              </button>
            )
          ) : (
            <div className="w-full bg-[rgba(0,200,83,0.08)] text-[#00C853] border border-[rgba(0,200,83,0.2)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2">
              &#x2713; Vi skickar videon till dig!
            </div>
          )}
          <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer"
            className="w-full bg-[rgba(201,146,42,0.12)] text-[#C9922A] border border-[rgba(201,146,42,0.3)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2">
            &#x2605; Lämna en Google-recension
          </a>
          <a href={swishUrl}
            className="w-full bg-[rgba(0,200,83,0.1)] text-[#00C853] border border-[rgba(0,200,83,0.25)] rounded-xl py-[15px] text-[15px] font-bold flex items-center justify-center gap-2">
            &#x1F49A; Swisha ett bidrag
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
            &#x1F3A4; Sjung en till!
          </button>
        </div>
      </div>
    );
  }

  // registered
  return (
    <>
      {notifBanner}
      <div className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 py-10 text-center"
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
          &#x1F3A4; Sjung en till!
        </button>
      </div>
    </>
  );
}
