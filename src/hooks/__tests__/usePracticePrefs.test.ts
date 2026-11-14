import { describe, it, expect, vi } from 'vitest';
import { createElement, MutableRefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { usePracticePrefs } from '../usePracticePrefs';
import { getQwertyLabelMap } from '../../utils/qwertyMap';
import type { AudioEngine } from '../../engine/AudioEngine';
import type { SynthPreset } from '../../types/midi';

function createAudioRefMock(setPresetSpy = vi.fn()): MutableRefObject<AudioEngine> {
  return {
    current: {
      setPreset: setPresetSpy,
    } as unknown as AudioEngine,
  };
}

describe('usePracticePrefs hook (#7 / Practice settings)', () => {
  it('initializes with default epiano preset, qwerty hints disabled, and undefined labels', () => {
    const audioRef = createAudioRefMock();
    let result!: ReturnType<typeof usePracticePrefs>;

    renderToStaticMarkup(
      createElement(() => {
        result = usePracticePrefs(audioRef, 0);
        return null;
      })
    );

    expect(result.synthPreset).toBe('epiano');
    expect(result.showQwertyHints).toBe(false);
    expect(result.qwertyLabels).toBeUndefined();
    expect(typeof result.changeSynthPreset).toBe('function');
    expect(typeof result.toggleQwertyHints).toBe('function');
  });

  it('updates synthPreset state and calls audioRef.current.setPreset synchronously', () => {
    const setPresetSpy = vi.fn();
    const audioRef = createAudioRefMock(setPresetSpy);
    let captured!: ReturnType<typeof usePracticePrefs>;
    let triggered = false;

    renderToStaticMarkup(
      createElement(() => {
        const prefs = usePracticePrefs(audioRef, 0);
        if (!triggered) {
          triggered = true;
          prefs.changeSynthPreset('warm_pad');
        }
        captured = prefs;
        return null;
      })
    );

    expect(setPresetSpy).toHaveBeenCalledTimes(1);
    expect(setPresetSpy).toHaveBeenCalledWith('warm_pad');
    expect(captured.synthPreset).toBe<SynthPreset>('warm_pad');
  });

  it('toggles showQwertyHints and derives qwertyLabels from getQwertyLabelMap(octaveShift)', () => {
    const audioRef = createAudioRefMock();
    const octaveShift = 12;
    let captured!: ReturnType<typeof usePracticePrefs>;
    let step = 0;

    renderToStaticMarkup(
      createElement(() => {
        const prefs = usePracticePrefs(audioRef, octaveShift);
        if (step === 0) {
          step = 1;
          prefs.toggleQwertyHints();
        }
        captured = prefs;
        return null;
      })
    );

    expect(captured.showQwertyHints).toBe(true);
    expect(captured.qwertyLabels).toEqual(getQwertyLabelMap(octaveShift));
    expect(captured.qwertyLabels?.[60]).toBe('A');
  });

  it('toggles showQwertyHints back to false and resets qwertyLabels to undefined', () => {
    const audioRef = createAudioRefMock();
    let captured!: ReturnType<typeof usePracticePrefs>;
    let toggles = 0;

    renderToStaticMarkup(
      createElement(() => {
        const prefs = usePracticePrefs(audioRef, 0);
        if (toggles < 2) {
          toggles += 1;
          prefs.toggleQwertyHints();
        }
        captured = prefs;
        return null;
      })
    );

    expect(captured.showQwertyHints).toBe(false);
    expect(captured.qwertyLabels).toBeUndefined();
  });
});
