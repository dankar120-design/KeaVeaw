import { ParsedMidiEvent } from '../types/midi';
import { clampToRange } from '../utils/musicTheory';

// INVARIANT: Emit all noteOffs before noteOns so shifted pitches never cancel an overlapping held destination key.
export function rebalanceNoteMap(
  noteMap: Map<number, [number, number]>,
  autoCenter: boolean,
  offset: number
): ParsedMidiEvent[] {
  const moved: Array<[number, number, number, number]> = [];
  const unchanged = new Set<number>();
  for (const [raw, held] of noteMap) {
    const next = clampToRange(autoCenter ? raw + offset : raw);
    if (next === held[0]) { unchanged.add(next); continue; }
    moved.push([raw, held[0], next, held[1]]);
    held[0] = next;
  }
  const evs: ParsedMidiEvent[] = [];
  const seenOff = new Set<number>();
  for (const [raw, oldMidi] of moved) {
    if (unchanged.has(oldMidi) || seenOff.has(oldMidi)) continue;
    seenOff.add(oldMidi);
    evs.push({ type: 'noteOff', midi: oldMidi, rawMidi: raw });
  }
  const seenOn = new Set<number>();
  for (const [raw, , nextMidi, vel] of moved) {
    if (unchanged.has(nextMidi) || seenOn.has(nextMidi)) continue;
    seenOn.add(nextMidi);
    evs.push({ type: 'noteOn', midi: nextMidi, velocity: vel, rawMidi: raw, rebalance: true });
  }
  return evs;
}
