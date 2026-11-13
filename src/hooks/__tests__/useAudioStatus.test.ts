import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAudioPromptController, shouldPromptAudioForInput } from '../useAudioStatus';

describe('useAudioStatus prompt controller & input routing (#6)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers MIDI audio prompt only for midi source while suspended', () => {
    expect(shouldPromptAudioForInput('midi', 'suspended')).toBe(true);
    expect(shouldPromptAudioForInput('midi', 'running')).toBe(false);
    expect(shouldPromptAudioForInput('pointer', 'suspended')).toBe(false);
    expect(shouldPromptAudioForInput('qwerty', 'suspended')).toBe(false);
  });

  it('auto-clears audio prompt after 2500 ms, resets on retrigger, and cancels on dispose()', () => {
    const spy = vi.fn();
    const ctrl = createAudioPromptController(spy);

    ctrl.trigger();
    expect(spy).toHaveBeenLastCalledWith(true);

    vi.advanceTimersByTime(1500);
    ctrl.trigger(); // re-trigger extends timer for another 2500 ms
    vi.advanceTimersByTime(1500);
    expect(spy).not.toHaveBeenLastCalledWith(false);

    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenLastCalledWith(false);

    spy.mockClear();
    ctrl.trigger();
    ctrl.dispose();
    vi.advanceTimersByTime(3000);
    expect(spy).toHaveBeenCalledTimes(1); // dispose prevents timer firing false after unmount
  });
});
