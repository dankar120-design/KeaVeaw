import { MacroAction, ParsedMidiEvent } from '../types/midi';

export interface TapState {
  lastTime: number;
  armed: boolean;
}

export function createTapState(): TapState {
  return { lastTime: -Infinity, armed: true };
}

// INVARIANT: Initialize/reset lastTime to -Infinity so early presses (t < doubleClickMs) never false-trigger macros.
export function checkDoubleTap(
  state: TapState,
  active: boolean,
  rearm: boolean,
  t: number,
  doubleClickMs: number,
  action: MacroAction,
  evs: ParsedMidiEvent[]
): void {
  if (active && state.armed) {
    state.armed = false;
    if (t - state.lastTime < doubleClickMs) {
      evs.push({ type: 'macro', action });
      state.lastTime = -Infinity;
    } else {
      state.lastTime = t;
    }
  } else if (rearm) {
    state.armed = true;
  }
}
