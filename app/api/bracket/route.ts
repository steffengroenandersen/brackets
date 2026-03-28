import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { BracketState, shuffleTeams } from '@/lib/bracket';

const KEY = 'bracket_state';

export async function GET() {
  let state = await kv.get<BracketState>(KEY);
  if (!state) {
    state = { seeds: shuffleTeams(), winners: {} };
    await kv.set(KEY, state);
  }
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const body = await req.json();
  await kv.set(KEY, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await kv.del(KEY);
  const state: BracketState = { seeds: shuffleTeams(), winners: {} };
  await kv.set(KEY, state);
  return NextResponse.json(state);
}
