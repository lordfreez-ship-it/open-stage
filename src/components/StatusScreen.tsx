'use client';

import { useEffect, useState } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import Footer from './Footer';

export default function StatusScreen({ entry: initial }: { entry: QueueEntry }) {
  const [entry, setEntry] = useState(initial);

  useEffect(() => {
    const channel = supabase
      .channel(`entry-${initial.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue_entries',
          filter: `id=eq.${initial.id}`,
        },
        (payload) => {
          setEntry(payload.new as QueueEntry);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initial.id]);

  if (entry.status === 'waiting') {
    return (
      <div className="fixed inset-0 bg-[#FFD600] flex items-center justify-center animate-pulse-bg z-50">
        <div className="text-center px-6">
          <p className="text-6xl mb-6">🎸</p>
          <h1 className="text-3xl md:text-5xl font-bold text-black mb-4">
            Du är näst i kön — börja stämma gitarren!
          </h1>
          <p className="text-xl md:text-2xl text-black/70">
            You&apos;re up next — start tuning!
          </p>
        </div>
      </div>
    );
  }

  if (entry.status === 'your_turn') {
    return (
      <div className="fixed inset-0 bg-[#00C853] flex items-center justify-center animate-pulse-bg z-50">
        <div className="text-center px-6">
          <p className="text-6xl mb-6">🌟</p>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Din tur att briljera!
          </h1>
          <p className="text-xl md:text-2xl text-white/80">
            It&apos;s your time to shine!
          </p>
        </div>
      </div>
    );
  }

  if (entry.status === 'done') {
    return (
      <div className="min-h-screen bg-[#2A1A0A] flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <p className="text-6xl mb-6">🎉</p>
            <h1 className="text-3xl md:text-4xl font-bold text-[#C9922A] mb-4">
              Tack för att du vågade!
            </h1>
            <p className="text-xl text-white/70 mb-8">
              Thanks for being brave!
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // registered (default)
  return (
    <div className="min-h-screen bg-[#1A1A1A] flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-6xl mb-6">🎤</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Du är registrerad!
          </h1>
          <p className="text-lg text-white/60 mb-2">
            Demir kallar på dig snart.
          </p>
          <p className="text-lg text-white/40">
            You&apos;re registered! Demir will call you soon.
          </p>
          <p className="text-sm text-white/30 mt-8">
            Håll den här skärmen öppen / Keep this screen open
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
