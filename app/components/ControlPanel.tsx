'use client';

import { useEffect, useState } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

function SeedItem({ name, index }: { name: string; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: name });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`seed-item${isDragging ? ' dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className="seed-num">#{index + 1}</span>
      <span className="seed-name">{name}</span>
      <span className="drag-handle">⠿</span>
    </div>
  );
}

export default function ControlPanel() {
  const [state, setState] = useState<BracketState | null>(null);

  useEffect(() => { setState(loadState()); }, []);

  function update(next: BracketState) {
    setState(next);
    saveState(next);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!state) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = state.seeds.indexOf(active.id as string);
    const newIndex = state.seeds.indexOf(over.id as string);
    const newSeeds = arrayMove(state.seeds, oldIndex, newIndex);

    // Clear all winners since matchups changed
    update({ ...state, seeds: newSeeds, winners: {} });
  }

  function setWinner(matchId: MatchId, team: string) {
    if (!state) return;
    const next: BracketState = { ...state, winners: { ...state.winners, [matchId]: team } };

    const downstream: Partial<Record<MatchId, MatchId[]>> = {
      r1m1: ['qf2', 'sf2', 'final'],
      r1m2: ['qf1', 'sf1', 'final'],
      qf1: ['sf1', 'final'],
      qf2: ['sf2', 'final'],
      qf3: ['sf2', 'final'],
      qf4: ['sf1', 'final'],
      sf1: ['final'],
      sf2: ['final'],
    };

    for (const mid of downstream[matchId] ?? []) {
      const match = MATCHES.find(m => m.id === mid)!;
      const w = next.winners[mid];
      if (w && w !== match.getTeam1(next) && w !== match.getTeam2(next)) {
        delete next.winners[mid];
      }
    }

    update(next);
  }

  const sensors = useSensors(useSensor(PointerSensor));

  if (!state) return <div className="loading">Loading...</div>;

  const roundLabels: Record<MatchId, string> = {
    r1m1: 'Play-in 1', r1m2: 'Play-in 2',
    qf1: 'QF 1', qf2: 'QF 2', qf3: 'QF 3', qf4: 'QF 4',
    sf1: 'SF 1', sf2: 'SF 2', final: 'Grand Final',
  };

  const champion = state.winners['final'];

  return (
    <div className="bracket-wrapper">
      <header className="bracket-header">
        <div className="header-left">
          <div className="cs2-logo">CS2</div>
          <div>
            <h1>Control Panel</h1>
            <p className="subtitle">Drag to reseed · Click to advance</p>
          </div>
        </div>
        <div className="header-right">
          <a href="/" className="action-btn">← Bracket View</a>
        </div>
      </header>

      {champion && (
        <div className="champion-banner">
          🏆 Champion: <strong>{champion}</strong>
        </div>
      )}

      <div className="control-layout">
        {/* Left: draggable seeds */}
        <div className="control-seeds">
          <div className="round-label">Player Seedings</div>
          <p className="control-hint">Drag to reorder · changes who plays who</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={state.seeds} strategy={verticalListSortingStrategy}>
              {state.seeds.map((name, i) => (
                <SeedItem key={name} name={name} index={i} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Right: match results */}
        <div className="control-matches">
          <div className="round-label">Match Results</div>
          <p className="control-hint">Click a team to set as winner</p>
          {MATCHES.map(def => {
            const t1 = def.getTeam1(state);
            const t2 = def.getTeam2(state);
            const w = state.winners[def.id] ?? null;
            const ready = t1 && t2;
            return (
              <div key={def.id} className="control-match">
                <div className="control-match-label">
                  <span>{roundLabels[def.id]}</span>
                  {state.maps?.[def.id] && (
                    <span className="map-badge">{state.maps[def.id]}</span>
                  )}
                </div>
                <div className="control-match-teams">
                  <button
                    className={`control-team${w === t1 ? ' winner' : ''}${w && w !== t1 ? ' loser' : ''}${!ready ? ' pending' : ''}`}
                    onClick={() => t1 && ready && setWinner(def.id, t1)}
                    disabled={!ready}
                  >
                    {t1 ?? '—'}
                  </button>
                  <span className="vs">vs</span>
                  <button
                    className={`control-team${w === t2 ? ' winner' : ''}${w && w !== t2 ? ' loser' : ''}${!ready ? ' pending' : ''}`}
                    onClick={() => t2 && ready && setWinner(def.id, t2)}
                    disabled={!ready}
                  >
                    {t2 ?? '—'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
