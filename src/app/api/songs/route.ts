import { NextResponse } from 'next/server';

// BandHelper field mapping — adjust if feed structure changes
const FIELD_SONG_NAME = 'name';
const FIELD_ARTIST = 'artist';
const FIELD_TYPE = 'type';

export async function GET() {
  const url = process.env.BANDHELPER_SETLIST_JSON_URL;
  if (!url) {
    return NextResponse.json({ error: 'BANDHELPER_SETLIST_JSON_URL not configured' }, { status: 500 });
  }

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();

    const songs = data
      .filter((item: Record<string, string>) => item[FIELD_TYPE] === 'song')
      .map((item: Record<string, string>) => ({
        title: item[FIELD_SONG_NAME],
        artist: item[FIELD_ARTIST],
      }));

    return NextResponse.json(songs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 502 });
  }
}
