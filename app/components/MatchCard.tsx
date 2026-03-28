'use client';

import { MatchId } from '@/lib/bracket';

interface Props {
  id: MatchId;
  label: string;
  team1: string | null;
  team2: string | null;
  winner: string | null;
  onPick: (matchId: MatchId, team: string) => void;
  locked?: boolean; // teams not yet determined
}

export default function MatchCard({ id, label, team1, team2, winner, onPick, locked }: Props) {
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
      <div className="match-label">{label}</div>
      <button
        className={teamClass(team1)}
        onClick={() => team1 && ready && !locked && onPick(id, team1)}
        disabled={!ready || !!locked}
      >
        {team1 ?? '—'}
      </button>
      <div className="match-divider" />
      <button
        className={teamClass(team2)}
        onClick={() => team2 && ready && !locked && onPick(id, team2)}
        disabled={!ready || !!locked}
      >
        {team2 ?? '—'}
      </button>
    </div>
  );
}
