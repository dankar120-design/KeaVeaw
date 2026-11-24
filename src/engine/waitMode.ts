import { HandIsolation, InputSource } from '../types/midi';
import { BeatGroup, findPendingGroup } from './transportHelpers';

export const CHORD_ROLL_WINDOW_MS = 120;

export interface QueuedEvent { type: 'on' | 'off'; midi: number; timeMs: number; source?: InputSource }

export interface WaitState {
  completedGroups: Set<number>;
  matchedInPending: Set<number>;
  pointerMatched: Set<number>;
  firstChordHitMs: number | null;
  hitQueue: QueuedEvent[];
  speedMultiplier: number;
  isFrozen: boolean;
  missElapsedMs: number;
}

export function createWaitState(): WaitState {
  return {
    completedGroups: new Set(),
    matchedInPending: new Set(),
    pointerMatched: new Set(),
    firstChordHitMs: null,
    hitQueue: [],
    speedMultiplier: 1,
    isFrozen: false,
    missElapsedMs: 0,
  };
}

export function clearPartialMatch(ws: WaitState): void {
  ws.matchedInPending.clear();
  ws.pointerMatched.clear();
  ws.firstChordHitMs = null;
}

// INVARIANT: Early hit cap scales with beat spacing so 180 BPM eighth notes never collide.
// INVARIANT: Multi-note Wait-Mode requires all notes within CHORD_ROLL_WINDOW_MS without wrong hits or early release.
export function consumeHits(
  ws: WaitState,
  groups: BeatGroup[],
  isolation: HandIsolation,
  loopStart: number,
  loopEnd: number,
  beat: number,
  beatsPerMs: number
): number | null {
  let snappedBeat: number | null = null;
  while (ws.hitQueue.length > 0) {
    const p = findPendingGroup(groups, ws.completedGroups, isolation, loopStart, loopEnd);
    if (!p) { ws.hitQueue = []; break; }
    const g = groups[p.idx];
    const gapMs = (p.nextUserBeat !== null ? Math.max(0.25, p.nextUserBeat - g.beat) : 0.5) / beatsPerMs;
    const earlyCapMs = Math.min(200, gapMs * 0.45);
    const ev = ws.hitQueue.shift()!;
    if (ev.type === 'off') {
      if (p.user.length > 1 && ws.matchedInPending.size > 0) {
        for (const idx of ws.matchedInPending) {
          if (p.user[idx].midi === ev.midi && !ws.pointerMatched.has(idx)) {
            clearPartialMatch(ws);
            break;
          }
        }
      }
      continue;
    }
    if ((beat - g.beat) / beatsPerMs < -earlyCapMs) continue;
    if (
      p.user.length > 1 && ws.firstChordHitMs !== null &&
      ev.timeMs - ws.firstChordHitMs > CHORD_ROLL_WINDOW_MS &&
      !(ws.pointerMatched.size === ws.matchedInPending.size && ev.source === 'pointer')
    ) clearPartialMatch(ws);

    const matchIdx = p.user.findIndex((n, idx) => n.midi === ev.midi && !ws.matchedInPending.has(idx));
    if (matchIdx === -1) {
      if (p.user.length > 1 && ws.matchedInPending.size > 0) {
        if (!p.user.some((n) => n.midi === ev.midi)) {
          clearPartialMatch(ws);
        } else if (ws.matchedInPending.size === 1 && ws.pointerMatched.size === 0 && !ws.isFrozen && ws.speedMultiplier === 1) {
          ws.firstChordHitMs = ev.timeMs;
        }
      }
      continue;
    }
    if (ws.matchedInPending.size === 0) ws.firstChordHitMs = ev.timeMs;
    ws.matchedInPending.add(matchIdx);
    if (ev.source === 'pointer') ws.pointerMatched.add(matchIdx);

    if (ws.matchedInPending.size === p.user.length) {
      ws.completedGroups.add(p.idx);
      clearPartialMatch(ws);
      if (ws.speedMultiplier < 1 || ws.isFrozen || (beat - g.beat) / beatsPerMs > 120) {
        snappedBeat = g.beat;
        ws.speedMultiplier = 1;
        ws.isFrozen = false;
        ws.missElapsedMs = 0;
      }
      while (ws.hitQueue.length > 0 && ws.hitQueue[0].type === 'on' && ws.hitQueue[0].timeMs - ev.timeMs <= 25) ws.hitQueue.shift();
      break;
    }
  }
  return snappedBeat;
}

// INVARIANT: Chord roll grace only prevents initial slowdown within 120 + CHORD_ROLL_WINDOW_MS and never unfreezes frozen/slowed transport.
export function updateFreezeState(
  ws: WaitState,
  groups: BeatGroup[],
  isolation: HandIsolation,
  loopStart: number,
  loopEnd: number,
  beat: number,
  dtMs: number,
  beatsPerMs: number,
  nowMs: number
): void {
  const p = findPendingGroup(groups, ws.completedGroups, isolation, loopStart, loopEnd);
  if (!p) { ws.missElapsedMs = 0; ws.speedMultiplier = 1; ws.isFrozen = false; return; }
  if (ws.matchedInPending.size > 0 && ws.pointerMatched.size < ws.matchedInPending.size && ws.firstChordHitMs !== null && nowMs - ws.firstChordHitMs > CHORD_ROLL_WINDOW_MS) {
    clearPartialMatch(ws);
  }
  const deltaMs = (beat - groups[p.idx].beat) / beatsPerMs;
  const rollingChord =
    !ws.isFrozen &&
    ws.speedMultiplier === 1 &&
    deltaMs <= 120 + CHORD_ROLL_WINDOW_MS &&
    ws.matchedInPending.size > 0 &&
    ws.pointerMatched.size === 0 &&
    ws.firstChordHitMs !== null &&
    nowMs - ws.firstChordHitMs <= CHORD_ROLL_WINDOW_MS;
  if (deltaMs > 120 && !rollingChord) {
    ws.missElapsedMs += dtMs;
    ws.speedMultiplier = Math.max(0, 1 - ws.missElapsedMs / 150);
    ws.isFrozen = ws.speedMultiplier === 0;
  } else {
    ws.missElapsedMs = 0;
    ws.speedMultiplier = 1;
    ws.isFrozen = false;
  }
}
