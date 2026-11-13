import { AudioEngine } from '../engine/AudioEngine';
import { MidiManager } from '../engine/MidiManager';
import { Transport } from '../engine/Transport';
import { MidiStatus, TransportSnapshot } from '../types/midi';
import { applyOctaveShift, getOctaveDeltaFromCode, isPlayableKeyEvent, mapCodeToMidi } from '../utils/qwertyMap';
import { InputSource, MultiSourceHoldTracker } from './practiceEffects';

export interface InputBindingsDeps {
  midi: MidiManager;
  audio: AudioEngine;
  transport: Transport;
  holds: MultiSourceHoldTracker;
  heldQwerty: Map<string, number>;
  octaveRef: { current: number };
  setMidiStatus: (s: MidiStatus) => void;
  setOctaveShift: (shift: number) => void;
  pressNote: (midi: number, src: InputSource, velocity?: number) => void;
  releaseNote: (midi: number, src: InputSource) => void;
  syncVisualNotes: () => void;
  togglePlay: () => void;
  resetLoop: () => void;
  cycleHand: () => void;
  commitSnapshot: (snap: TransportSnapshot, preserveUserHeld: boolean) => void;
}

export function bindPracticeInputs(d: InputBindingsDeps): () => void {
  const unsubStatus = d.midi.onStatusChange(d.setMidiStatus);
  const unsubEvent = d.midi.onEvent((ev) => {
    if (ev.type === 'noteOn') d.pressNote(ev.midi, 'midi', ev.velocity);
    else if (ev.type === 'noteOff') d.releaseNote(ev.midi, 'midi');
    else if (ev.type === 'sustain') { d.audio.setSustainPedal(ev.down); d.syncVisualNotes(); }
    else if (ev.action === 'LOOP_RESET') d.resetLoop();
    else if (ev.action === 'CYCLE_HAND') d.cycleHand();
  });
  void d.midi.connect();

  // INVARIANT: Capture Space on keydown/keyup so focused HUD buttons never double-trigger on Space release.
  const onKeyDown = (e: KeyboardEvent) => {
    if (!isPlayableKeyEvent(e)) return;
    if (e.code === 'Space') {
      e.preventDefault(); e.stopPropagation();
      if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
      d.togglePlay();
      return;
    }
    if (e.shiftKey && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
      e.preventDefault();
      d.commitSnapshot(d.transport.shiftLoop(e.code === 'ArrowLeft' ? -4 : 4), false);
      return;
    }
    const delta = getOctaveDeltaFromCode(e.code);
    if (delta !== 0) {
      e.preventDefault();
      d.octaveRef.current = applyOctaveShift(d.octaveRef.current, delta, d.heldQwerty, (m) => d.releaseNote(m, 'qwerty'));
      d.setOctaveShift(d.octaveRef.current);
      return;
    }
    const mapped = e.shiftKey ? null : mapCodeToMidi(e.code, d.octaveRef.current);
    if (mapped !== null) {
      e.preventDefault();
      d.heldQwerty.set(e.code, mapped);
      d.pressNote(mapped, 'qwerty', 0.8);
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' && isPlayableKeyEvent(e)) { e.preventDefault(); e.stopPropagation(); return; }
    const held = d.heldQwerty.get(e.code);
    if (held !== undefined) { d.heldQwerty.delete(e.code); d.releaseNote(held, 'qwerty'); }
  };

  const onBlur = () => {
    d.heldQwerty.clear();
    for (const m of [...d.holds.releaseSource('qwerty'), ...d.holds.releaseSource('pointer')]) d.audio.noteOff(m);
    d.syncVisualNotes();
  };

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);

  return () => {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    window.removeEventListener('blur', onBlur);
    unsubEvent();
    unsubStatus();
    d.midi.disconnect();
    d.audio.dispose();
  };
}
