export const MIDI_MIN = 48; // C3
export const MIDI_MAX = 79; // G5

export type Hand = 'L' | 'R';
export type HandIsolation = 'BOTH' | 'RIGHT_ONLY' | 'LEFT_ONLY' | 'DEMO';
export type SustainMode = 'AUTO_ROOT' | 'LATCH_TOGGLE' | 'MOMENTARY';
export type SynthPreset = 'epiano' | 'bell' | 'warm_pad';
export type NoteRole = 'root' | 'fifth' | 'third' | 'seventh' | 'melody';
export type AudioState = 'suspended' | 'running';
export type MacroAction = 'LOOP_RESET' | 'CYCLE_HAND';

export interface SongNote {
  beat: number;
  duration: number;
  midi: number;
  hand: Hand;
  role: NoteRole;
  finger?: 1 | 2 | 3 | 4 | 5;
  sustainClear?: boolean;
}

export interface ChordMarker {
  beat: number;
  symbol: string;
  rootMidi: number;
}

export interface SongSection {
  id: string;
  name: string;
  startBeat: number;
  endBeat: number;
  chords: ChordMarker[];
}

export interface Song {
  id: string;
  title: string;
  bpm: number;
  timeSignature: [number, number];
  sections: SongSection[];
  notes: SongNote[];
}

export type ParsedMidiEvent =
  | { type: 'noteOn'; midi: number; velocity: number; rawMidi: number; rebalance?: boolean }
  | { type: 'noteOff'; midi: number; rawMidi: number }
  | { type: 'sustain'; down: boolean }
  | { type: 'macro'; action: MacroAction };

export interface MidiStatus {
  supported: boolean;
  connected: boolean;
  deviceName: string | null;
  error: string | null;
  errorKind?: 'notice' | 'error';
  detectedOctaveOffset: number;
  autoCenterOctave: boolean;
  activeCenterOffset?: number;
}

export interface TransportSnapshot {
  beat: number;
  loopStart: number;
  loopEnd: number;
  playing: boolean;
  speedMultiplier: number;
  isFrozen: boolean;
  waitingNotes: SongNote[];
  activeChord: ChordMarker | null;
  autoNoteOns: SongNote[];
  autoNoteOffs: number[];
  shouldClearSustain: boolean;
  allNotesOff: boolean;
}

export interface KeyLayout {
  midi: number;
  name: string;
  isBlack: boolean;
  xNorm: number;
  wNorm: number;
}
