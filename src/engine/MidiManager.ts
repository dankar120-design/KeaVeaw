import { MidiStatus, ParsedMidiEvent } from '../types/midi';
import { MidiFrameParser } from './midiParser';
import { parseMidiError } from '../utils/midiStatusUi';
import {
  MidiReconnectController, SimpleMidiAccess, SimpleMidiInput, SimpleMidiMessageEvent,
  collectAndBindInputs, dispatchSafe, hasUnopenedConnectedInput, hasUsableInput,
} from './midiPortHelpers';

export class MidiManager {
  private parser = new MidiFrameParser();
  private midiAccess: SimpleMidiAccess | null = null;
  private activeInputs = new Set<SimpleMidiInput>();
  private listeners = new Set<(e: ParsedMidiEvent) => void>();
  private statusListeners = new Set<(s: MidiStatus) => void>();
  private reconnect = new MidiReconnectController();
  private wantConnected = false;
  private connectSeq = 0;
  private status: MidiStatus = {
    supported: typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator,
    connected: false, deviceName: null, error: null, detectedOctaveOffset: 0, autoCenterOctave: false, activeCenterOffset: 0,
  };

  onEvent(cb: (e: ParsedMidiEvent) => void): () => void { this.listeners.add(cb); return () => this.listeners.delete(cb); }
  onStatusChange(cb: (s: MidiStatus) => void): () => void { this.statusListeners.add(cb); cb(this.getStatus()); return () => this.statusListeners.delete(cb); }
  getStatus(): MidiStatus { return { ...this.status, detectedOctaveOffset: this.parser.getDetectedOffset(), activeCenterOffset: this.parser.getActiveCenterOffset() }; }

  // INVARIANT: Enabling auto-center supersedes any prior out-of-range warning so stale UI banners clear immediately.
  setAutoCenterOctave(val: boolean): void {
    this.status.autoCenterOctave = val;
    this.parser.setAutoCenter(val);
    if (val) this.parser.clearDetectedOffset();
    this.emitEvents(this.parser.rebalanceHeldNotes());
    this.notifyStatus();
  }

  resetAutoCenter(): void { this.parser.clearDetectedOffset(); this.emitEvents(this.parser.clearCenterOffset()); this.notifyStatus(); }
  clearOctaveWarning(): void { this.parser.clearDetectedOffset(); this.notifyStatus(); }

  async ensureConnected(): Promise<boolean> {
    this.reconnect.reset();
    if (!this.midiAccess) return this.connect();
    if (!hasUsableInput(this.midiAccess) && !hasUnopenedConnectedInput(this.midiAccess) && !this.status.connected) return this.connect();
    if (hasUnopenedConnectedInput(this.midiAccess) || !this.status.connected) this.refreshInputs();
    return this.status.connected;
  }

  // INVARIANT: connectSeq aborts stale async requestMIDIAccess completions if disconnect() ran mid-flight.
  async connect(): Promise<boolean> {
    this.reconnect.clear();
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
    this.wantConnected = false;
    this.reconnect.reset();
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

  private emitEvents(evs: ParsedMidiEvent[]): void { for (const ev of evs) dispatchSafe(this.listeners, ev); }

  private scheduleAutoReconnect(): void {
    if (this.reconnect.isPending()) return;
    const scheduled = this.reconnect.schedule(() => {
      const pending = this.midiAccess ? this.refreshInputs(false) : false;
      if (!this.status.connected && !pending) void this.connect();
      else if (this.status.connected && !pending && this.midiAccess && hasUnopenedConnectedInput(this.midiAccess)) this.scheduleAutoReconnect();
    });
    if (!scheduled) this.wantConnected = false;
  }

  private handleMidiMessage(msg: SimpleMidiMessageEvent): void {
    if (!msg.data) return;
    this.emitEvents(this.parser.parse(msg.data));
    if (this.status.detectedOctaveOffset !== this.parser.getDetectedOffset() || this.status.activeCenterOffset !== this.parser.getActiveCenterOffset()) this.notifyStatus();
  }

  // INVARIANT: Pending async open() promises own the next refresh/retry step so connect() never aborts in-flight port opens.
  private refreshInputs(allowSchedule = true): boolean {
    if (!this.midiAccess) return false;
    const wasConnected = this.status.connected;
    const prevActiveSize = this.activeInputs.size;
    const { nextInputs, deviceName, pendingAsyncOpen } = collectAndBindInputs(
      this.midiAccess, (m) => this.handleMidiMessage(m), () => this.refreshInputs(), () => this.scheduleAutoReconnect()
    );
    if (nextInputs.size > 0 && !wasConnected && prevActiveSize === 0 && !this.wantConnected) this.reconnect.reset();
    const lostPort = Array.from(this.activeInputs).some((prev) => !nextInputs.has(prev));
    this.activeInputs = nextInputs;
    if (lostPort || (wasConnected && nextInputs.size === 0)) this.emitEvents(this.parser.flush());
    const usable = hasUsableInput(this.midiAccess);
    const hasUnopened = hasUnopenedConnectedInput(this.midiAccess);
    if (usable || wasConnected || lostPort) this.wantConnected = true;
    const needsRetry = hasUnopened || (this.wantConnected && !usable);
    if (usable) Object.assign(this.status, { error: null, errorKind: undefined });
    Object.assign(this.status, { connected: usable, deviceName });
    if (usable && !hasUnopened) this.reconnect.reset();
    else if (allowSchedule && needsRetry && !pendingAsyncOpen) this.scheduleAutoReconnect();
    this.notifyStatus();
    return pendingAsyncOpen;
  }

  private notifyStatus(): void {
    Object.assign(this.status, { detectedOctaveOffset: this.parser.getDetectedOffset(), activeCenterOffset: this.parser.getActiveCenterOffset() });
    dispatchSafe(this.statusListeners, this.getStatus());
  }
}
