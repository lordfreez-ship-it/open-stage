'use client';

import { useEffect, useState } from 'react';
import { supabase, QueueEntry } from '@/lib/supabase';
import { getTodaySessionId } from '@/lib/session';
import StatusScreen from '@/components/StatusScreen';
import QueueList from '@/components/QueueList';
import Footer from '@/components/Footer';

type Song = { title: string; artist: string };

export default function GuestPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [name, setName] = useState('');
  const [selectedSong, setSelectedSong] = useState('');
  const [customSong, setCustomSong] = useState('');
  const [email, setEmail] = useState('');
  const [videoConsent, setVideoConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);

  useEffect(() => {
    fetch('/api/songs')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSongs(data); });
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

  const handleSongChange = (value: string) => {
    setSelectedSong(value);
    checkDuplicate(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedSong) return;
    if (duplicateWarning && !confirmedDuplicate) return;

    setSubmitting(true);
    const { data, error } = await supabase
      .from('queue_entries')
      .insert({
        name: name.trim(),
        song: selectedSong,
        custom_song: customSong.trim() || null,
        email: email.trim() || null,
        video_consent: videoConsent,
        session_id: getTodaySessionId(),
      })
      .select()
      .single();

    if (!error && data) {
      setEntry(data as QueueEntry);
    }
    setSubmitting(false);
  };

  if (entry) {
    return <StatusScreen entry={entry} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#C9922A] mb-1">
            🎤 Open Stage
          </h1>
          <p className="text-white/50 text-sm">with Demir</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-1">
              Namn / Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#C9922A] transition"
              placeholder="Ditt namn"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">
              Låt / Song *
            </label>
            <select
              required
              value={selectedSong}
              onChange={(e) => handleSongChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C9922A] transition appearance-none"
            >
              <option value="" className="bg-[#1A1A1A]">Välj en låt / Choose a song</option>
              {songs.map((s) => (
                <option key={`${s.title}-${s.artist}`} value={`${s.title} — ${s.artist}`} className="bg-[#1A1A1A]">
                  {s.title} — {s.artist}
                </option>
              ))}
            </select>
          </div>

          {duplicateWarning && (
            <div className="bg-[#C1440E]/20 border border-[#C1440E]/40 rounded-lg p-3 text-sm">
              <p className="text-[#FF8A65] mb-2">
                ⚠️ Den här låten är redan vald — vill du fortsätta ändå?
              </p>
              <p className="text-white/50 mb-3">
                This song is already chosen — continue anyway?
              </p>
              <button
                type="button"
                onClick={() => setConfirmedDuplicate(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  confirmedDuplicate
                    ? 'bg-[#C9922A] text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {confirmedDuplicate ? '✓ Bekräftat / Confirmed' : 'Ja, fortsätt / Yes, continue'}
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1">
              Annan låt / Other song <span className="text-white/30">(valfritt / optional)</span>
            </label>
            <input
              type="text"
              value={customSong}
              onChange={(e) => setCustomSong(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#C9922A] transition"
              placeholder="T.ex. Wonderwall — Oasis"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">
              E-post / Email <span className="text-white/30">(valfritt / optional)</span>
            </label>
            <p className="text-xs text-white/30 mb-1">
              För att få din video / To receive your video
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#C9922A] transition"
              placeholder="din@email.se"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer py-2">
            <input
              type="checkbox"
              checked={videoConsent}
              onChange={(e) => setVideoConsent(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-white/20 bg-white/10 accent-[#C9922A]"
            />
            <span className="text-sm text-white/60 leading-snug">
              Jag godkänner att mitt framträdande spelas in och skickas till min e-post
              <br />
              <span className="text-white/30">
                I agree to be recorded and receive the video by email
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || !name.trim() || !selectedSong || (duplicateWarning && !confirmedDuplicate)}
            className="w-full bg-[#C1440E] hover:bg-[#D4550F] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg text-lg transition"
          >
            {submitting ? 'Skickar...' : 'Anmäl dig / Sign up 🎶'}
          </button>
        </form>

        <QueueList />
      </main>

      <Footer />
    </div>
  );
}
