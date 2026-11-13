import { MutableRefObject, useCallback } from 'react';
import { SONGS } from '../data/songs';
import { AudioEngine } from '../engine/AudioEngine';
import { MidiManager } from '../engine/MidiManager';
import { Transport } from '../engine/Transport';
import { HandIsolation, Song, SustainMode, TransportSnapshot } from '../types/midi';
import { cycleHandIsolation } from './practiceEffects';

export interface PracticeControlDeps {
  audioRef: MutableRefObject<AudioEngine>;
  midiRef: MutableRefObject<MidiManager>;
  transportRef: MutableRefObject<Transport>;
  playingRef: MutableRefObject<boolean>;
  handRef: MutableRefObject<HandIsolation>;
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
    d.handRef.current = next;
    d.setHandIsolation(next);
    d.transportRef.current.setHandIsolation(next);
    d.commitSnapshot(d.transportRef.current.getSnapshot(), true);
  }, [d]);

  const selectSong = useCallback((songId: string) => {
    const found = SONGS.find((s) => s.id === songId);
    if (!found) return;
    d.playingRef.current = false;
    d.setPlaying(false);
    d.setSong(found);
    d.setBpm(found.bpm);
    d.transportRef.current.setPlaying(false);
    d.commitSnapshot(d.transportRef.current.setSong(found), false);
  }, [d]);

  const changeBpm = useCallback((next: number) => {
    const clamped = Math.max(40, Math.min(180, next));
    d.setBpm(clamped);
    d.transportRef.current.setBpm(clamped);
  }, [d]);

  const changeHandIsolation = useCallback((mode: HandIsolation) => {
    d.handRef.current = mode;
    d.setHandIsolation(mode);
    d.transportRef.current.setHandIsolation(mode);
    d.commitSnapshot(d.transportRef.current.getSnapshot(), true);
  }, [d]);

  const changeSustainMode = useCallback((mode: SustainMode) => {
    d.setSustainMode(mode);
    d.audioRef.current.setSustainMode(mode);
    d.syncVisualNotes();
  }, [d]);

  const retryMidi = useCallback(() => {
    void d.midiRef.current.connect();
  }, [d]);

  return { togglePlay, resetLoop, cycleHand, selectSong, changeBpm, changeHandIsolation, changeSustainMode, retryMidi };
}
