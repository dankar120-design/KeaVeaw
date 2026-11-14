import { describe, it, expect, vi } from 'vitest';
import {
  pressKeyPointer,
  moveKeyPointer,
  releaseKeyPointer,
  clearKeyPointers,
  handleKeyButtonKeyDown,
  handleKeyButtonKeyUp,
} from '../keyboardPointer';

describe('keyboardPointer pure glissando & multi-touch logic', () => {
  it('pressKeyPointer tracks pointerId -> midi and deduplicates noteOn across pointers', () => {
    const map = new Map<number, number | null>();
    const onNoteOn = vi.fn();

    pressKeyPointer(map, 1, 60, onNoteOn);
    expect(map.get(1)).toBe(60);
    expect(onNoteOn).toHaveBeenCalledTimes(1);
    expect(onNoteOn).toHaveBeenCalledWith(60);

    // Same pointer ignored
    pressKeyPointer(map, 1, 62, onNoteOn);
    expect(map.get(1)).toBe(60);
    expect(onNoteOn).toHaveBeenCalledTimes(1);

    // Second pointer on same midi does not fire noteOn again
    pressKeyPointer(map, 2, 60, onNoteOn);
    expect(map.get(2)).toBe(60);
    expect(onNoteOn).toHaveBeenCalledTimes(1);
  });

  it('moveKeyPointer releases old note and fires new note, and preserves pointerId when sliding outside (null)', () => {
    const map = new Map<number, number | null>([[1, 60]]);
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();

    // Moving on same note is no-op
    moveKeyPointer(map, 1, 60, onNoteOn, onNoteOff);
    expect(onNoteOn).not.toHaveBeenCalled();
    expect(onNoteOff).not.toHaveBeenCalled();

    // Glissando to note 62
    moveKeyPointer(map, 1, 62, onNoteOn, onNoteOff);
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(onNoteOn).toHaveBeenCalledWith(62);
    expect(map.get(1)).toBe(62);

    // Slide outside keyboard surface: noteOff fires, pointerId kept with null
    moveKeyPointer(map, 1, null, onNoteOn, onNoteOff);
    expect(onNoteOff).toHaveBeenCalledWith(62);
    expect(map.has(1)).toBe(true);
    expect(map.get(1)).toBeNull();

    // Slide back into note 64 resumes glissando
    moveKeyPointer(map, 1, 64, onNoteOn, onNoteOff);
    expect(onNoteOn).toHaveBeenCalledWith(64);
    expect(map.get(1)).toBe(64);

    // Pointer not in map is ignored
    moveKeyPointer(map, 99, 64, onNoteOn, onNoteOff);
    expect(onNoteOn).toHaveBeenCalledTimes(2);
  });

  it('releaseKeyPointer releases note only when no other pointer holds it', () => {
    const map = new Map<number, number | null>([[1, 60], [2, 60]]);
    const onNoteOff = vi.fn();

    // Releasing pointer 1 does not fire noteOff because pointer 2 still holds 60
    releaseKeyPointer(map, 1, onNoteOff);
    expect(map.has(1)).toBe(false);
    expect(onNoteOff).not.toHaveBeenCalled();

    // Releasing pointer 2 now fires noteOff
    releaseKeyPointer(map, 2, onNoteOff);
    expect(map.has(2)).toBe(false);
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(onNoteOff).toHaveBeenCalledTimes(1);

    // Unknown pointer is no-op
    releaseKeyPointer(map, 99, onNoteOff);
    expect(onNoteOff).toHaveBeenCalledTimes(1);
  });

  it('clearKeyPointers flushes map and emits noteOff once per unique active midi', () => {
    const map = new Map<number, number | null>([[1, 60], [2, 60], [3, 64], [4, null]]);
    const onNoteOff = vi.fn();

    clearKeyPointers(map, onNoteOff);
    expect(map.size).toBe(0);
    expect(onNoteOff).toHaveBeenCalledTimes(2);
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(onNoteOff).toHaveBeenCalledWith(64);
  });

  it('handleKeyButtonKeyDown/Up handles Enter without repeat and ignores Space', () => {
    const activeKeys = new Set<number>();
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();

    // Space is ignored
    const spacePrevent = vi.fn();
    handleKeyButtonKeyDown({ key: ' ', repeat: false, preventDefault: spacePrevent }, 60, activeKeys, onNoteOn);
    expect(onNoteOn).not.toHaveBeenCalled();
    expect(spacePrevent).not.toHaveBeenCalled();
    expect(activeKeys.has(60)).toBe(false);

    // Enter press triggers noteOn
    const enterPrevent = vi.fn();
    handleKeyButtonKeyDown({ key: 'Enter', repeat: false, preventDefault: enterPrevent }, 60, activeKeys, onNoteOn);
    expect(onNoteOn).toHaveBeenCalledWith(60);
    expect(enterPrevent).toHaveBeenCalledTimes(1);
    expect(activeKeys.has(60)).toBe(true);

    // Repeat Enter is ignored
    handleKeyButtonKeyDown({ key: 'Enter', repeat: true, preventDefault: enterPrevent }, 60, activeKeys, onNoteOn);
    expect(onNoteOn).toHaveBeenCalledTimes(1);

    // Space Up is ignored
    handleKeyButtonKeyUp({ key: ' ' }, 60, activeKeys, onNoteOff);
    expect(onNoteOff).not.toHaveBeenCalled();
    expect(activeKeys.has(60)).toBe(true);

    // Enter Up triggers noteOff
    const enterUpPrevent = vi.fn();
    handleKeyButtonKeyUp({ key: 'Enter', preventDefault: enterUpPrevent }, 60, activeKeys, onNoteOff);
    expect(onNoteOff).toHaveBeenCalledWith(60);
    expect(enterUpPrevent).toHaveBeenCalledTimes(1);
    expect(activeKeys.has(60)).toBe(false);
  });
});
