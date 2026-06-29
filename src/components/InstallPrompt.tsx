'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('os_install_dismissed')) {
      setDismissed(true);
      return;
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
    if (isStandalone) { setIsInstalled(true); return; }

    const ua = window.navigator.userAgent;
    const isiOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    setIsIOS(isiOS && isSafari);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isInstalled || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('os_install_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-4 pt-2" style={{ animation: 'slide-up 0.35s ease' }}>
      <div className="max-w-[480px] mx-auto bg-[#1C1C1C] border border-[rgba(201,146,42,0.3)] rounded-2xl p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192x192.png" alt="" className="w-12 h-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#F5F0E8] leading-tight">Installera Open Stage</p>
            <p className="text-[11px] text-[#777] mt-1 leading-[1.5]">
              {isIOS
                ? 'Tryck på delningsknappen och sedan "Lägg till på hemskärmen" för att installera appen.'
                : 'Installera appen på din hemskärm för bästa upplevelse och notiser.'}
            </p>
          </div>
          <button onClick={handleDismiss} className="text-[#444] text-lg leading-none shrink-0 p-1">
            ✕
          </button>
        </div>
        {isIOS ? (
          <div className="mt-3 flex items-center justify-center gap-2 bg-[rgba(201,146,42,0.08)] border border-[rgba(201,146,42,0.15)] rounded-xl py-3 px-4">
            <span className="text-[22px]">&#x2191;</span>
            <span className="text-[12px] text-[#C9922A] font-semibold">
              Tryck <span className="inline-block border border-[#C9922A] rounded px-1.5 py-0.5 text-[11px] mx-0.5">&#x2191;</span> och sedan &quot;Lägg till på hemskärmen&quot;
            </span>
          </div>
        ) : (
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-[#C9922A] text-[#1A1A1A] rounded-xl py-3 text-[14px] font-bold cursor-pointer"
            style={{ boxShadow: '0 0 20px rgba(201,146,42,0.3)' }}
          >
            Installera appen
          </button>
        )}
      </div>
    </div>
  );
}
