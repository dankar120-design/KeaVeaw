import { Hand, MIDI_MAX, MIDI_MIN, NoteRole, SongNote } from '../types/midi';

export type NoteTuple = [
  offsetBeat: number,
  duration: number,
  midi: number,
  hand: Hand,
  role: NoteRole,
  finger?: 1 | 2 | 3 | 4 | 5,
  sustainClear?: boolean,
];

export function note(
  beat: number,
  duration: number,
  midi: number,
  hand: Hand,
  role: NoteRole,
  finger?: 1 | 2 | 3 | 4 | 5,
  sustainClear?: boolean
): SongNote {
  if (midi < MIDI_MIN || midi > MIDI_MAX) {
    throw new Error(`SongNote midi ${midi} out of Keystation 32 range (${MIDI_MIN}..${MIDI_MAX})`);
  }
  return { beat, duration, midi, hand, role, finger, sustainClear };
}

export function buildBar(barStartBeat: number, tuples: NoteTuple[]): SongNote[] {
  return tuples.map(([offset, dur, midi, hand, role, finger, sustainClear]) =>
    note(barStartBeat + offset, dur, midi, hand, role, finger, sustainClear)
  );
}

export function sortSongNotes(notes: SongNote[]): SongNote[] {
  return [...notes].sort((a, b) => a.beat - b.beat || a.midi - b.midi);
}
