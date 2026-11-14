import { AudioState, SustainMode, SynthPreset } from '../types/midi';
import { PendingNoteQueue } from './pendingNotes';
import { SustainBuffer } from './sustainBuffer';
import { ActiveVoice, createSynthVoice } from './synthVoice';
import { fadeAndStopVoice, forceStopVoice, stealOldestVoice } from './voicePoolHelpers';

const MAX_VOICES = 24;
const VOICE_MAX_DECAY_MS = 2850;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private voices = new Map<number, ActiveVoice>();
  private voiceTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private sustain = new SustainBuffer();
  private pendingNotes = new PendingNoteQueue();
  private preset: SynthPreset = 'epiano';
  private onVoiceChange: (() => void) | null = null;
  private onStateChange: ((state: AudioState) => void) | null = null;
  private lastNotifiedState: AudioState | null = null;

  setOnVoiceChange(cb: (() => void) | null): void { this.onVoiceChange = cb; }
  setOnStateChange(cb: ((state: AudioState) => void) | null): void { this.onStateChange = cb; }
  getState(): AudioState { return this.ctx?.state === 'running' ? 'running' : 'suspended'; }
  getSustainMode(): SustainMode { return this.sustain.getMode(); }
  getPreset(): SynthPreset { return this.preset; }
  setPreset(preset: SynthPreset): void { this.preset = preset; }
  isSustainHeld(): boolean { return this.sustain.isSustainActive() && this.getSustainedNotes().length > 0; }
  getSustainedNotes(): number[] { return this.sustain.getSustainedOnly().filter((m) => this.voices.has(m)); }

  // INVARIANT: Chromium requires a user gesture to unlock AudioContext; MIDI input alone cannot resume it.
  async resume(): Promise<AudioState> {
    const ctx = this.ensureContext();
    if (ctx && ctx.state !== 'running') {
      try { await ctx.resume(); } catch { this.pendingNotes.clear(); }
    }
    if (this.ctx !== ctx) return this.getState();
    this.handleStateChange();
    return this.getState();
  }

  noteOn(midi: number, velocity = 0.8, isSongMode = false): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state !== 'running') {
      this.pendingNotes.enqueue(midi, velocity, isSongMode, Date.now());
      return;
    }

    const releaseNotes = this.sustain.onNoteOn(midi, isSongMode);
    for (const m of releaseNotes) this.fadeAndStop(m, 80);

    if (this.voices.has(midi)) this.forceStop(midi);
    if (this.voices.size >= MAX_VOICES) stealOldestVoice(this.voices, this.voiceTimers);
    const voice = createSynthVoice(ctx, midi, velocity, this.preset);
    this.voices.set(midi, voice);
    this.voiceTimers.set(midi, setTimeout(() => {
      if (this.voices.get(midi) !== voice) return;
      this.sustain.expireSustained(midi);
      this.fadeAndStop(midi, 50);
      this.onVoiceChange?.();
    }, VOICE_MAX_DECAY_MS));
  }

  noteOff(midi: number): void {
    if (this.pendingNotes.markReleased(midi)) return;
    if (this.sustain.onNoteOff(midi)) this.fadeAndStop(midi, 80);
    else if (!this.voices.has(midi)) this.sustain.expireSustained(midi);
  }

  setSustainMode(mode: SustainMode): void { for (const m of this.sustain.setMode(mode)) this.fadeAndStop(m, 80); }
  setSustainPedal(down: boolean): void { for (const m of this.sustain.onSustainPedal(down)) this.fadeAndStop(m, 80); }
  clearSustain(releaseMs = 80): void { for (const m of this.sustain.clearSustain()) this.fadeAndStop(m, releaseMs); }
  allNotesOff(): void { this.pendingNotes.clear(); for (const m of this.sustain.clearAll()) this.fadeAndStop(m, 40); }

  dispose(): void {
    this.onVoiceChange = null;
    this.onStateChange = null;
    for (const timer of this.voiceTimers.values()) clearTimeout(timer);
    this.voiceTimers.clear();
    this.pendingNotes.clear();
    this.sustain.clearAll();
    for (const midi of [...this.voices.keys()]) this.forceStop(midi);
    if (this.ctx) {
      this.ctx.onstatechange = null;
      void this.ctx.close();
      this.ctx = null;
    }
  }

  private fadeAndStop(midi: number, releaseMs: number): void {
    fadeAndStopVoice(this.ctx, this.voices, this.voiceTimers, midi, releaseMs);
  }

  private forceStop(midi: number): void {
    forceStopVoice(this.voices, this.voiceTimers, midi);
  }

  private handleStateChange(): void {
    const state = this.getState();
    if (state === 'running') {
      const queued = this.pendingNotes.drain(Date.now());
      for (const note of queued) {
        this.noteOn(note.midi, note.velocity, note.isSongMode);
        if (note.releasedBeforeResume) this.noteOff(note.midi);
      }
      if (queued.length > 0) this.onVoiceChange?.();
    }
    if (state !== this.lastNotifiedState) {
      this.lastNotifiedState = state;
      this.onStateChange?.(state);
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) {
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.ctx.onstatechange = () => this.handleStateChange();
      }
    }
    return this.ctx;
  }
}
