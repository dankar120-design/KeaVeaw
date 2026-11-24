import { MutableRefObject, useCallback, useRef } from 'react';
import { SONGS } from '../data/songs';
import { AudioEngine } from '../engine/AudioEngine';
import { MidiManager } from '../engine/MidiManager';
import { Transport } from '../engine/Transport';
import { HandIsolation, Song, SustainMode, TransportSnapshot } from '../types/midi';
import { cycleHandIsolation, MultiSourceHoldTracker } from './practiceEffects';

export interface PracticeControlDeps {
  audioRef: MutableRefObject<AudioEngine>;
  midiRef: MutableRefObject<MidiManager>;
  transportRef: MutableRefObject<Transport>;
  playingRef: MutableRefObject<boolean>;
  handRef: MutableRefObject<HandIsolation>;
  holdsRef: MutableRefObject<MultiSourceHoldTracker>;
  setSong: (s: Song) => void;
  setPlaying: (p: boolean) => void;
  setBpm: (b: number) => void;
  setHandIsolation: (m: HandIsolation) => void;
  setSustainMode: (m: SustainMode) => void;
  unlockAudio: () => void;
  commitSnapshot: (snap: TransportSnapshot, preserveUserHeld: boolean) => void;
  syncVisualNotes: () => void;
}

export function usePracticeControls(d: PracticeControlDeps) {
  const lastPlayableHandRef = useRef<HandIsolation>('BOTH');

  const togglePlay = useCallback(() => {
    d.unlockAudio();
    const next = !d.playingRef.current;
    d.playingRef.current = next;
    d.setPlaying(next);
    d.commitSnapshot(d.transportRef.current.setPlaying(next), false);
  }, [d]);

  const resetLoop = useCallback(() => {
    d.commitSnapshot(d.transportRef.current.resetLoop(), false);
  }, [d]);

  const cycleHand = useCallback(() => {
    const next = cycleHandIsolation(d.handRef.current);
    if (next !== 'DEMO') lastPlayableHandRef.current = next;
    d.handRef.current = next;
    d.setHandIsolation(next);
    const snap = d.transportRef.current.setHandIsolation(next);
    d.commitSnapshot(snap, true);
  }, [d]);

  const selectSong = useCallback((songId: string) => {
    const found = SONGS.find((s) => s.id === songId);
    if (!found) return;
    d.playingRef.current = false;
    d.setPlaying(false);
    d.setSong(found);
    d.setBpm(found.bpm);
    d.transportRef.current.setPlaying(false);
    if (d.handRef.current === 'DEMO') {
      const restore = lastPlayableHandRef.current === 'DEMO' ? 'BOTH' : lastPlayableHandRef.current;
      d.handRef.current = restore;
      d.setHandIsolation(restore);
      d.transportRef.current.setHandIsolation(restore);
    }
    d.commitSnapshot(d.transportRef.current.setSong(found), false);
  }, [d]);

  const changeBpm = useCallback((next: number) => {
    const clamped = Math.max(40, Math.min(180, next));
    d.setBpm(clamped);
    d.transportRef.current.setBpm(clamped);
  }, [d]);

  const changeHandIsolation = useCallback((mode: HandIsolation) => {
    if (mode !== 'DEMO') lastPlayableHandRef.current = mode;
    d.handRef.current = mode;
    d.setHandIsolation(mode);
    const snap = d.transportRef.current.setHandIsolation(mode);
    d.commitSnapshot(snap, true);
  }, [d]);

  const toggleDemoPlay = useCallback(() => {
    if (d.handRef.current !== 'DEMO') {
      lastPlayableHandRef.current = d.handRef.current;
      d.unlockAudio();
      d.handRef.current = 'DEMO';
      d.setHandIsolation('DEMO');
      d.commitSnapshot(d.transportRef.current.setHandIsolation('DEMO'), true);
      if (!d.playingRef.current) {
        d.playingRef.current = true;
        d.setPlaying(true);
        d.commitSnapshot(d.transportRef.current.setPlaying(true), false);
      }
      return;
    }
    if (d.playingRef.current) {
      d.playingRef.current = false;
      d.setPlaying(false);
      d.commitSnapshot(d.transportRef.current.setPlaying(false), true);
    }
    const restore = lastPlayableHandRef.current === 'DEMO' ? 'BOTH' : lastPlayableHandRef.current;
    d.handRef.current = restore;
    d.setHandIsolation(restore);
    d.commitSnapshot(d.transportRef.current.setHandIsolation(restore), true);
  }, [d]);

  const changeSustainMode = useCallback((mode: SustainMode) => {
    d.setSustainMode(mode);
    d.audioRef.current.setSustainMode(mode);
    d.syncVisualNotes();
  }, [d]);

  const retryMidi = useCallback(() => {
    for (const m of d.holdsRef.current.releaseSource('midi')) { d.transportRef.current.registerNoteOff?.(m); d.audioRef.current.noteOff(m); }
    d.audioRef.current.setSustainPedal(false);
    d.unlockAudio();
    d.syncVisualNotes();
    void d.midiRef.current.connect();
  }, [d]);

  return {
    togglePlay, toggleDemoPlay, resetLoop, cycleHand, selectSong, changeBpm,
    changeHandIsolation, changeSustainMode, retryMidi, reconnectMidi: retryMidi,
  };
}
