import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export async function POST(req: NextRequest) {
  const { entryId, subscription } = await req.json();
  if (!entryId || !subscription) {
    return NextResponse.json({ error: 'Missing entryId or subscription' }, { status: 400 });
  }

  const { error } = await getSupabase()
    .from('queue_entries')
    .update({ push_subscription: JSON.stringify(subscription) })
    .eq('id', entryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
