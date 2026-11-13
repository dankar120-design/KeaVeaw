import { describe, it, expect, vi } from 'vitest';
import { KEY_LAYOUTS, WHITE_KEY_COUNT } from '../musicTheory';
import { applyOctaveShift, getOctaveDeltaFromCode, isPlayableKeyEvent, mapCodeToMidi } from '../qwertyMap';

describe('KEY_LAYOUTS 32-key geometry bounds (P3-2)', () => {
  it('defines 19 white keys summing to ~1.0 and 13 black keys inside [0, 1]', () => {
    expect(KEY_LAYOUTS.length).toBe(32);
    const whites = KEY_LAYOUTS.filter((k) => !k.isBlack);
    const blacks = KEY_LAYOUTS.filter((k) => k.isBlack);
    expect(whites.length).toBe(WHITE_KEY_COUNT);
    expect(blacks.length).toBe(13);

    const whiteSum = whites.reduce((sum, k) => sum + k.wNorm, 0);
    expect(whiteSum).toBeCloseTo(1, 5);
    for (const k of KEY_LAYOUTS) {
      expect(k.xNorm).toBeGreaterThanOrEqual(0);
      expect(k.xNorm + k.wNorm).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe('QWERTY input mapping & KeyZ/KeyX guards (P3-3)', () => {
  it('rejects repeat events, modifier combinations, and form-focused targets', () => {
    expect(isPlayableKeyEvent({ repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: null })).toBe(true);
    expect(isPlayableKeyEvent({ repeat: true, ctrlKey: false, metaKey: false, altKey: false, target: null })).toBe(false);
    expect(isPlayableKeyEvent({ repeat: false, ctrlKey: true, metaKey: false, altKey: false, target: null })).toBe(false);
    expect(isPlayableKeyEvent({ repeat: false, ctrlKey: false, metaKey: true, altKey: false, target: null })).toBe(false);
    expect(
      isPlayableKeyEvent({ repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: { tagName: 'SELECT' } as unknown as EventTarget })
    ).toBe(false);
    expect(
      isPlayableKeyEvent({ repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: { tagName: 'DIV', isContentEditable: true } as unknown as EventTarget })
    ).toBe(false);
  });

  it('keeps mapped notes inside 53..84 and flushes held keys on KeyZ/KeyX octave shifts', () => {
    expect(mapCodeToMidi('KeyA', 0)).toBe(53); // F3
    expect(mapCodeToMidi('KeyG', 24)).toBe(84); // C6
    expect(mapCodeToMidi('KeyL', 24)).toBeNull(); // G6 (> 84) -> rejected
    expect(mapCodeToMidi('KeyQ', 0)).toBeNull(); // intentionally unmapped
    expect(mapCodeToMidi('BracketLeft', 0)).toBe(70); // A#4

    expect(getOctaveDeltaFromCode('KeyZ')).toBe(-12);
    expect(getOctaveDeltaFromCode('KeyX')).toBe(12);
    expect(getOctaveDeltaFromCode('BracketRight')).toBe(0);

    const held = new Map<string, number>([['KeyA', 53], ['KeyG', 60]]);
    const released: number[] = [];
    const onRelease = vi.fn((m: number) => released.push(m));

    expect(applyOctaveShift(0, 12, held, onRelease)).toBe(12);
    expect(released).toEqual([53, 60]);
    expect(held.size).toBe(0);
    expect(applyOctaveShift(24, 12, held, onRelease)).toBe(24);
    expect(applyOctaveShift(0, -12, held, onRelease)).toBe(0);
  });
});
