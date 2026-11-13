import { ChordMarker, HandIsolation, Song, SongNote } from '../types/midi';

export interface BeatGroup {
  beat: number;
  notes: SongNote[];
  sustainClear: boolean;
}

export interface ActiveAutoVoice {
  midi: number;
  offBeat: number;
}

export function buildBeatGroups(song: Song): BeatGroup[] {
  const groups: BeatGroup[] = [];
  const sorted = [...song.notes].sort((a, b) => a.beat - b.beat || a.midi - b.midi);
  const chordBeats = new Set<number>();
  for (const sec of song.sections) {
    for (const c of sec.chords) chordBeats.add(c.beat);
  }
  for (const n of sorted) {
    const last = groups[groups.length - 1];
    const hasChordChange = Array.from(chordBeats).some((cb) => Math.abs(cb - n.beat) < 1e-4);
    if (last && Math.abs(last.beat - n.beat) < 1e-4) {
      last.notes.push(n);
      if (n.sustainClear || hasChordChange) last.sustainClear = true;
    } else {
      groups.push({ beat: n.beat, notes: [n], sustainClear: Boolean(n.sustainClear || hasChordChange) });
    }
  }
  return groups;
}

export function splitHands(notes: SongNote[], isolation: HandIsolation): { user: SongNote[]; auto: SongNote[] } {
  if (isolation === 'BOTH') return { user: notes, auto: [] };
  const targetHand = isolation === 'RIGHT_ONLY' ? 'R' : 'L';
  return { user: notes.filter((n) => n.hand === targetHand), auto: notes.filter((n) => n.hand !== targetHand) };
}

export function findPendingGroup(
  groups: BeatGroup[],
  completed: Set<number>,
  isolation: HandIsolation,
  loopStart: number,
  loopEnd: number
): { idx: number; user: SongNote[]; nextUserBeat: number | null } | null {
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.beat < loopStart - 1e-4 || g.beat >= loopEnd || completed.has(i)) continue;
    const { user } = splitHands(g.notes, isolation);
    if (user.length === 0) continue;
    let nextUserBeat: number | null = null;
    for (let j = i + 1; j < groups.length && groups[j].beat < loopEnd; j++) {
      if (splitHands(groups[j].notes, isolation).user.length > 0) {
        nextUserBeat = groups[j].beat;
        break;
      }
    }
    return { idx: i, user, nextUserBeat };
  }
  return null;
}

// INVARIANT: Track triggered set instead of prevBeat lower-bound so beat === loopStart triggers after wrap overshoot.
export function collectAutoEvents(
  groups: BeatGroup[],
  triggered: Set<number>,
  activeAuto: ActiveAutoVoice[],
  isolation: HandIsolation,
  loopStart: number,
  loopEnd: number,
  nextBeat: number
) {
  const autoNoteOns: SongNote[] = [];
  const autoNoteOffs: number[] = [];
  let shouldClearSustain = false;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (g.beat < loopStart - 1e-4 || g.beat >= loopEnd) continue;
    if (!triggered.has(i) && g.beat <= nextBeat + 1e-4) {
      triggered.add(i);
      if (g.sustainClear) shouldClearSustain = true;
      for (const n of splitHands(g.notes, isolation).auto) {
        autoNoteOns.push(n);
        activeAuto.push({ midi: n.midi, offBeat: g.beat + n.duration });
      }
    }
  }
  const remaining = activeAuto.filter((v) => {
    if (nextBeat >= v.offBeat - 1e-4) {
      autoNoteOffs.push(v.midi);
      return false;
    }
    return true;
  });
  return { autoNoteOns, autoNoteOffs, shouldClearSustain, remaining };
}

export function findActiveChord(song: Song, beat: number): ChordMarker | null {
  let active: ChordMarker | null = null;
  for (const sec of song.sections) {
    for (const c of sec.chords) {
      if (c.beat <= beat + 1e-4) active = c;
    }
  }
  return active ?? song.sections[0]?.chords[0] ?? null;
}

export function getSongEndBeat(song: Song): number {
  const secEnd = song.sections.reduce((max, s) => Math.max(max, s.endBeat), 0);
  const noteEnd = song.notes.reduce((max, n) => Math.max(max, n.beat + n.duration), 0);
  return Math.max(secEnd, noteEnd, 4);
}
