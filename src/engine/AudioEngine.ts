import { AudioState, SustainMode } from '../types/midi';
import { PendingNoteQueue } from './pendingNotes';
import { SustainBuffer } from './sustainBuffer';
import { ActiveVoice, createSynthVoice, fadeVoice, stopVoiceNow } from './synthVoice';

const MAX_VOICES = 24;
const VOICE_MAX_DECAY_MS = 2850;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private voices = new Map<number, ActiveVoice>();
  private voiceTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private sustain = new SustainBuffer();
  private pendingNotes = new PendingNoteQueue();
  private onVoiceChange: (() => void) | null = null;
  private onStateChange: ((state: AudioState) => void) | null = null;
  private lastNotifiedState: AudioState | null = null;

  setOnVoiceChange(cb: (() => void) | null): void { this.onVoiceChange = cb; }
  setOnStateChange(cb: ((state: AudioState) => void) | null): void { this.onStateChange = cb; }
  getState(): AudioState { return this.ctx?.state === 'running' ? 'running' : 'suspended'; }
  getSustainMode(): SustainMode { return this.sustain.getMode(); }
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
    for (const m of releaseNotes) this.fadeAndStopVoice(m, 80);

    if (this.voices.has(midi)) this.forceStopVoice(midi);
    if (this.voices.size >= MAX_VOICES) this.stealOldestVoice();
    const voice = createSynthVoice(ctx, midi, velocity);
    this.voices.set(midi, voice);
    this.voiceTimers.set(midi, setTimeout(() => {
      if (this.voices.get(midi) !== voice) return;
      this.sustain.expireSustained(midi);
      this.fadeAndStopVoice(midi, 50);
      this.onVoiceChange?.();
    }, VOICE_MAX_DECAY_MS));
  }

  noteOff(midi: number): void {
    if (this.pendingNotes.markReleased(midi)) return;
    if (this.sustain.onNoteOff(midi)) this.fadeAndStopVoice(midi, 80);
    else if (!this.voices.has(midi)) this.sustain.expireSustained(midi);
  }

  setSustainMode(mode: SustainMode): void { for (const m of this.sustain.setMode(mode)) this.fadeAndStopVoice(m, 80); }
  setSustainPedal(down: boolean): void { for (const m of this.sustain.onSustainPedal(down)) this.fadeAndStopVoice(m, 80); }
  clearSustain(releaseMs = 80): void { for (const m of this.sustain.clearSustain()) this.fadeAndStopVoice(m, releaseMs); }
  allNotesOff(): void { this.pendingNotes.clear(); for (const m of this.sustain.clearAll()) this.fadeAndStopVoice(m, 40); }

  dispose(): void {
    this.onVoiceChange = null;
    this.onStateChange = null;
    for (const timer of this.voiceTimers.values()) clearTimeout(timer);
    this.voiceTimers.clear();
    this.allNotesOff();
    if (this.ctx) {
      this.ctx.onstatechange = null;
      void this.ctx.close();
      this.ctx = null;
    }
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

  private stealOldestVoice(): void {
    let oldestMidi: number | null = null;
    let oldestTime = Infinity;
    for (const [m, v] of this.voices) {
      if (v.startedAt < oldestTime) {
        oldestTime = v.startedAt;
        oldestMidi = m;
      }
    }
    if (oldestMidi !== null) this.forceStopVoice(oldestMidi);
  }

  private clearVoiceTimer(midi: number): void {
    const timer = this.voiceTimers.get(midi);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.voiceTimers.delete(midi);
    }
  }

  private takeVoice(midi: number): ActiveVoice | undefined {
    this.clearVoiceTimer(midi);
    const v = this.voices.get(midi);
    if (v) this.voices.delete(midi);
    return v;
  }

  private fadeAndStopVoice(midi: number, releaseMs: number): void {
    const v = this.takeVoice(midi);
    if (v && this.ctx) fadeVoice(this.ctx, v, releaseMs);
  }

  private forceStopVoice(midi: number): void {
    const v = this.takeVoice(midi);
    if (v) stopVoiceNow(v);
  }
}
