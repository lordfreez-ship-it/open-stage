'use client';

import { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    // Suppress Chrome's automatic install banner on Android. Installing the
    // auto-generated WebAPK is exactly what triggers Google Play Protect
    // "built for an older version of Android" warnings — and Android delivers
    // push notifications straight from the browser without any install, so we
    // never push install there. This keeps the experience warning-free.
    const suppress = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', suppress);
    const cleanup = () => window.removeEventListener('beforeinstallprompt', suppress);

    if (localStorage.getItem('os_install_dismissed')) return cleanup;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) return cleanup;

    const ua = window.navigator.userAgent;
    // iPadOS 13+ reports a Mac user agent; a Mac with a touch screen
    // doesn't exist, so platform+touch identifies those iPads.
    const isIOS = /iphone|ipad|ipod/i.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!isIOS) return cleanup;

    // In-app browsers (Instagram, Facebook, Messenger, Snapchat, TikTok, Line)
    // do not offer "Add to Home Screen" — the user must open in Safari first.
    const inAppBrowser = /FBAN|FBAV|Instagram|Messenger|Snapchat|Line\/|TikTok|Twitter/i.test(ua);
    setInApp(inAppBrowser);
    setShow(true);

    return cleanup;
  }, []);

  if (!show) return null;

  const handleDismiss = () => {
    localStorage.setItem('os_install_dismissed', '1');
    setShow(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pt-2" style={{ animation: 'slide-up 0.35s ease' }}>
      <div className="max-w-[480px] mx-auto bg-[#1C1C1C] border border-[rgba(201,146,42,0.3)] rounded-2xl p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192x192.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#F5F0E8] leading-tight">Få en notis när det är din tur</p>
            <p className="text-[11px] text-[#777] mt-1 leading-[1.5]">
              {inApp
                ? 'Öppna sidan i Safari först — så kan du få en notis även när skärmen är låst.'
                : 'Lägg till Open Stage på hemskärmen så kan vi meddela dig — även när skärmen är låst.'}
            </p>
          </div>
          <button onClick={handleDismiss} className="text-[#444] text-lg leading-none shrink-0 p-1">
            &#x2715;
          </button>
        </div>

        {inApp ? (
          <ol className="mt-3 bg-[rgba(201,146,42,0.06)] border border-[rgba(201,146,42,0.12)] rounded-xl py-3 px-4 text-[12px] text-[#C9922A] leading-[1.7] list-decimal list-inside font-medium">
            <li>Tryck på <span className="text-[#F5F0E8]">&#x22EF;</span> (menyn uppe i hörnet)</li>
            <li>Välj <span className="text-[#F5F0E8]">&quot;Öppna i Safari&quot;</span></li>
          </ol>
        ) : (
          <ol className="mt-3 bg-[rgba(201,146,42,0.06)] border border-[rgba(201,146,42,0.12)] rounded-xl py-3 px-4 text-[12px] text-[#C9922A] leading-[1.7] list-decimal list-inside font-medium">
            <li>Tryck på Dela-knappen <span className="inline-block border border-[#C9922A] rounded px-1 text-[#F5F0E8] text-[11px]">&#x2191;</span> längst ner i Safari</li>
            <li>Scrolla och välj <span className="text-[#F5F0E8]">&quot;Lägg till på hemskärmen&quot;</span></li>
          </ol>
        )}
      </div>
    </div>
  );
}
