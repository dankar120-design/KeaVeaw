import { MutableRefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { AudioEngine } from '../engine/AudioEngine';
import { AudioState } from '../types/midi';
import { InputSource } from './practiceEffects';

const AUDIO_PROMPT_TIMEOUT_MS = 2500;

export function shouldPromptAudioForInput(source: InputSource, state: AudioState): boolean {
  return source === 'midi' && state !== 'running';
}

export function createAudioPromptController(
  onPromptChange: (visible: boolean) => void,
  timeoutMs = AUDIO_PROMPT_TIMEOUT_MS
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const dispose = () => {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  };
  const clear = () => { dispose(); onPromptChange(false); };
  const trigger = () => {
    dispose();
    onPromptChange(true);
    timer = setTimeout(() => { timer = null; onPromptChange(false); }, timeoutMs);
  };
  return { trigger, clear, dispose };
}

export function useAudioStatus(audioRef: MutableRefObject<AudioEngine>) {
  const [audioState, setAudioState] = useState<AudioState>('suspended');
  const [audioPrompt, setAudioPrompt] = useState(false);
  const controller = useMemo(() => createAudioPromptController(setAudioPrompt), []);

  const syncState = useCallback((next: AudioState) => {
    setAudioState(next);
    if (next === 'running') controller.clear();
  }, [controller]);

  const unlockAudio = useCallback(() => {
    if (audioRef.current.getState() === 'running') return;
    void audioRef.current.resume().then(syncState).catch(() => syncState(audioRef.current.getState()));
  }, [audioRef, syncState]);

  const notifyMidiBlocked = useCallback((source: InputSource = 'midi') => {
    if (shouldPromptAudioForInput(source, audioRef.current.getState())) controller.trigger();
  }, [audioRef, controller]);

  useEffect(() => {
    const audio = audioRef.current;
    syncState(audio.getState());
    audio.setOnStateChange(syncState);
    return () => { audio.setOnStateChange(null); controller.dispose(); };
  }, [audioRef, syncState, controller]);

  return { audioState, audioPrompt, unlockAudio, notifyMidiBlocked };
}
