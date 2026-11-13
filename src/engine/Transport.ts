import { HandIsolation, Song, SongNote, TransportSnapshot } from '../types/midi';
import {
  ActiveAutoVoice, BeatGroup, buildBeatGroups, collectAutoEvents, findActiveChord, findPendingGroup, getSongEndBeat,
} from './transportHelpers';
import { consumeHits, createWaitState, updateFreezeState, WaitState } from './waitMode';

export class Transport {
  private song: Song;
  private groups: BeatGroup[];
  private bpm: number;
  private handIsolation: HandIsolation = 'BOTH';
  private playing = false;
  private beat = 0;
  private loopStart = 0;
  private loopEnd: number;
  private triggeredAutoGroups = new Set<number>();
  private activeAuto: ActiveAutoVoice[] = [];
  private ws: WaitState = createWaitState();
  private now: () => number;

  constructor(song: Song, now?: () => number) {
    this.now = now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.song = song;
    this.groups = buildBeatGroups(song);
    this.bpm = song.bpm;
    this.loopEnd = getSongEndBeat(song);
  }

  setSong(song: Song): TransportSnapshot {
    this.song = song;
    this.groups = buildBeatGroups(song);
    this.bpm = song.bpm;
    this.loopStart = 0;
    this.loopEnd = getSongEndBeat(song);
    return this.resetLoop();
  }

  setBpm(bpm: number): void { this.bpm = Math.max(40, Math.min(180, Math.round(bpm))); }
  getBpm(): number { return this.bpm; }
  setHandIsolation(mode: HandIsolation): void { this.handIsolation = mode; this.ws.matchedInPending.clear(); }
  getHandIsolation(): HandIsolation { return this.handIsolation; }
  getSnapshot(): TransportSnapshot { return this.snapshot([], [], false, false); }

  setPlaying(playing: boolean): TransportSnapshot {
    this.playing = playing;
    if (!playing) this.activeAuto = [];
    return this.snapshot([], [], false, !playing);
  }

  resetLoop(): TransportSnapshot {
    this.beat = this.loopStart;
    this.clearCycleState();
    return this.snapshot([], [], true, true);
  }

  shiftLoop(deltaBeats: number): TransportSnapshot {
    const maxBeat = getSongEndBeat(this.song);
    this.beat = Math.max(0, Math.min(maxBeat - 0.5, this.beat + deltaBeats));
    this.clearCycleState();
    for (let i = 0; i < this.groups.length; i++) {
      if (this.groups[i].beat < this.beat - 1e-4) {
        this.ws.completedGroups.add(i);
        this.triggeredAutoGroups.add(i);
      }
    }
    return this.snapshot([], [], true, true);
  }

  // INVARIANT: Wait-Mode matches discrete NoteOn hits (edge-triggered), never held keys.
  registerNoteOn(midi: number, timeMs?: number): void {
    if (!this.playing) return;
    this.ws.hitQueue.push({ midi, timeMs: timeMs ?? this.now() });
  }

  step(rawDtMs: number): TransportSnapshot {
    if (!this.playing) return this.snapshot([], [], false, false);
    const dtMs = Math.max(0, Math.min(50, rawDtMs));
    const beatsPerMs = this.bpm / 60000;
    const nowMs = this.now();

    const snapped = consumeHits(
      this.ws, this.groups, this.handIsolation, this.loopStart, this.loopEnd, this.beat, beatsPerMs
    );
    if (snapped !== null) this.beat = snapped;

    updateFreezeState(
      this.ws, this.groups, this.handIsolation, this.loopStart, this.loopEnd, this.beat, dtMs, beatsPerMs, nowMs
    );

    const nextBeat = this.beat + dtMs * beatsPerMs * this.ws.speedMultiplier;
    const evs = collectAutoEvents(
      this.groups, this.triggeredAutoGroups, this.activeAuto, this.handIsolation,
      this.loopStart, this.loopEnd, nextBeat
    );
    this.activeAuto = evs.remaining;
    this.beat = nextBeat;

    let allNotesOff = false;
    let clearSustain = evs.shouldClearSustain;
    if (this.beat >= this.loopEnd) {
      for (const v of this.activeAuto) evs.autoNoteOffs.push(v.midi);
      this.beat = this.loopStart + (this.beat - this.loopEnd);
      this.clearCycleState();
      allNotesOff = true;
      clearSustain = true;
    }
    return this.snapshot(evs.autoNoteOns, evs.autoNoteOffs, clearSustain, allNotesOff);
  }

  private clearCycleState(): void {
    this.triggeredAutoGroups.clear();
    this.activeAuto = [];
    this.ws = createWaitState();
  }

  private snapshot(autoNoteOns: SongNote[], autoNoteOffs: number[], shouldClearSustain: boolean, allNotesOff: boolean): TransportSnapshot {
    const showWaiting = this.playing || Math.abs(this.beat - this.loopStart) < 1e-4;
    const p = showWaiting
      ? findPendingGroup(this.groups, this.ws.completedGroups, this.handIsolation, this.loopStart, this.loopEnd)
      : null;
    return {
      beat: this.beat, loopStart: this.loopStart, loopEnd: this.loopEnd,
      playing: this.playing, speedMultiplier: this.ws.speedMultiplier, isFrozen: this.ws.isFrozen,
      waitingNotes: p ? p.user.filter((_, i) => !this.ws.matchedInPending.has(i)) : [],
      activeChord: findActiveChord(this.song, this.beat),
      autoNoteOns, autoNoteOffs, shouldClearSustain, allNotesOff,
    };
  }
}
