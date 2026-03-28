'use client';

import { useEffect, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragEndEvent, useDroppable, useDraggable,
} from '@dnd-kit/core';
import { BracketState, MATCHES, MatchId, shuffleTeams, randomMaps } from '@/lib/bracket';

const LS_KEY = 'cs2_bracket';

function loadState(): BracketState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { seeds: shuffleTeams(), winners: {}, maps: randomMaps() };
}
function saveState(s: BracketState) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

// ── Draggable player chip ──────────────────────────
function PlayerChip({ id, name, dim }: { id: string; name: string; dim?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`player-chip${isDragging ? ' chip-dragging' : ''}${dim ? ' chip-dim' : ''}`}
    >
      {name}
    </div>
  );
}

// ── Droppable slot ─────────────────────────────────
function Slot({
  slotId, player, winner, isWinner, isLoser, isPending, onClick,
}: {
  slotId: string;
  player: string | null;
  winner: string | null;
  isWinner: boolean;
  isLoser: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const cls = [
    'bracket-slot',
    isWinner ? 'slot-winner' : '',
    isLoser ? 'slot-loser' : '',
    isPending ? 'slot-pending' : '',
    isOver ? 'slot-over' : '',
    !player ? 'slot-empty' : '',
  ].filter(Boolean).join(' ');

  return (
    <div ref={setNodeRef} className={cls} onClick={onClick}>
      {player ? (
        <PlayerChip id={`slot:${slotId}`} name={player} />
      ) : (
        <span className="slot-tbd">TBD</span>
      )}
    </div>
  );
}

// ── A single match block ───────────────────────────
function MatchBlock({
  matchId, label, map, t1, t2, winner,
  t1SlotId, t2SlotId,
  onPick,
}: {
  matchId: MatchId;
  label: string;
  map?: string;
  t1: string | null;
  t2: string | null;
  winner: string | null;
  t1SlotId: string;
  t2SlotId: string;
  onPick: (matchId: MatchId, team: string) => void;
}) {
  const ready = !!(t1 && t2);
  return (
    <div className="ctrl-match">
      <div className="ctrl-match-head">
        <span>{label}</span>
        {map && <span className="map-badge">{map}</span>}
      </div>
      <Slot
        slotId={t1SlotId}
        player={t1}
        winner={winner}
        isWinner={winner === t1}
        isLoser={!!(winner && winner !== t1)}
        isPending={!ready}
        onClick={() => t1 && ready && onPick(matchId, t1)}
      />
      <div className="ctrl-divider" />
      <Slot
        slotId={t2SlotId}
        player={t2}
        winner={winner}
        isWinner={winner === t2}
        isLoser={!!(winner && winner !== t2)}
        isPending={!ready}
        onClick={() => t2 && ready && onPick(matchId, t2)}
      />
    </div>
  );
}

// ── Main control panel ─────────────────────────────
export default function ControlPanel() {
  const [state, setState] = useState<BracketState | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => { setState(loadState()); }, []);

  function update(next: BracketState) {
    setState(next);
    saveState(next);
  }

  function setWinner(matchId: MatchId, team: string) {
    if (!state) return;
    const next: BracketState = { ...state, winners: { ...state.winners, [matchId]: team } };
    const downstream: Partial<Record<MatchId, MatchId[]>> = {
      r1m1: ['qf2', 'sf2', 'final'],
      r1m2: ['qf1', 'sf1', 'final'],
      qf1: ['sf1', 'final'], qf2: ['sf2', 'final'],
      qf3: ['sf2', 'final'], qf4: ['sf1', 'final'],
      sf1: ['final'], sf2: ['final'],
    };
    for (const mid of downstream[matchId] ?? []) {
      const def = MATCHES.find(m => m.id === mid)!;
      const w = next.winners[mid];
      if (w && w !== def.getTeam1(next) && w !== def.getTeam2(next)) delete next.winners[mid];
    }
    update(next);
  }

  function handleDragStart(e: DragStartEvent) {
    setDragging(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setDragging(null);
    if (!state || !e.over) return;
    const from = String(e.active.id); // either "pool:Name" or "slot:slotId"
    const to = String(e.over.id);     // "slot:slotId"
    if (!to.startsWith('slot:')) return;

    const toSlotId = to.replace('slot:', '');
    const fromName = from.startsWith('pool:') ? from.replace('pool:', '')
                   : from.startsWith('slot:') ? playerAtSlot(state, from.replace('slot:', ''))
                   : null;
    if (!fromName) return;

    const toName = playerAtSlot(state, toSlotId);
    const newSeeds = [...state.seeds];

    const fromIdx = newSeeds.indexOf(fromName);
    const toIdx   = toName ? newSeeds.indexOf(toName) : -1;

    if (fromIdx === -1) return;
    if (toIdx !== -1) {
      // Swap
      [newSeeds[fromIdx], newSeeds[toIdx]] = [newSeeds[toIdx], newSeeds[fromIdx]];
    } else {
      // Drop onto an auto-populated TBD slot — ignore
      return;
    }

    update({ ...state, seeds: newSeeds, winners: {} });
  }

  if (!state) return <div className="loading">Loading...</div>;

  const s = state.seeds;
  const w = state.winners;
  const m = state.maps ?? {};

  // Slot IDs map to seed indices
  const slotMap: Record<string, number> = {
    'r1m1_1': 6, 'r1m1_2': 9,
    'r1m2_1': 7, 'r1m2_2': 8,
    'qf1_1':  0,
    'qf2_1':  1,
    'qf3_1':  2, 'qf3_2': 5,
    'qf4_1':  3, 'qf4_2': 4,
  };

  const champion = w['final'];

  const roundLabels: Record<MatchId, string> = {
    r1m1: 'Play-in 1', r1m2: 'Play-in 2',
    qf1: 'QF 1', qf2: 'QF 2', qf3: 'QF 3', qf4: 'QF 4',
    sf1: 'Semi 1', sf2: 'Semi 2', final: 'Grand Final',
  };

  // Players not yet placed in a draggable slot (SF/Final are auto)
  const allPlayers = s;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bracket-wrapper">
        <header className="bracket-header">
          <div className="header-left">
            <div className="cs2-logo">CS2</div>
            <div>
              <h1>Control Panel</h1>
              <p className="subtitle">Drag players between slots · Click to advance</p>
            </div>
          </div>
          <div className="header-right">
            <button className="action-btn" onClick={() => update({ ...state, maps: randomMaps() })}>
              Randomize Maps
            </button>
            <button className="action-btn" onClick={() => {
              if (!confirm('Re-randomize players? Clears all results.')) return;
              update({ seeds: shuffleTeams(), winners: {}, maps: m });
            }}>
              Randomize Players
            </button>
            <button className="reset-btn" onClick={() => {
              if (!confirm('Reset everything?')) return;
              update({ seeds: shuffleTeams(), winners: {}, maps: randomMaps() });
            }}>Reset</button>
            <a href="/" className="action-btn">← Bracket</a>
          </div>
        </header>

        {champion && (
          <div className="champion-banner">🏆 Champion: <strong>{champion}</strong></div>
        )}

        <div className="ctrl-layout">
          {/* Player pool */}
          <div className="ctrl-pool">
            <div className="round-label">Players</div>
            <p className="control-hint">Drag into bracket slots</p>
            {allPlayers.map((name, i) => (
              <div key={name} className="pool-row">
                <span className="seed-num">#{i + 1}</span>
                <PlayerChip id={`pool:${name}`} name={name} />
              </div>
            ))}
          </div>

          {/* Bracket */}
          <div className="ctrl-bracket">
            {/* Play-in */}
            <div className="ctrl-round">
              <div className="round-label">Play-in</div>
              <MatchBlock matchId="r1m1" label={roundLabels.r1m1} map={m.r1m1}
                t1={s[6]} t2={s[9]} winner={w.r1m1 ?? null}
                t1SlotId="r1m1_1" t2SlotId="r1m1_2" onPick={setWinner} />
              <MatchBlock matchId="r1m2" label={roundLabels.r1m2} map={m.r1m2}
                t1={s[7]} t2={s[8]} winner={w.r1m2 ?? null}
                t1SlotId="r1m2_1" t2SlotId="r1m2_2" onPick={setWinner} />
            </div>

            {/* Quarterfinals */}
            <div className="ctrl-round">
              <div className="round-label">Quarterfinals</div>
              {(['qf1','qf2','qf3','qf4'] as MatchId[]).map(id => {
                const def = MATCHES.find(m => m.id === id)!;
                const t1 = def.getTeam1(state);
                const t2 = def.getTeam2(state);
                // Which slots are draggable (initial seeds, not play-in winners)
                const t1SlotId = id === 'qf1' ? 'qf1_1' : id === 'qf2' ? 'qf2_1' : id === 'qf3' ? 'qf3_1' : 'qf4_1';
                const t2SlotId = id === 'qf1' ? 'qf1_win' : id === 'qf2' ? 'qf2_win' : id === 'qf3' ? 'qf3_2' : 'qf4_2';
                return (
                  <MatchBlock key={id} matchId={id} label={roundLabels[id]} map={m[id]}
                    t1={t1} t2={t2} winner={w[id] ?? null}
                    t1SlotId={t1SlotId} t2SlotId={t2SlotId} onPick={setWinner} />
                );
              })}
            </div>

            {/* Semifinals */}
            <div className="ctrl-round">
              <div className="round-label">Semifinals</div>
              {(['sf1','sf2'] as MatchId[]).map(id => {
                const def = MATCHES.find(m => m.id === id)!;
                return (
                  <MatchBlock key={id} matchId={id} label={roundLabels[id]} map={m[id]}
                    t1={def.getTeam1(state)} t2={def.getTeam2(state)} winner={w[id] ?? null}
                    t1SlotId={`${id}_1`} t2SlotId={`${id}_2`} onPick={setWinner} />
                );
              })}
            </div>

            {/* Final */}
            <div className="ctrl-round">
              <div className="round-label">Final</div>
              <MatchBlock matchId="final" label={roundLabels.final} map={m.final}
                t1={MATCHES.find(m => m.id === 'final')!.getTeam1(state)}
                t2={MATCHES.find(m => m.id === 'final')!.getTeam2(state)}
                winner={w.final ?? null}
                t1SlotId="final_1" t2SlotId="final_2" onPick={setWinner} />
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {dragging && (
          <div className="player-chip chip-overlay">
            {dragging.startsWith('pool:') ? dragging.replace('pool:', '')
             : dragging.startsWith('slot:') ? (playerAtSlot(state, dragging.replace('slot:', '')) ?? '?')
             : '?'}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function playerAtSlot(state: BracketState, slotId: string): string | null {
  const slotMap: Record<string, number> = {
    'r1m1_1': 6, 'r1m1_2': 9,
    'r1m2_1': 7, 'r1m2_2': 8,
    'qf1_1': 0, 'qf2_1': 1,
    'qf3_1': 2, 'qf3_2': 5,
    'qf4_1': 3, 'qf4_2': 4,
  };
  const idx = slotMap[slotId];
  return idx !== undefined ? (state.seeds[idx] ?? null) : null;
}
