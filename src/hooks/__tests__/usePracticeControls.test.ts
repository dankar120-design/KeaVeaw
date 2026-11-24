import { describe, it, expect, vi } from 'vitest';
import { createElement, MutableRefObject } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { usePracticeControls, PracticeControlDeps } from '../usePracticeControls';
import { MultiSourceHoldTracker } from '../practiceEffects';
import type { AudioEngine } from '../../engine/AudioEngine';
import type { MidiManager } from '../../engine/MidiManager';
import type { Transport } from '../../engine/Transport';
import type { HandIsolation, TransportSnapshot } from '../../types/midi';

function makeSnap(overrides: Partial<TransportSnapshot> = {}): TransportSnapshot {
  return {
    beat: 0,
    loopStart: 0,
    loopEnd: 16,
    playing: false,
    speedMultiplier: 1,
    isFrozen: false,
    waitingNotes: [],
    activeChord: null,
    autoNoteOns: [],
    autoNoteOffs: [],
    shouldClearSustain: false,
    allNotesOff: false,
    ...overrides,
  };
}

function createDeps(initialHand: HandIsolation = 'RIGHT_ONLY', initialPlaying = false) {
  const playingRef = { current: initialPlaying };
  const handRef = { current: initialHand };
  const setPlaying = vi.fn();
  const setHandIsolation = vi.fn();
  const unlockAudio = vi.fn();
  const commitSnapshot = vi.fn();
  const transportSetPlaying = vi.fn((p: boolean) => makeSnap({ playing: p }));
  const transportSetHand = vi.fn((_m: HandIsolation) => makeSnap({ playing: playingRef.current }));

  const deps: PracticeControlDeps = {
    audioRef: { current: { setSustainMode: vi.fn(), noteOff: vi.fn(), setSustainPedal: vi.fn() } as unknown as AudioEngine },
    midiRef: { current: { connect: vi.fn() } as unknown as MidiManager },
    transportRef: {
      current: {
        setPlaying: transportSetPlaying,
        setHandIsolation: transportSetHand,
        resetLoop: vi.fn(() => makeSnap()),
        setSong: vi.fn(() => makeSnap()),
        setBpm: vi.fn(),
      } as unknown as Transport,
    },
    playingRef: playingRef as MutableRefObject<boolean>,
    handRef: handRef as MutableRefObject<HandIsolation>,
    holdsRef: { current: new MultiSourceHoldTracker() },
    setSong: vi.fn(),
    setPlaying,
    setBpm: vi.fn(),
    setHandIsolation,
    setSustainMode: vi.fn(),
    unlockAudio,
    commitSnapshot,
    syncVisualNotes: vi.fn(),
  };

  return {
    deps,
    playingRef,
    handRef,
    setPlaying,
    setHandIsolation,
    unlockAudio,
    commitSnapshot,
    transportSetPlaying,
    transportSetHand,
  };
}

describe('usePracticeControls toggleDemoPlay', () => {
  it('unlocks audio, switches RIGHT_ONLY -> DEMO with playing=true, then pauses and restores RIGHT_ONLY', () => {
    const ctx = createDeps('RIGHT_ONLY', false);
    let controls!: ReturnType<typeof usePracticeControls>;

    renderToStaticMarkup(
      createElement(() => {
        controls = usePracticeControls(ctx.deps);
        controls.toggleDemoPlay();
        expect(ctx.unlockAudio).toHaveBeenCalledTimes(1);
        expect(ctx.handRef.current).toBe('DEMO');
        expect(ctx.setHandIsolation).toHaveBeenLastCalledWith('DEMO');
        expect(ctx.transportSetHand).toHaveBeenLastCalledWith('DEMO');
        expect(ctx.playingRef.current).toBe(true);
        expect(ctx.setPlaying).toHaveBeenLastCalledWith(true);
        expect(ctx.transportSetPlaying).toHaveBeenLastCalledWith(true);
        expect(ctx.commitSnapshot).toHaveBeenCalledTimes(2);

        controls.toggleDemoPlay();
        return null;
      })
    );

    expect(ctx.playingRef.current).toBe(false);
    expect(ctx.setPlaying).toHaveBeenLastCalledWith(false);
    expect(ctx.transportSetPlaying).toHaveBeenLastCalledWith(false);
    expect(ctx.commitSnapshot).toHaveBeenNthCalledWith(3, expect.objectContaining({ playing: false }), true);
    expect(ctx.handRef.current).toBe('RIGHT_ONLY');
    expect(ctx.setHandIsolation).toHaveBeenLastCalledWith('RIGHT_ONLY');
    expect(ctx.transportSetHand).toHaveBeenLastCalledWith('RIGHT_ONLY');
    expect(ctx.commitSnapshot).toHaveBeenCalledTimes(4);
  });

  it('tracks last playable hand via changeHandIsolation and cycleHand before entering DEMO', () => {
    const ctx = createDeps('BOTH', false);

    renderToStaticMarkup(
      createElement(() => {
        const controls = usePracticeControls(ctx.deps);
        controls.changeHandIsolation('LEFT_ONLY');
        controls.toggleDemoPlay();
        expect(ctx.handRef.current).toBe('DEMO');
        expect(ctx.playingRef.current).toBe(true);

        controls.toggleDemoPlay();
        expect(ctx.handRef.current).toBe('LEFT_ONLY');
        expect(ctx.playingRef.current).toBe(false);

        controls.cycleHand(); // LEFT_ONLY -> BOTH
        controls.toggleDemoPlay();
        expect(ctx.handRef.current).toBe('DEMO');

        controls.toggleDemoPlay();
        expect(ctx.handRef.current).toBe('BOTH');
        return null;
      })
    );
  });

  it('restores lastPlayableHandRef when selectSong is called in DEMO', () => {
    const ctx = createDeps('RIGHT_ONLY', false);
    renderToStaticMarkup(createElement(() => {
      const controls = usePracticeControls(ctx.deps);
      controls.toggleDemoPlay();
      controls.selectSong('classic-fur-elise');
      return null;
    }));
    expect(ctx.playingRef.current).toBe(false);
    expect(ctx.handRef.current).toBe('RIGHT_ONLY');
    expect(ctx.setHandIsolation).toHaveBeenLastCalledWith('RIGHT_ONLY');
    expect(ctx.transportSetHand).toHaveBeenLastCalledWith('RIGHT_ONLY');
  });
});
