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

function parseMidiError(err: unknown): { error: string; errorKind: 'notice' | 'error' } {
  const msg = err && typeof err === 'object'
    ? `${(err as { name?: string }).name ?? ''} ${(err as { message?: string }).message ?? ''}`
    : String(err);
  const text = msg.toLowerCase();
  if (text.includes('add-on') || text.includes('no devices') || text.includes('not detected')) {
    return { error: 'MIDI kräver behörighet/tillägg i Firefox (QWERTY/Mus aktiv).', errorKind: 'notice' };
  }
  if (text.includes('securityerror') || text.includes('notallowederror') || text.includes('permission') || text.includes('denied')) {
    return { error: 'MIDI-behörighet nekad (QWERTY/Mus aktiv).', errorKind: 'error' };
  }
  return { error: 'Kunde inte ansluta MIDI (QWERTY/Mus aktiv).', errorKind: 'notice' };
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
    this.cleanMidiAccess();
    const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { requestMIDIAccess?: () => Promise<SimpleMidiAccess> }) : null;
    if (!nav?.requestMIDIAccess) {
      this.status.supported = false;
      this.status.error = 'Web MIDI stöds inte i webbläsaren (QWERTY/Mus aktiv).';
      this.status.errorKind = 'notice';
      this.notifyStatus();
      return false;
    }
    try {
      const access = await nav.requestMIDIAccess();
      if (seq !== this.connectSeq) return false;
      this.status.error = null;
      this.status.errorKind = undefined;
      this.midiAccess = access;
      this.midiAccess.onstatechange = () => this.refreshInputs();
      this.refreshInputs();
      return true;
    } catch (err) {
      if (seq !== this.connectSeq) return false;
      const parsed = parseMidiError(err);
      this.status.error = parsed.error;
      this.status.errorKind = parsed.errorKind;
      this.notifyStatus();
      return false;
    }
  }

  disconnect(): void {
    this.connectSeq++;
    this.cleanMidiAccess();
    this.status.connected = false;
    this.status.deviceName = null;
    this.notifyStatus();
  }

  private cleanMidiAccess(): void {
    if (this.midiAccess) {
      for (const input of this.midiAccess.inputs.values()) input.onmidimessage = null;
      this.midiAccess.onstatechange = null;
      this.midiAccess = null;
    }
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
