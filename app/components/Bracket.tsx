'use client';

import { useEffect, useRef, useState } from 'react';
import { BracketState, MATCHES, MatchId } from '@/lib/bracket';
import MatchCard from './MatchCard';

export default function Bracket() {
  const [state, setStateLocal] = useState<BracketState | null>(null);
  const [saving, setSaving] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  async function load() {
    const res = await fetch('/api/bracket');
    const data = await res.json();
    setStateLocal(data);
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function save(next: BracketState) {
    setStateLocal(next);
    setSaving(true);
    await fetch('/api/bracket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    setSaving(false);
  }

  async function reset() {
    if (!confirm('Reset the entire bracket?')) return;
    const res = await fetch('/api/bracket', { method: 'DELETE' });
    const data = await res.json();
    setStateLocal(data);
  }

  function pick(matchId: MatchId, team: string) {
    if (!state) return;
    const next: BracketState = {
      ...state,
      winners: { ...state.winners, [matchId]: team },
    };

    // Clear downstream winners that may now be invalid
    const downstream: Partial<Record<MatchId, MatchId[]>> = {
      r1m1: ['qf3', 'sf2', 'final'],
      r1m2: ['qf2', 'sf2', 'final'],
      r1m3: ['qf1', 'sf1', 'final'],
      qf1: ['sf1', 'final'],
      qf2: ['sf2', 'final'],
      qf3: ['sf2', 'final'],
      qf4: ['sf1', 'final'],
      sf1: ['final'],
      sf2: ['final'],
    };

    const toClear = downstream[matchId] ?? [];

    // For each downstream match, check if its current winner is still a valid participant
    for (const mid of toClear) {
      const match = MATCHES.find(m => m.id === mid);
      if (!match) continue;
      const newT1 = match.getTeam1(next);
      const newT2 = match.getTeam2(next);
      const currentWinner = next.winners[mid];
      if (currentWinner && currentWinner !== newT1 && currentWinner !== newT2) {
        delete next.winners[mid];
      }
    }

    save(next);
  }

  if (!state) {
    return <div className="loading">Loading bracket...</div>;
  }

  const rounds = [
    { label: 'Play-in', ids: ['r1m1', 'r1m2', 'r1m3'] as MatchId[] },
    { label: 'Quarterfinals', ids: ['qf1', 'qf2', 'qf3', 'qf4'] as MatchId[] },
    { label: 'Semifinals', ids: ['sf1', 'sf2'] as MatchId[] },
    { label: 'Final', ids: ['final'] as MatchId[] },
  ];

  const roundLabels: Record<MatchId, string> = {
    r1m1: 'Match 1', r1m2: 'Match 2', r1m3: 'Match 3',
    qf1: 'QF 1', qf2: 'QF 2', qf3: 'QF 3', qf4: 'QF 4',
    sf1: 'SF 1', sf2: 'SF 2',
    final: 'Grand Final',
  };

  const champion = state.winners['final'];

  return (
    <div className="bracket-wrapper">
      <header className="bracket-header">
        <div className="header-left">
          <div className="cs2-logo">CS2</div>
          <div>
            <h1>Tournament Bracket</h1>
            <p className="subtitle">Sudden Death · {state.seeds.length} Teams</p>
          </div>
        </div>
        <div className="header-right">
          {saving && <span className="saving-badge">Saving…</span>}
          <button className="reset-btn" onClick={reset}>Reset</button>
        </div>
      </header>

      {champion && (
        <div className="champion-banner">
          🏆 Champion: <strong>{champion}</strong>
        </div>
      )}

      <div className="bracket-grid">
        {rounds.map(round => (
          <div key={round.label} className="round-col">
            <div className="round-label">{round.label}</div>
            <div className="round-matches">
              {round.ids.map(id => {
                const def = MATCHES.find(m => m.id === id)!;
                return (
                  <MatchCard
                    key={id}
                    id={id}
                    label={roundLabels[id]}
                    team1={def.getTeam1(state)}
                    team2={def.getTeam2(state)}
                    winner={state.winners[id] ?? null}
                    onPick={pick}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <footer className="seedings">
        <strong>Seedings:</strong>{' '}
        {state.seeds.map((t, i) => (
          <span key={i} className="seed-badge">#{i + 1} {t}</span>
        ))}
      </footer>
    </div>
  );
}
