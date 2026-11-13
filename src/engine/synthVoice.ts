export interface ActiveVoice {
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  subGain: GainNode;
  filter: BiquadFilterNode;
  gain: GainNode;
  startedAt: number;
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function createSynthVoice(ctx: AudioContext, midi: number, velocity: number): ActiveVoice {
  const now = ctx.currentTime;
  const freq = midiToFreq(midi);
  const peak = Math.max(0.08, Math.min(1, velocity)) * 0.22;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const subGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(freq, now);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, now);
  subGain.gain.setValueAtTime(0.24, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(4800, freq * 5.5), now);

  // INVARIANT: Exponential decay reaches near-silence (0.0001) at 2.8s so sustained/wrong notes never drone infinitely.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.25), now + 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

  osc1.connect(filter);
  osc2.connect(subGain);
  subGain.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc1.start(now);
  osc2.start(now);

  return { osc1, osc2, subGain, filter, gain, startedAt: now };
}

export function disconnectVoiceNodes(v: ActiveVoice): void {
  v.osc1.disconnect();
  v.osc2.disconnect();
  v.subGain.disconnect();
  v.filter.disconnect();
  v.gain.disconnect();
}

export function fadeVoice(ctx: AudioContext, v: ActiveVoice, releaseMs: number): void {
  const now = ctx.currentTime;
  const dur = Math.max(0.02, releaseMs / 1000);
  v.gain.gain.cancelScheduledValues(now);
  v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), now);
  v.gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  v.osc1.onended = () => disconnectVoiceNodes(v);
  v.osc1.stop(now + dur + 0.01);
  v.osc2.stop(now + dur + 0.01);
}

export function stopVoiceNow(v: ActiveVoice): void {
  try {
    v.osc1.stop();
    v.osc2.stop();
  } catch { /* already stopped */ }
  disconnectVoiceNodes(v);
}
