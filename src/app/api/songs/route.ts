import { NextResponse } from 'next/server';

const FIELD_SONG_NAME = 'name';
const FIELD_ARTIST = 'artist';
const FIELD_TYPE = 'type';

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'");
}

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
        title: decodeHtmlEntities(item[FIELD_SONG_NAME] || ''),
        artist: decodeHtmlEntities(item[FIELD_ARTIST] || ''),
      }));

    return NextResponse.json(songs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch songs' }, { status: 502 });
  }
}
