import { MidiStatus, ParsedMidiEvent } from '../types/midi';
import { MidiFrameParser } from './midiParser';
import { parseMidiError } from '../utils/midiStatusUi';
import { SimpleMidiAccess, SimpleMidiInput, SimpleMidiMessageEvent, bindMidiInput, dispatchSafe } from './midiPortHelpers';

export class MidiManager {
  private parser = new MidiFrameParser();
  private midiAccess: SimpleMidiAccess | null = null;
  private activeInputs = new Set<SimpleMidiInput>();
  private listeners = new Set<(e: ParsedMidiEvent) => void>();
  private statusListeners = new Set<(s: MidiStatus) => void>();
  private connectSeq = 0;
  private status: MidiStatus = {
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    connected: false, deviceName: null, error: null,
    detectedOctaveOffset: 0, autoCenterOctave: false, activeCenterOffset: 0,
  };

  onEvent(cb: (e: ParsedMidiEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onStatusChange(cb: (s: MidiStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.getStatus());
    return () => this.statusListeners.delete(cb);
  }

  getStatus(): MidiStatus {
    return {
      ...this.status,
      detectedOctaveOffset: this.parser.getDetectedOffset(),
      activeCenterOffset: this.parser.getActiveCenterOffset(),
    };
  }

  // INVARIANT: Enabling auto-center supersedes any prior out-of-range warning so stale UI banners clear immediately.
  setAutoCenterOctave(val: boolean): void {
    this.status.autoCenterOctave = val;
    this.parser.setAutoCenter(val);
    if (val) this.parser.clearDetectedOffset();
    this.notifyStatus();
  }

  resetAutoCenter(): void {
    this.parser.clearCenterOffset();
    this.notifyStatus();
  }

  clearOctaveWarning(): void {
    this.parser.clearDetectedOffset();
    this.notifyStatus();
  }

  async ensureConnected(): Promise<boolean> {
    if (!this.midiAccess) return this.connect();
    let hasClosed = false;
    for (const input of this.midiAccess.inputs.values()) {
      if (input.state === 'connected' && input.connection === 'closed') { hasClosed = true; break; }
    }
    if (hasClosed || !this.status.connected) this.refreshInputs();
    return this.status.connected;
  }

  // INVARIANT: connectSeq aborts stale async requestMIDIAccess completions if disconnect() ran mid-flight.
  async connect(): Promise<boolean> {
    const seq = ++this.connectSeq;
    this.activeInputs.clear();
    this.cleanMidiAccess();
    this.emitEvents(this.parser.flush());
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { requestMIDIAccess?: () => Promise<SimpleMidiAccess> }) : null;
    if (!nav?.requestMIDIAccess) {
      Object.assign(this.status, { supported: false, errorKind: 'notice', error: 'Web MIDI stöds inte i webbläsaren (QWERTY/Mus aktiv).' });
      this.notifyStatus();
      return false;
    }
    try {
      const access = await nav.requestMIDIAccess();
      if (seq !== this.connectSeq) return false;
      Object.assign(this.status, { error: null, errorKind: undefined });
      this.midiAccess = access;
      this.midiAccess.onstatechange = () => this.refreshInputs();
      this.refreshInputs();
      return true;
    } catch (err) {
      if (seq !== this.connectSeq) return false;
      const { error, errorKind } = parseMidiError(err);
      Object.assign(this.status, { error, errorKind });
      this.notifyStatus();
      return false;
    }
  }

  disconnect(): void {
    this.connectSeq++;
    this.activeInputs.clear();
    this.cleanMidiAccess();
    this.emitEvents(this.parser.flush());
    Object.assign(this.status, { connected: false, deviceName: null });
    this.notifyStatus();
  }

  private cleanMidiAccess(): void {
    if (!this.midiAccess) return;
    for (const input of this.midiAccess.inputs.values()) input.onmidimessage = null;
    this.midiAccess.onstatechange = null;
    this.midiAccess = null;
  }

  private emitEvents(evs: ParsedMidiEvent[]): void {
    for (const ev of evs) dispatchSafe(this.listeners, ev);
  }

  private refreshInputs(): void {
    if (!this.midiAccess) return;
    let name: string | null = null;
    const nextInputs = new Set<SimpleMidiInput>();
    for (const input of this.midiAccess.inputs.values()) {
      if (input.state === 'disconnected') { input.onmidimessage = null; continue; }
      nextInputs.add(input);
      name = input.name ?? 'USB MIDI Device';
      bindMidiInput(input, (msg: SimpleMidiMessageEvent) => {
        if (!msg.data) return;
        this.emitEvents(this.parser.parse(msg.data));
        if (this.status.detectedOctaveOffset !== this.parser.getDetectedOffset() || this.status.activeCenterOffset !== this.parser.getActiveCenterOffset()) {
          this.notifyStatus();
        }
      });
    }
    const lostPort = Array.from(this.activeInputs).some((prev) => !nextInputs.has(prev));
    this.activeInputs = nextInputs;
    if (lostPort || (this.status.connected && nextInputs.size === 0)) this.emitEvents(this.parser.flush());
    const hasInput = nextInputs.size > 0;
    if (hasInput) Object.assign(this.status, { error: null, errorKind: undefined });
    Object.assign(this.status, { connected: hasInput, deviceName: name });
    this.notifyStatus();
  }

  private notifyStatus(): void {
    this.status.detectedOctaveOffset = this.parser.getDetectedOffset();
    this.status.activeCenterOffset = this.parser.getActiveCenterOffset();
    dispatchSafe(this.statusListeners, this.getStatus());
  }
}
