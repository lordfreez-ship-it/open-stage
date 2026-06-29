import { NextResponse } from 'next/server';

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) throw new Error('Spotify auth failed');

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const token = await getSpotifyToken();
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=5&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      if (res.status === 401) {
        cachedToken = null;
        tokenExpiry = 0;
      }
      return NextResponse.json({ error: 'Spotify search failed' }, { status: 502 });
    }

    const data = await res.json();
    const tracks = (data.tracks?.items || []).map((track: Record<string, unknown>) => ({
      id: track.id,
      title: track.name as string,
      artist: (track.artists as Array<{ name: string }>).map((a) => a.name).join(', '),
      albumArt: ((track.album as { images: Array<{ url: string; width: number }> }).images
        .find((img) => img.width <= 100) ||
        (track.album as { images: Array<{ url: string }> }).images.slice(-1)[0])?.url || null,
    }));

    return NextResponse.json(tracks);
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 502 });
  }
}
