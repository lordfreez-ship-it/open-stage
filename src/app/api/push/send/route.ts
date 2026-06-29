import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

function configureVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const priv = process.env.VAPID_PRIVATE_KEY || '';
  const subject = process.env.VAPID_SUBJECT || 'mailto:demir@dinlokalait.se';
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    return true;
  }
  return false;
}

const STATUS_MESSAGES: Record<string, { title: string; body: string; icon: string }> = {
  waiting: {
    title: 'Snart din tur!',
    body: 'Gör dig redo — det är snart dags att ta scenen!',
    icon: '/icons/icon-192x192.png',
  },
  your_turn: {
    title: 'NU! Din tur!',
    body: 'Gå upp på scen — det är dags!',
    icon: '/icons/icon-192x192.png',
  },
};

export async function POST(req: NextRequest) {
  const { entryId, status } = await req.json();
  if (!entryId || !status) {
    return NextResponse.json({ error: 'Missing entryId or status' }, { status: 400 });
  }

  if (!configureVapid()) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  const message = STATUS_MESSAGES[status];
  if (!message) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { data } = await getSupabase()
    .from('queue_entries')
    .select('push_subscription, name')
    .eq('id', entryId)
    .single();

  if (!data?.push_subscription) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no subscription' });
  }

  try {
    const subscription = JSON.parse(data.push_subscription);
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        ...message,
        body: `${data.name}, ${message.body}`,
        data: { url: '/' },
      })
    );
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    const pushErr = err as { statusCode?: number };
    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
      await getSupabase()
        .from('queue_entries')
        .update({ push_subscription: null })
        .eq('id', entryId);
    }
    return NextResponse.json({ ok: true, error: 'push failed' });
  }
}
