import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SONGS } from '../data/songs';
import { AudioEngine } from '../engine/AudioEngine';
import { MidiManager } from '../engine/MidiManager';
import { Transport } from '../engine/Transport';
import { AudioState, HandIsolation, MidiStatus, Song, SustainMode, TransportSnapshot } from '../types/midi';
import { HighwayPlaybackState } from '../components/highwayDraw';
import { bindPracticeInputs } from './inputBindings';
import { usePracticeControls } from './usePracticeControls';
import {
  applyTransportEffects,
  buildSnapshotDiffKey,
  combineActiveNotes,
  InputSource,
  MultiSourceHoldTracker,
  setsEqual,
  shouldAutoStartOnPress,
} from './practiceEffects';

export function usePracticeEngine() {
  const audioRef = useRef<AudioEngine>(new AudioEngine());
  const midiRef = useRef<MidiManager>(new MidiManager());
  const transportRef = useRef<Transport>(new Transport(SONGS[0]));
  const drawRef = useRef<(() => void) | null>(null);

  const [song, setSong] = useState<Song>(SONGS[0]);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(SONGS[0].bpm);
  const [handIsolation, setHandIsolation] = useState<HandIsolation>('BOTH');
  const [sustainMode, setSustainMode] = useState<SustainMode>('AUTO_ROOT');
  const [audioState, setAudioState] = useState<AudioState>('suspended');
  const [midiStatus, setMidiStatus] = useState<MidiStatus>(() => midiRef.current.getStatus());
  const [octaveShift, setOctaveShift] = useState(0);
  const [activeNotes, setActiveNotes] = useState<Set<number>>(() => new Set());
  const [sustainedNotes, setSustainedNotes] = useState<Set<number>>(() => new Set());

  const snapshotRef = useRef<TransportSnapshot>(transportRef.current.getSnapshot());
  const [uiSnap, setUiSnap] = useState(() => ({
    waitingNotes: snapshotRef.current.waitingNotes,
    activeChord: snapshotRef.current.activeChord,
  }));

  const holdsRef = useRef(new MultiSourceHoldTracker());
  const autoActiveRef = useRef(new Set<number>());
  const heldQwertyRef = useRef(new Map<string, number>());
  const octaveRef = useRef(0);
  const playingRef = useRef(false);
  const handRef = useRef<HandIsolation>('BOTH');
  const diffKeyRef = useRef('');
  const activeRef = useRef(activeNotes);
  const sustainedRef = useRef(sustainedNotes);

  const syncVisualNotes = useCallback(() => {
    const nextActive = combineActiveNotes(holdsRef.current, autoActiveRef.current);
    if (!setsEqual(nextActive, activeRef.current)) { activeRef.current = nextActive; setActiveNotes(nextActive); }
    const nextSustained = new Set(audioRef.current.getSustainedNotes());
    if (!setsEqual(nextSustained, sustainedRef.current)) { sustainedRef.current = nextSustained; setSustainedNotes(nextSustained); }
  }, []);

  const commitSnapshot = useCallback((snap: TransportSnapshot, preserveUserHeld: boolean) => {
    snapshotRef.current = snap;
    applyTransportEffects(snap, audioRef.current, autoActiveRef.current, preserveUserHeld, holdsRef.current.getActiveMidis());
    if (!preserveUserHeld && snap.allNotesOff) { holdsRef.current.clearAll(); heldQwertyRef.current.clear(); }
    const nextKey = buildSnapshotDiffKey(snap);
    if (nextKey !== diffKeyRef.current) {
      diffKeyRef.current = nextKey;
      setUiSnap({ waitingNotes: snap.waitingNotes, activeChord: snap.activeChord });
    }
    syncVisualNotes();
    drawRef.current?.();
  }, [syncVisualNotes]);

  const unlockAudio = useCallback(() => {
    if (audioRef.current.getState() !== 'running') void audioRef.current.resume().then(setAudioState);
  }, []);

  const pressNote = useCallback((midi: number, src: InputSource, velocity = 0.8) => {
    if (src !== 'midi') unlockAudio();
    if (shouldAutoStartOnPress(snapshotRef.current, playingRef.current, midi)) {
      playingRef.current = true;
      setPlaying(true);
      commitSnapshot(transportRef.current.setPlaying(true), true);
    }
    transportRef.current.registerNoteOn(midi);
    if (holdsRef.current.press(midi, src)) audioRef.current.noteOn(midi, velocity, playingRef.current);
    syncVisualNotes();
  }, [unlockAudio, commitSnapshot, syncVisualNotes]);

  const releaseNote = useCallback((midi: number, src: InputSource) => {
    if (holdsRef.current.release(midi, src)) audioRef.current.noteOff(midi);
    syncVisualNotes();
  }, [syncVisualNotes]);

  const controlDeps = useMemo(() => ({
    audioRef, transportRef, playingRef, handRef, setSong, setPlaying, setBpm,
    setHandIsolation, setSustainMode, unlockAudio, commitSnapshot, syncVisualNotes,
  }), [unlockAudio, commitSnapshot, syncVisualNotes]);
  const controls = usePracticeControls(controlDeps);

  // INVARIANT: Single central rAF runs solely while playing === true to drive Transport -> Audio -> Canvas atomically.
  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      commitSnapshot(transportRef.current.step(dt), true);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, commitSnapshot]);

  useEffect(() => {
    const audio = audioRef.current;
    setAudioState(audio.getState());
    audio.setOnVoiceChange(syncVisualNotes);
    const unbind = bindPracticeInputs({
      midi: midiRef.current, audio, transport: transportRef.current,
      holds: holdsRef.current, heldQwerty: heldQwertyRef.current, octaveRef,
      setMidiStatus, setOctaveShift, pressNote, releaseNote, syncVisualNotes,
      togglePlay: controls.togglePlay, resetLoop: controls.resetLoop, cycleHand: controls.cycleHand, commitSnapshot,
    });
    return () => {
      audio.setOnVoiceChange(null);
      unbind();
    };
  }, [pressNote, releaseNote, controls.togglePlay, controls.resetLoop, controls.cycleHand, commitSnapshot, syncVisualNotes]);

  const getPlaybackState = useCallback((): HighwayPlaybackState => ({
    beat: snapshotRef.current.beat, loopStart: snapshotRef.current.loopStart, loopEnd: snapshotRef.current.loopEnd,
    speedMultiplier: snapshotRef.current.speedMultiplier, isFrozen: snapshotRef.current.isFrozen, activeChord: snapshotRef.current.activeChord,
  }), []);

  return {
    songs: SONGS, song, playing, bpm, handIsolation, sustainMode, audioState, midiStatus, octaveShift,
    activeNotes, sustainedNotes, waitingNotes: uiSnap.waitingNotes, activeChord: uiSnap.activeChord,
    drawRef, getPlaybackState, ...controls, unlockAudio,
    pressPointer: (m: number) => pressNote(m, 'pointer', 0.85),
    releasePointer: (m: number) => releaseNote(m, 'pointer'),
    enableAutoCenter: () => midiRef.current.setAutoCenterOctave(true),
    dismissOctaveWarning: () => midiRef.current.clearOctaveWarning(),
  };
}
