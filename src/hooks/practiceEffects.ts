import { HandIsolation, TransportSnapshot } from '../types/midi';

export type InputSource = 'midi' | 'qwerty' | 'pointer';

export interface AudioEffectSink {
  noteOn(midi: number, velocity?: number, isSongMode?: boolean): void;
  noteOff(midi: number): void;
  clearSustain(): void;
  allNotesOff(): void;
}

// INVARIANT: Track holds per source so overlapping QWERTY/pointer/MIDI presses never clip on single-source release.
export class MultiSourceHoldTracker {
  private holds = new Map<number, Set<InputSource>>();

  press(midi: number, source: InputSource): boolean {
    let sources = this.holds.get(midi);
    const wasEmpty = !sources || sources.size === 0;
    if (!sources) {
      sources = new Set();
      this.holds.set(midi, sources);
    }
    sources.add(source);
    return wasEmpty;
  }

  release(midi: number, source: InputSource): boolean {
    const sources = this.holds.get(midi);
    if (!sources || !sources.delete(source)) return false;
    if (sources.size === 0) {
      this.holds.delete(midi);
      return true;
    }
    return false;
  }

  releaseSource(source: InputSource): number[] {
    const released: number[] = [];
    for (const [midi, sources] of this.holds) {
      if (sources.delete(source) && sources.size === 0) {
        this.holds.delete(midi);
        released.push(midi);
      }
    }
    return released;
  }

  clearAll(): void {
    this.holds.clear();
  }

  getActiveMidis(): Set<number> {
    return new Set(this.holds.keys());
  }
}

export function applyTransportEffects(
  snap: TransportSnapshot,
  audio: AudioEffectSink,
  autoActive: Set<number>,
  preserveUserHeld = false,
  userHeldMidis?: Set<number>
): boolean {
  if (snap.allNotesOff) {
    if (preserveUserHeld) {
      for (const midi of new Set([...snap.autoNoteOffs, ...autoActive])) {
        if (!userHeldMidis?.has(midi)) audio.noteOff(midi);
      }
      autoActive.clear();
      audio.clearSustain();
      return true;
    }
    audio.allNotesOff();
    autoActive.clear();
    return true;
  }
  if (snap.shouldClearSustain) audio.clearSustain();
  for (const midi of snap.autoNoteOffs) {
    audio.noteOff(midi);
    autoActive.delete(midi);
  }
  for (const note of snap.autoNoteOns) {
    audio.noteOn(note.midi, 0.72, true);
    autoActive.add(note.midi);
  }
  return snap.shouldClearSustain || snap.autoNoteOffs.length > 0 || snap.autoNoteOns.length > 0;
}

export function cycleHandIsolation(mode: HandIsolation): HandIsolation {
  if (mode === 'BOTH') return 'RIGHT_ONLY';
  if (mode === 'RIGHT_ONLY') return 'LEFT_ONLY';
  return 'BOTH';
}

export function combineActiveNotes(userHolds: MultiSourceHoldTracker, autoActive: Set<number>): Set<number> {
  const combined = userHolds.getActiveMidis();
  for (const m of autoActive) combined.add(m);
  return combined;
}

export function buildSnapshotDiffKey(snap: TransportSnapshot): string {
  const chord = snap.activeChord ? `${snap.activeChord.beat}:${snap.activeChord.symbol}` : '';
  const wait = snap.waitingNotes.map((n) => `${n.midi}:${n.hand}:${n.finger ?? ''}`).join(',');
  return `${snap.isFrozen ? 1 : 0}|${chord}|${wait}`;
}

export function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function shouldAutoStartOnPress(snap: TransportSnapshot, isPlaying: boolean, midi: number): boolean {
  return !isPlaying
    && Math.abs(snap.beat - snap.loopStart) < 1e-4
    && snap.waitingNotes.some((w) => w.midi === midi);
}
