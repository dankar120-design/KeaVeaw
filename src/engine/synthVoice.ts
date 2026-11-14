import { SynthPreset } from '../types/midi';

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

interface PresetConfig {
  osc1Type: OscillatorType;
  osc2Multiplier: number;
  subGain: number;
  filterCutoff: (freq: number) => number;
  peakFactor: number;
  attack: number;
  decayMid: number;
  decayEnd: number;
}

const PRESETS: Record<SynthPreset, PresetConfig> = {
  epiano: {
    osc1Type: 'triangle',
    osc2Multiplier: 2,
    subGain: 0.24,
    filterCutoff: (f) => Math.min(4800, f * 5.5),
    peakFactor: 0.22,
    attack: 0.006,
    decayMid: 0.7,
    decayEnd: 2.8,
  },
  bell: {
    osc1Type: 'sine',
    osc2Multiplier: 3,
    subGain: 0.35,
    filterCutoff: (f) => Math.min(6400, f * 7.5),
    peakFactor: 0.18,
    attack: 0.003,
    decayMid: 0.35,
    decayEnd: 1.8,
  },
  warm_pad: {
    osc1Type: 'triangle',
    osc2Multiplier: 0.5,
    subGain: 0.28,
    filterCutoff: (f) => Math.min(1800, f * 2.8),
    peakFactor: 0.14,
    attack: 0.035,
    decayMid: 1.1,
    decayEnd: 2.8,
  },
};

export function createSynthVoice(
  ctx: AudioContext,
  midi: number,
  velocity: number,
  preset: SynthPreset = 'epiano'
): ActiveVoice {
  const now = ctx.currentTime;
  const freq = midiToFreq(midi);
  const cfg = PRESETS[preset] ?? PRESETS.epiano;
  const peak = Math.max(0.08, Math.min(1, velocity)) * cfg.peakFactor;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const subGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc1.type = cfg.osc1Type;
  osc1.frequency.setValueAtTime(freq, now);
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * cfg.osc2Multiplier, now);
  subGain.gain.setValueAtTime(cfg.subGain, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cfg.filterCutoff(freq), now);

  // INVARIANT: Exponential decay reaches near-silence (0.0001) so sustained/wrong notes never drone infinitely.
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peak, now + cfg.attack);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.25), now + cfg.decayMid);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.decayEnd);

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
