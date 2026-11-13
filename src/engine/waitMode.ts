import { HandIsolation } from '../types/midi';
import { BeatGroup, findPendingGroup } from './transportHelpers';

export interface QueuedHit { midi: number; timeMs: number }

export interface WaitState {
  completedGroups: Set<number>;
  matchedInPending: Set<number>;
  firstChordHitMs: number | null;
  hitQueue: QueuedHit[];
  speedMultiplier: number;
  isFrozen: boolean;
  missElapsedMs: number;
}

export function createWaitState(): WaitState {
  return {
    completedGroups: new Set(),
    matchedInPending: new Set(),
    firstChordHitMs: null,
    hitQueue: [],
    speedMultiplier: 1,
    isFrozen: false,
    missElapsedMs: 0,
  };
}

// INVARIANT: Early hit cap scales with beat spacing so 180 BPM eighth notes never collide.
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
    const hit = ws.hitQueue.shift()!;
    if ((beat - g.beat) / beatsPerMs < -earlyCapMs) continue;

    const matchIdx = p.user.findIndex((n, idx) => n.midi === hit.midi && !ws.matchedInPending.has(idx));
    if (matchIdx === -1) continue;
    if (ws.matchedInPending.size === 0) ws.firstChordHitMs = hit.timeMs;
    ws.matchedInPending.add(matchIdx);

    if (ws.matchedInPending.size === p.user.length) {
      ws.completedGroups.add(p.idx);
      ws.matchedInPending.clear();
      ws.firstChordHitMs = null;
      if (ws.speedMultiplier < 1 || ws.isFrozen) {
        snappedBeat = g.beat;
        ws.speedMultiplier = 1;
        ws.isFrozen = false;
        ws.missElapsedMs = 0;
      }
      break;
    }
  }
  return snappedBeat;
}

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
  const deltaMs = (beat - groups[p.idx].beat) / beatsPerMs;
  const rollingChord = ws.matchedInPending.size > 0 && ws.firstChordHitMs !== null && nowMs - ws.firstChordHitMs <= 90;
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
