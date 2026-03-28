import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { BracketState, shuffleTeams } from '@/lib/bracket';

const redis = Redis.fromEnv();

const KEY = 'bracket_state';

export async function GET() {
  let state = await redis.get<BracketState>(KEY);
  if (!state) {
    state = { seeds: shuffleTeams(), winners: {} };
    await redis.set(KEY, state);
  }
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  const body = await req.json();
  await redis.set(KEY, body);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del(KEY);
  const state: BracketState = { seeds: shuffleTeams(), winners: {} };
  await redis.set(KEY, state);
  return NextResponse.json(state);
}
