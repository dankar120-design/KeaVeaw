// INVARIANT: Tracks pointerId -> (midi | null) across multi-touch & preserves pointers during glissando out-of-bounds slides.
export type PointerMap = Map<number, number | null>;

function hasMidi(map: PointerMap, midi: number): boolean {
  for (const m of map.values()) {
    if (m === midi) return true;
  }
  return false;
}

function countMidi(map: PointerMap, midi: number): number {
  let count = 0;
  for (const m of map.values()) {
    if (m === midi) count++;
  }
  return count;
}

export function pressKeyPointer(
  map: PointerMap,
  pointerId: number,
  midi: number,
  onNoteOn: (midi: number) => void
): void {
  if (map.has(pointerId)) return;
  const alreadyHeld = hasMidi(map, midi);
  map.set(pointerId, midi);
  if (!alreadyHeld) onNoteOn(midi);
}

export function moveKeyPointer(
  map: PointerMap,
  pointerId: number,
  nextMidi: number | null,
  onNoteOn: (midi: number) => void,
  onNoteOff: (midi: number) => void
): void {
  if (!map.has(pointerId)) return;
  const current = map.get(pointerId) ?? null;
  if (current === nextMidi) return;

  map.set(pointerId, nextMidi);
  if (current !== null && !hasMidi(map, current)) {
    onNoteOff(current);
  }
  if (nextMidi !== null && countMidi(map, nextMidi) === 1) {
    onNoteOn(nextMidi);
  }
}

export function releaseKeyPointer(
  map: PointerMap,
  pointerId: number,
  onNoteOff: (midi: number) => void
): void {
  if (!map.has(pointerId)) return;
  const current = map.get(pointerId) ?? null;
  map.delete(pointerId);
  if (current !== null && !hasMidi(map, current)) {
    onNoteOff(current);
  }
}

export function clearKeyPointers(
  map: PointerMap,
  onNoteOff?: (midi: number) => void
): void {
  const active = new Set<number>();
  for (const m of map.values()) {
    if (m !== null) active.add(m);
  }
  map.clear();
  if (onNoteOff) {
    for (const m of active) onNoteOff(m);
  }
}

export interface KeyButtonKeyEvent {
  key: string;
  repeat?: boolean;
  preventDefault?: () => void;
}

// INVARIANT: Only handles Enter for keyboard navigation; Space is intentionally bypassed for global transport playback (DEC-010).
export function handleKeyButtonKeyDown(
  e: KeyButtonKeyEvent,
  midi: number,
  activeKeySet: Set<number>,
  onNoteOn: (midi: number) => void
): void {
  if (e.key !== 'Enter' || e.repeat || activeKeySet.has(midi)) return;
  e.preventDefault?.();
  activeKeySet.add(midi);
  onNoteOn(midi);
}

export function handleKeyButtonKeyUp(
  e: KeyButtonKeyEvent,
  midi: number,
  activeKeySet: Set<number>,
  onNoteOff: (midi: number) => void
): void {
  if (e.key !== 'Enter' || !activeKeySet.has(midi)) return;
  e.preventDefault?.();
  activeKeySet.delete(midi);
  onNoteOff(midi);
}
