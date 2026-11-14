import { MIDI_MAX, MIDI_MIN, ParsedMidiEvent } from '../types/midi';
import { clampToRange, computeOctaveOffset } from '../utils/musicTheory';

export interface MidiParserOptions {
  now?: () => number;
  doubleClickMs?: number;
}

type TapState = { lastTime: number; armed: boolean };

export class MidiFrameParser {
  private now: () => number;
  private doubleClickMs: number;
  private pitchTap: TapState = { lastTime: 0, armed: true };
  private modTap: TapState = { lastTime: 0, armed: true };
  private lastSustainState = false;
  private autoCenter = false;
  private detectedOffset = 0;
  private activeCenterOffset = 0;
  private activeNoteMap = new Map<number, [number, number]>();

  constructor(opts?: MidiParserOptions) {
    this.now = opts?.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.doubleClickMs = opts?.doubleClickMs ?? 350;
  }

  setAutoCenter(val: boolean): void {
    this.autoCenter = val;
    this.activeCenterOffset = val ? this.detectedOffset : 0;
  }
  getDetectedOffset(): number { return this.detectedOffset; }
  getActiveCenterOffset(): number { return this.activeCenterOffset; }
  clearDetectedOffset(): void { this.detectedOffset = 0; }
  clearCenterOffset(): ParsedMidiEvent[] {
    const evs: ParsedMidiEvent[] = [];
    this.applyOffset(0, evs);
    return evs;
  }

  rebalanceHeldNotes(): ParsedMidiEvent[] {
    const evs: ParsedMidiEvent[] = [];
    for (const [raw, held] of this.activeNoteMap) {
      const next = clampToRange(this.autoCenter ? raw + this.activeCenterOffset : raw);
      if (next === held[0]) continue;
      evs.push({ type: 'noteOff', midi: held[0], rawMidi: raw }, { type: 'noteOn', midi: next, velocity: held[1], rawMidi: raw });
      held[0] = next;
    }
    return evs;
  }

  private applyOffset(nextOffset: number, evs: ParsedMidiEvent[]): void {
    if (nextOffset === this.activeCenterOffset) return;
    this.activeCenterOffset = nextOffset;
    evs.push(...this.rebalanceHeldNotes());
  }

  flush(): ParsedMidiEvent[] {
    const evs: ParsedMidiEvent[] = [];
    this.flushActiveNotes(evs);
    this.resetControllers(evs);
    if (!this.autoCenter) this.activeCenterOffset = 0;
    return evs;
  }

  private flushActiveNotes(evs: ParsedMidiEvent[]): void {
    for (const [rawMidi, [midi]] of this.activeNoteMap) evs.push({ type: 'noteOff', midi, rawMidi });
    this.activeNoteMap.clear();
  }

  private resetControllers(evs: ParsedMidiEvent[]): void {
    if (this.lastSustainState) {
      this.lastSustainState = false;
      evs.push({ type: 'sustain', down: false });
    }
    this.pitchTap = { lastTime: 0, armed: true };
    this.modTap = { lastTime: 0, armed: true };
  }

  private checkDoubleTap(state: TapState, active: boolean, rearm: boolean, t: number, action: 'CYCLE_HAND' | 'LOOP_RESET', evs: ParsedMidiEvent[]): void {
    if (active && state.armed) {
      state.armed = false;
      if (t - state.lastTime < this.doubleClickMs) {
        evs.push({ type: 'macro', action });
        state.lastTime = 0;
      } else {
        state.lastTime = t;
      }
    } else if (rearm) {
      state.armed = true;
    }
  }

  // INVARIANT: Pitch Bend Schmitt hysteresis (>2000 engage, <500 rearm) prevents pitch-ramp false double-clicks.
  parse(data: Uint8Array, timeMs?: number): ParsedMidiEvent[] {
    if (data.length < 2) return [];
    const t = timeMs ?? this.now();
    const status = data[0] & 0xf0;
    const evs: ParsedMidiEvent[] = [];

    if (status === 0x90 || status === 0x80) {
      const raw = data[1];
      const vel = data.length > 2 ? data[2] : 0;
      const isOn = status === 0x90 && vel > 0;
      const offset = computeOctaveOffset(raw);
      if (isOn && !this.autoCenter) {
        const s = raw + this.detectedOffset;
        if (this.detectedOffset !== 0 ? s < MIDI_MIN || s > MIDI_MAX : offset !== 0) this.detectedOffset = offset;
      }
      if (isOn) {
        if (this.autoCenter && (raw + this.activeCenterOffset < MIDI_MIN || raw + this.activeCenterOffset > MIDI_MAX)) {
          this.applyOffset(offset, evs);
        }
        const midi = clampToRange(this.autoCenter ? raw + this.activeCenterOffset : raw);
        this.activeNoteMap.set(raw, [midi, vel / 127]);
        evs.push({ type: 'noteOn', midi, velocity: vel / 127, rawMidi: raw });
      } else {
        const midi = this.activeNoteMap.get(raw)?.[0] ?? clampToRange(this.autoCenter ? raw + this.activeCenterOffset : raw);
        this.activeNoteMap.delete(raw);
        evs.push({ type: 'noteOff', midi, rawMidi: raw });
      }
    } else if (status === 0xb0 && data.length > 2) {
      const [cc, val] = [data[1], data[2]];
      if (cc === 64) {
        const down = val >= 64;
        if (down !== this.lastSustainState) {
          this.lastSustainState = down;
          evs.push({ type: 'sustain', down });
        }
      } else if (cc === 1) {
        this.checkDoubleTap(this.modTap, val > 64, val <= 64, t, 'CYCLE_HAND', evs);
      } else if (cc === 123) {
        this.flushActiveNotes(evs);
      } else if (cc === 120) {
        this.flushActiveNotes(evs);
        this.resetControllers(evs);
      } else if (cc === 121) {
        this.resetControllers(evs);
      }
    } else if (status === 0xe0 && data.length > 2) {
      const delta = Math.abs(((data[2] << 7) | data[1]) - 8192);
      this.checkDoubleTap(this.pitchTap, delta > 2000, delta < 500, t, 'LOOP_RESET', evs);
    }
    return evs;
  }
}
