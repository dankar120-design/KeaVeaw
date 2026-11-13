import { ParsedMidiEvent } from '../types/midi';
import { clampToRange, computeOctaveOffset } from '../utils/musicTheory';

export interface MidiParserOptions {
  now?: () => number;
  doubleClickMs?: number;
}

export class MidiFrameParser {
  private now: () => number;
  private doubleClickMs: number;
  private lastPitchTime = 0;
  private lastModTime = 0;
  private pitchArmed = true;
  private modArmed = true;
  private lastSustainState = false;
  private autoCenter = false;
  private detectedOffset = 0;
  private activeNoteMap = new Map<number, number>();

  constructor(opts?: MidiParserOptions) {
    this.now = opts?.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.doubleClickMs = opts?.doubleClickMs ?? 350;
  }

  setAutoCenter(val: boolean): void { this.autoCenter = val; }
  getDetectedOffset(): number { return this.detectedOffset; }
  clearDetectedOffset(): void { this.detectedOffset = 0; }

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
      if (isOn && offset !== 0 && !this.autoCenter) this.detectedOffset = offset;
      let midi: number;
      if (isOn) {
        midi = clampToRange(this.autoCenter ? raw + offset : raw);
        this.activeNoteMap.set(raw, midi);
      } else {
        midi = this.activeNoteMap.get(raw) ?? clampToRange(this.autoCenter ? raw + offset : raw);
        this.activeNoteMap.delete(raw);
      }
      evs.push(isOn ? { type: 'noteOn', midi, velocity: vel / 127, rawMidi: raw } : { type: 'noteOff', midi, rawMidi: raw });
    } else if (status === 0xb0 && data.length > 2) {
      const [cc, val] = [data[1], data[2]];
      if (cc === 64) {
        const down = val >= 64;
        if (down !== this.lastSustainState) {
          this.lastSustainState = down;
          evs.push({ type: 'sustain', down });
        }
      } else if (cc === 1) {
        if (val > 64 && this.modArmed) {
          this.modArmed = false;
          if (t - this.lastModTime < this.doubleClickMs) {
            evs.push({ type: 'macro', action: 'CYCLE_HAND' });
            this.lastModTime = 0;
          } else {
            this.lastModTime = t;
          }
        } else if (val <= 64) {
          this.modArmed = true;
        }
      }
    } else if (status === 0xe0 && data.length > 2) {
      const delta = Math.abs(((data[2] << 7) | data[1]) - 8192);
      if (delta > 2000 && this.pitchArmed) {
        this.pitchArmed = false;
        if (t - this.lastPitchTime < this.doubleClickMs) {
          evs.push({ type: 'macro', action: 'LOOP_RESET' });
          this.lastPitchTime = 0;
        } else {
          this.lastPitchTime = t;
        }
      } else if (delta < 500) {
        this.pitchArmed = true;
      }
    }
    return evs;
  }
}
