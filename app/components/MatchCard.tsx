'use client';

import { MatchId } from '@/lib/bracket';

interface Props {
  id: MatchId;
  label: string;
  team1: string | null;
  team2: string | null;
  winner: string | null;
  map: string | undefined;
  onPick: (matchId: MatchId, team: string) => void;
}

export default function MatchCard({ id, label, team1, team2, winner, map, onPick }: Props) {
  const ready = team1 && team2;

  const teamClass = (team: string | null) => {
    if (!team) return 'team-slot empty';
    if (winner === team) return 'team-slot winner';
    if (winner && winner !== team) return 'team-slot loser';
    if (!ready) return 'team-slot pending';
    return 'team-slot clickable';
  };

  return (
    <div className="match-card">
      <div className="match-label">
        <span>{label}</span>
        {map && <span className="map-badge">{map}</span>}
      </div>
      <button
        className={teamClass(team1)}
        onClick={() => team1 && ready && onPick(id, team1)}
        disabled={!ready}
      >
        {team1 ?? '—'}
      </button>
      <div className="match-divider" />
      <button
        className={teamClass(team2)}
        onClick={() => team2 && ready && onPick(id, team2)}
        disabled={!ready}
      >
        {team2 ?? '—'}
      </button>
    </div>
  );
}
