'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import { getTodaySessionId } from '@/lib/session';
import StatusScreen from '@/components/StatusScreen';
import QueueList from '@/components/QueueList';
import BottomBar from '@/components/BottomBar';

type Song = { title: string; artist: string };

export default function GuestPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('os_name') || '';
    return '';
  });
  const [selectedSong, setSelectedSong] = useState('');
  const [customSong, setCustomSong] = useState('');
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [songFilter, setSongFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSongs(data); });
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

  const selectSong = (label: string) => {
    setSelectedSong(label);
    setShowDropdown(false);
    setSongFilter('');
    checkDuplicate(label);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (duplicateWarning && !confirmedDuplicate) return;

    setSubmitting(true);
    const songValue = customSong.trim() || selectedSong || 'Valfri / Any song';
    const { data, error } = await supabase
      .from('queue_entries')
      .insert({
        name: name.trim(),
        song: songValue,
        custom_song: customSong.trim() || null,
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
      setSelectedSong('');
      setCustomSong('');
      setDuplicateWarning(false);
      setConfirmedDuplicate(false);
    }} />;
  }

  const filteredSongs = songFilter
    ? songs.filter(s =>
        `${s.title} ${s.artist}`.toLowerCase().includes(songFilter.toLowerCase())
      )
    : songs;

  const formIsValid = !!name.trim() && (!duplicateWarning || confirmedDuplicate);

  return (
    <div className="min-h-screen flex flex-col max-w-[480px] mx-auto relative">
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
      <main className="flex-1 px-[18px] pt-7 pb-[108px]">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#C9922A] mb-1.5 font-semibold">Anmäl dig</p>
        <h2 className="font-[family-name:var(--font-playfair)] text-[26px] font-extrabold text-[#F5F0E8] leading-[1.2] mb-1.5">
          Kliv upp på scen!
        </h2>
        <p className="text-[13px] text-[#888] mb-6 leading-[1.5]">
          Fyll i nedan och välj din låt — vi kallar på dig när det är dags.
        </p>

        {/* FORM CARD */}
        <form onSubmit={handleSubmit} className="bg-[#242424] rounded-2xl p-[22px] border border-[#282828] mb-9">
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

          {/* Song dropdown */}
          <div className="mb-[15px] relative z-[45]" ref={dropdownRef}>
            <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-[#999] mb-[7px]">Välj låt</label>
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className={`w-full px-3.5 py-3 bg-[#2A2A2A] border rounded-[9px] text-[15px] cursor-pointer flex items-center justify-between outline-none transition ${
                selectedSong ? 'border-[#C9922A] text-[#F5F0E8]' : 'border-[#444] text-[#666]'
              }`}
            >
              <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
                {selectedSong || 'Välj en låt...'}
              </span>
              <span className="text-[#888] text-[11px] shrink-0 ml-2">▾</span>
            </button>

            {duplicateWarning && (
              <div className="mt-[7px] flex items-center gap-1.5 text-[#E05A2B] text-xs" style={{ animation: 'slide-down 0.25s ease' }}>
                <span>⚠</span><span>Låten är redan vald — välj en annan eller bekräfta!</span>
                <button type="button" onClick={() => setConfirmedDuplicate(true)}
                  className={`ml-2 px-2 py-0.5 rounded text-[10px] font-medium ${confirmedDuplicate ? 'bg-[#C9922A] text-[#1A1A1A]' : 'bg-white/10 text-white/60'}`}>
                  {confirmedDuplicate ? '✓ OK' : 'Fortsätt'}
                </button>
              </div>
            )}

            {showDropdown && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-[#1C1C1C] border border-[#C9922A] rounded-xl max-h-[260px] overflow-y-auto z-50 shadow-[0_14px_48px_rgba(0,0,0,0.75)]"
                style={{ animation: 'slide-down 0.2s ease' }}>
                <div className="sticky top-0 bg-[#1C1C1C] p-2 border-b border-white/5">
                  <input
                    type="text"
                    value={songFilter}
                    onChange={(e) => setSongFilter(e.target.value)}
                    placeholder="Sök låt..."
                    className="w-full px-3 py-2 bg-[#252525] border border-[#444] rounded-lg text-sm text-[#F5F0E8] outline-none placeholder:text-[#666]"
                    autoFocus
                  />
                </div>
                {filteredSongs.map((s) => {
                  const label = `${s.title} — ${s.artist}`;
                  return (
                    <div
                      key={label}
                      onClick={() => selectSong(label)}
                      className="px-4 py-[11px] cursor-pointer border-b border-white/[0.03] text-sm text-[#E8E2D8] hover:bg-white/5 transition"
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom song */}
          <div className="mb-[15px]">
            <label className="block text-[11px] font-bold tracking-[0.12em] uppercase text-[#999] mb-[7px]">
              Valfri sång <span className="font-normal normal-case tracking-normal text-[#777] text-[11px]">(om din låt inte finns i listan)</span>
            </label>
            <input
              type="text"
              value={customSong}
              onChange={(e) => setCustomSong(e.target.value)}
              placeholder="Titel – Artist"
              className="w-full px-3.5 py-3 bg-[#2A2A2A] border border-[#444] rounded-[9px] text-[#F5F0E8] text-base outline-none focus:border-[#C9922A] transition placeholder:text-[#666]"
            />
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
