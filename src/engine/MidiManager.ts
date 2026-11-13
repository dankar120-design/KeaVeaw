import { MidiStatus, ParsedMidiEvent } from '../types/midi';
import { MidiFrameParser } from './midiParser';

interface SimpleMidiMessageEvent {
  data: Uint8Array;
}

interface SimpleMidiInput {
  name?: string | null;
  onmidimessage: ((msg: SimpleMidiMessageEvent) => void) | null;
}

interface SimpleMidiAccess {
  inputs: { values(): IterableIterator<SimpleMidiInput> };
  onstatechange: (() => void) | null;
}

export class MidiManager {
  private parser = new MidiFrameParser();
  private midiAccess: SimpleMidiAccess | null = null;
  private listeners = new Set<(e: ParsedMidiEvent) => void>();
  private statusListeners = new Set<(s: MidiStatus) => void>();
  private connectSeq = 0;
  private status: MidiStatus = {
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    connected: false,
    deviceName: null,
    error: null,
    detectedOctaveOffset: 0,
    autoCenterOctave: false,
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
    return { ...this.status, detectedOctaveOffset: this.parser.getDetectedOffset() };
  }

  // INVARIANT: Enabling auto-center supersedes any prior out-of-range warning so stale UI banners clear immediately.
  setAutoCenterOctave(val: boolean): void {
    this.status.autoCenterOctave = val;
    this.parser.setAutoCenter(val);
    if (val) this.parser.clearDetectedOffset();
    this.notifyStatus();
  }

  clearOctaveWarning(): void {
    this.parser.clearDetectedOffset();
    this.notifyStatus();
  }

  // INVARIANT: connectSeq aborts stale async requestMIDIAccess completions if disconnect() ran mid-flight.
  async connect(): Promise<boolean> {
    const seq = ++this.connectSeq;
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { requestMIDIAccess?: () => Promise<SimpleMidiAccess> }) : null;
    if (!nav?.requestMIDIAccess) {
      this.status.supported = false;
      this.status.error = 'Web MIDI stöds inte i denna webbläsare.';
      this.notifyStatus();
      return false;
    }
    try {
      const access = await nav.requestMIDIAccess();
      if (seq !== this.connectSeq) return false;
      this.midiAccess = access;
      this.midiAccess.onstatechange = () => this.refreshInputs();
      this.refreshInputs();
      return true;
    } catch (err) {
      if (seq !== this.connectSeq) return false;
      this.status.error = err instanceof Error ? err.message : 'Kunde inte ansluta MIDI.';
      this.notifyStatus();
      return false;
    }
  }

  disconnect(): void {
    this.connectSeq++;
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) input.onmidimessage = null;
      this.midiAccess.onstatechange = null;
      this.midiAccess = null;
    }
    this.status.connected = false;
    this.status.deviceName = null;
    this.notifyStatus();
  }

  private refreshInputs(): void {
    if (!this.midiAccess) return;
    let name: string | null = null;
    let hasInput = false;
    for (const input of this.midiAccess.inputs.values()) {
      hasInput = true;
      name = input.name ?? 'USB MIDI Device';
      input.onmidimessage = (msg: SimpleMidiMessageEvent) => {
        if (!msg.data) return;
        for (const ev of this.parser.parse(msg.data)) {
          for (const listener of this.listeners) listener(ev);
        }
        if (this.status.detectedOctaveOffset !== this.parser.getDetectedOffset()) this.notifyStatus();
      };
    }
    this.status.connected = hasInput;
    this.status.deviceName = name;
    this.notifyStatus();
  }

  private notifyStatus(): void {
    this.status.detectedOctaveOffset = this.parser.getDetectedOffset();
    const s = this.getStatus();
    for (const cb of this.statusListeners) cb(s);
  }
}
