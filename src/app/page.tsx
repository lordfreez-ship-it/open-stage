'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import { getTodaySessionId } from '@/lib/session';
import StatusScreen from '@/components/StatusScreen';
import QueueList from '@/components/QueueList';
import BottomBar from '@/components/BottomBar';

type RepertoireSong = { title: string; artist: string };
type SpotifyResult = { id: string; title: string; artist: string; albumArt: string | null };

export default function GuestPage() {
  const [repertoire, setRepertoire] = useState<RepertoireSong[]>([]);
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('os_name') || '';
    return '';
  });
  const [selectedSong, setSelectedSong] = useState('');
  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('os_email') || '';
    return '';
  });
  const [videoConsent, setVideoConsent] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('os_consent') === 'true';
    return false;
  });
  const [submitting, setSubmitting] = useState(false);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  // Spotify search state
  const [songQuery, setSongQuery] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setRepertoire(data); });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchSpotify = useCallback(async (query: string) => {
    if (query.length < 2) { setSpotifyResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (Array.isArray(data)) setSpotifyResults(data);
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  const handleSongQueryChange = (value: string) => {
    setSongQuery(value);
    setSelectedSong('');
    setShowResults(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchSpotify(value), 300);
  };

  const isInRepertoire = (title: string, artist: string): boolean => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-zåäö0-9]/g, '');
    return repertoire.some(
      (r) => normalize(r.title) === normalize(title) ||
        (normalize(r.title).includes(normalize(title)) && normalize(r.artist).includes(normalize(artist)))
    );
  };

  const selectResult = (result: SpotifyResult) => {
    const label = `${result.artist} — ${result.title}`;
    setSelectedSong(label);
    setSongQuery(label);
    setShowResults(false);
    setSpotifyResults([]);
    checkDuplicate(label);
  };

  const clearSelection = () => {
    setSelectedSong('');
    setSongQuery('');
    setSpotifyResults([]);
    setDuplicateWarning(false);
    setConfirmedDuplicate(false);
  };

  const checkDuplicate = async (songValue: string) => {
    if (!songValue) { setDuplicateWarning(false); return; }
    const { data } = await supabase
      .from('queue_entries')
      .select('id')
      .eq('session_id', getTodaySessionId())
      .eq('song', songValue)
      .in('status', ['registered', 'waiting', 'your_turn'])
      .limit(1);
    setDuplicateWarning(!!data && data.length > 0);
    setConfirmedDuplicate(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (duplicateWarning && !confirmedDuplicate) return;

    setSubmitting(true);
    const songValue = selectedSong || songQuery.trim() || 'Valfri / Any song';
    const { data, error } = await supabase
      .from('queue_entries')
      .insert({
        name: name.trim(),
        song: songValue,
        custom_song: !selectedSong && songQuery.trim() ? songQuery.trim() : null,
        email: email.trim() || null,
        video_consent: videoConsent,
        session_id: getTodaySessionId(),
      })
      .select()
      .single();

    if (!error && data) {
      localStorage.setItem('os_name', name.trim());
      localStorage.setItem('os_email', email.trim());
      localStorage.setItem('os_consent', String(videoConsent));
      setEntry(data as QueueEntry);
    }
    setSubmitting(false);
  };

  if (entry) {
    return <StatusScreen entry={entry} onBack={() => {
      setEntry(null);
      clearSelection();
    }} />;
  }

  const formIsValid = !!name.trim() && (!duplicateWarning || confirmedDuplicate);

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] md:max-w-[640px] lg:max-w-[720px] mx-auto relative">
      {/* STICKY HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-[22px] border-b border-white/[0.07] px-4 py-2.5"
        style={{ background: 'rgba(6,4,2,0.32)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-[60px] shrink-0" />
          <div className="flex-1 text-center leading-none">
            <div className="font-[family-name:var(--font-playfair)] font-black text-xl tracking-[0.14em] uppercase text-[#C9922A]">
              OPEN STAGE
            </div>
            <div className="font-[family-name:var(--font-dancing)] font-bold text-[17px] text-[#C1440E] mt-px">
              with Demir
            </div>
            <div className="text-[9px] tracking-[0.18em] uppercase text-[#F5F0E8]/[0.32] mt-[3px] font-medium">
              Våga kliva upp på scen!
            </div>
          </div>
          <a href="/admin" className="shrink-0 bg-transparent border border-[#252525] text-[#3A3A3A] text-[11px] px-[11px] py-1.5 rounded-md tracking-[0.04em]">
            Admin
          </a>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 px-[18px] md:px-8 pt-7 md:pt-10 pb-[108px]">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9922A] mb-1.5 font-semibold">Anmäl dig</p>
        <h2 className="font-[family-name:var(--font-playfair)] text-[26px] font-extrabold text-[#F5F0E8] leading-[1.2] mb-1.5">
          Kliv upp på scen!
        </h2>
        <p className="text-[13px] text-[#888] mb-6 leading-[1.5]">
          Fyll i nedan och välj din låt — vi kallar på dig när det är dags.
        </p>

        {/* FORM CARD */}
        <form onSubmit={handleSubmit} className="bg-[#242424] rounded-2xl p-[22px] md:p-8 border border-[#282828] mb-9">
          {/* Name */}
          <div className="mb-[15px]">
            <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-[#999] mb-[7px]">Namn</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Namn"
              className="w-full px-3.5 py-3 bg-[#2A2A2A] border border-[#444] rounded-[9px] text-[#F5F0E8] text-base outline-none focus:border-[#C9922A] transition placeholder:text-[#666]"
            />
          </div>

          {/* Song search (Spotify + BandHelper) */}
          <div className="mb-[15px] relative z-[45]" ref={searchRef}>
            <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-[#999] mb-[7px]">
              Sök låt
            </label>
            <div className="relative">
              <input
                type="text"
                value={songQuery}
                onChange={(e) => handleSongQueryChange(e.target.value)}
                onFocus={() => { if (songQuery.length >= 2 && !selectedSong) setShowResults(true); }}
                placeholder="Sök artist eller låt..."
                className={`w-full px-3.5 py-3 bg-[#2A2A2A] border rounded-[9px] text-[#F5F0E8] text-[15px] outline-none transition placeholder:text-[#666] ${
                  selectedSong ? 'border-[#C9922A]' : 'border-[#444] focus:border-[#C9922A]'
                }`}
              />
              {selectedSong && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#F5F0E8] transition text-lg leading-none"
                >
                  ✕
                </button>
              )}
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#C9922A] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            {duplicateWarning && (
              <div className="mt-[7px] flex items-center gap-1.5 text-[#E05A2B] text-xs" style={{ animation: 'slide-down 0.25s ease' }}>
                <span>⚠</span><span>Låten är redan vald — välj en annan eller bekräfta!</span>
                <button type="button" onClick={() => setConfirmedDuplicate(true)}
                  className={`ml-2 px-2 py-0.5 rounded text-[10px] font-medium ${confirmedDuplicate ? 'bg-[#C9922A] text-[#1A1A1A]' : 'bg-white/10 text-white/60'}`}>
                  {confirmedDuplicate ? '✓ OK' : 'Fortsätt'}
                </button>
              </div>
            )}

            {showResults && !selectedSong && songQuery.length >= 2 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[#1C1C1C] border border-[#C9922A] rounded-xl max-h-[320px] overflow-y-auto z-50 shadow-[0_14px_48px_rgba(0,0,0,0.75)]"
                style={{ animation: 'slide-down 0.2s ease' }}>
                {spotifyResults.length > 0 ? (
                  spotifyResults.map((r) => {
                    const onStage = isInRepertoire(r.title, r.artist);
                    return (
                      <div
                        key={r.id}
                        onClick={() => selectResult(r)}
                        className="px-3.5 py-[11px] cursor-pointer border-b border-white/[0.03] hover:bg-white/5 transition flex items-center gap-3"
                      >
                        {r.albumArt && (
                          <img
                            src={r.albumArt}
                            alt=""
                            className="w-10 h-10 rounded-[5px] shrink-0 object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-[#F5F0E8] font-medium truncate">{r.title}</div>
                          <div className="text-xs text-[#666] truncate">{r.artist}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-[3px] rounded-[4px] whitespace-nowrap shrink-0 ${
                          onStage
                            ? 'bg-[rgba(0,200,83,0.12)] text-[#00C853] border border-[rgba(0,200,83,0.25)]'
                            : 'bg-[rgba(100,140,255,0.1)] text-[#7B9FFF] border border-[rgba(100,140,255,0.2)]'
                        }`}>
                          {onStage ? 'Ready on Stage 🎸' : 'Request via Jamzone 🎧'}
                        </span>
                      </div>
                    );
                  })
                ) : searching ? (
                  <div className="px-4 py-6 text-center text-[#555] text-sm">
                    <div className="w-5 h-5 border-2 border-[#C9922A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Söker...
                  </div>
                ) : (
                  <div className="px-4 py-5 text-center text-[#555] text-sm">
                    Inga resultat — prova ett annat sökord
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Email */}
          <div className="mb-[15px]">
            <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-[#999] mb-[7px]">
              E-post <span className="font-normal normal-case tracking-normal text-[#777]">(bekräftelse)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@email.se"
              className="w-full px-3.5 py-3 bg-[#2A2A2A] border border-[#444] rounded-[9px] text-[#F5F0E8] text-base outline-none focus:border-[#C9922A] transition placeholder:text-[#666]"
            />
          </div>

          {/* Consent */}
          <div className="mb-5 flex items-start gap-[11px] bg-[rgba(201,146,42,0.05)] border border-[rgba(201,146,42,0.1)] rounded-[10px] px-3.5 py-[13px]">
            <input
              type="checkbox"
              checked={videoConsent}
              onChange={(e) => setVideoConsent(e.target.checked)}
              className="mt-0.5 shrink-0 w-[18px] h-[18px] accent-[#C9922A] cursor-pointer"
            />
            <label className="text-xs text-[#999] leading-[1.6] cursor-pointer">
              Jag godkänner att mitt uppträdande kan filmas och publiceras på DC&apos;s kanaler.{' '}
              <span className="text-[#C9922A] font-medium">🎥 Videoinspelning OK</span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !formIsValid}
            className="w-full py-3.5 rounded-[10px] text-base font-bold tracking-[0.025em] transition-all duration-250 cursor-pointer disabled:cursor-default"
            style={{
              background: formIsValid && !submitting ? '#C9922A' : '#222',
              color: formIsValid && !submitting ? '#1A1A1A' : '#3A3A3A',
              border: 'none',
              boxShadow: formIsValid && !submitting ? '0 0 26px rgba(201,146,42,0.32)' : 'none',
            }}
          >
            {submitting ? 'Skickar...' : 'Anmäl mig till kön →'}
          </button>
        </form>

        {/* PUBLIC QUEUE */}
        <QueueList />
      </main>

      {/* FIXED BOTTOM BAR */}
      <BottomBar />
    </div>
  );
}
