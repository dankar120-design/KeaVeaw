import { ActiveVoice, fadeVoice, stopVoiceNow } from './synthVoice';

export function clearVoiceTimer(
  voiceTimers: Map<number, ReturnType<typeof setTimeout>>,
  midi: number
): void {
  const timer = voiceTimers.get(midi);
  if (timer !== undefined) {
    clearTimeout(timer);
    voiceTimers.delete(midi);
  }
}

export function takeVoice(
  voices: Map<number, ActiveVoice>,
  voiceTimers: Map<number, ReturnType<typeof setTimeout>>,
  midi: number
): ActiveVoice | undefined {
  clearVoiceTimer(voiceTimers, midi);
  const v = voices.get(midi);
  if (v) voices.delete(midi);
  return v;
}

export function fadeAndStopVoice(
  ctx: AudioContext | null,
  voices: Map<number, ActiveVoice>,
  voiceTimers: Map<number, ReturnType<typeof setTimeout>>,
  midi: number,
  releaseMs: number
): void {
  const v = takeVoice(voices, voiceTimers, midi);
  if (v && ctx) fadeVoice(ctx, v, releaseMs);
}

export function forceStopVoice(
  voices: Map<number, ActiveVoice>,
  voiceTimers: Map<number, ReturnType<typeof setTimeout>>,
  midi: number
): void {
  const v = takeVoice(voices, voiceTimers, midi);
  if (v) stopVoiceNow(v);
}

export function stealOldestVoice(
  voices: Map<number, ActiveVoice>,
  voiceTimers: Map<number, ReturnType<typeof setTimeout>>
): void {
  let oldestMidi: number | null = null;
  let oldestTime = Infinity;
  for (const [m, v] of voices) {
    if (v.startedAt < oldestTime) {
      oldestTime = v.startedAt;
      oldestMidi = m;
    }
  }
  if (oldestMidi !== null) forceStopVoice(voices, voiceTimers, oldestMidi);
}
