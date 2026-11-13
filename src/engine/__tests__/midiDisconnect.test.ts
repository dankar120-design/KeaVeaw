import { describe, it, expect, vi, afterEach } from 'vitest';
import { MidiFrameParser } from '../midiParser';
import { MidiManager } from '../MidiManager';
import { bindPracticeInputs } from '../../hooks/inputBindings';
import { MultiSourceHoldTracker } from '../../hooks/practiceEffects';
import type { AudioEngine } from '../AudioEngine';
import type { Transport } from '../Transport';
import type { ParsedMidiEvent } from '../../types/midi';

interface MockInput {
  name: string;
  state: 'connected' | 'disconnected';
  onmidimessage: ((msg: { data: Uint8Array }) => void) | null;
}

describe('USB-MIDI disconnect, port state & Channel Mode CC (#5)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('releases held notes and clears status when inputs empty or state becomes disconnected', async () => {
    const input: MockInput = { name: 'Keystation 32', state: 'connected', onmidimessage: null };
    let inputs: MockInput[] = [input];
    const access = { inputs: { values: () => inputs.values() }, onstatechange: null as (() => void) | null };
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => access });

    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));
    await mgr.connect();

    input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) });
    inputs = [];
    access.onstatechange?.();
    expect(events).toContainEqual({ type: 'noteOff', midi: 60, rawMidi: 60 });
    expect(mgr.getStatus()).toMatchObject({ connected: false, deviceName: null });

    // Reconnect and transition port state to 'disconnected' (Web MIDI keeps disconnected ports in inputs)
    events.length = 0;
    input.state = 'connected';
    inputs = [input];
    access.onstatechange?.();
    expect(mgr.getStatus().connected).toBe(true);

    input.onmidimessage?.({ data: new Uint8Array([0x90, 64, 90]) });
    input.state = 'disconnected';
    access.onstatechange?.();
    expect(events).toContainEqual({ type: 'noteOff', midi: 64, rawMidi: 64 });
    expect(mgr.getStatus()).toMatchObject({ connected: false, deviceName: null });
    mgr.disconnect();
  });

  it('flushes active notes if one of two connected MIDI ports disconnects', async () => {
    const portA: MockInput = { name: 'Port A', state: 'connected', onmidimessage: null };
    const portB: MockInput = { name: 'Port B', state: 'connected', onmidimessage: null };
    const access = { inputs: { values: () => [portA, portB].values() }, onstatechange: null as (() => void) | null };
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => access });

    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));
    await mgr.connect();

    portA.onmidimessage?.({ data: new Uint8Array([0x90, 62, 100]) });
    portA.state = 'disconnected';
    access.onstatechange?.();
    expect(events).toContainEqual({ type: 'noteOff', midi: 62, rawMidi: 62 });
    expect(mgr.getStatus().connected).toBe(true);
    mgr.disconnect();
  });

  it('flushes notes & sustain on disconnect() so subsequent connect() accepts fresh CC64=127', async () => {
    const input: MockInput = { name: 'Keystation 32', state: 'connected', onmidimessage: null };
    const access = { inputs: { values: () => [input].values() }, onstatechange: null as (() => void) | null };
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => access });

    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));
    await mgr.connect();

    input.onmidimessage?.({ data: new Uint8Array([0x90, 60, 100]) });
    input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 127]) });
    mgr.disconnect();

    expect(events).toContainEqual({ type: 'noteOff', midi: 60, rawMidi: 60 });
    expect(events).toContainEqual({ type: 'sustain', down: false });

    events.length = 0;
    await mgr.connect();
    input.onmidimessage?.({ data: new Uint8Array([0xb0, 64, 127]) });
    expect(events).toEqual([{ type: 'sustain', down: true }]);
    mgr.disconnect();
  });

  it('handles CC 123 (All Notes Off), CC 120 (All Sound Off), and CC 121 (Reset All Controllers)', () => {
    const parser = new MidiFrameParser();
    parser.parse(new Uint8Array([0x90, 60, 100]));
    expect(parser.parse(new Uint8Array([0xb0, 123, 0]))).toEqual([{ type: 'noteOff', midi: 60, rawMidi: 60 }]);

    parser.parse(new Uint8Array([0x90, 65, 100]));
    parser.parse(new Uint8Array([0xb0, 64, 127]));
    expect(parser.parse(new Uint8Array([0xb0, 120, 0]))).toEqual([
      { type: 'noteOff', midi: 65, rawMidi: 65 },
      { type: 'sustain', down: false },
    ]);

    parser.parse(new Uint8Array([0xb0, 64, 127]));
    expect(parser.parse(new Uint8Array([0xb0, 121, 0]))).toEqual([{ type: 'sustain', down: false }]);
    expect(parser.parse(new Uint8Array([0xb0, 64, 127]))).toEqual([{ type: 'sustain', down: true }]);
  });

  it('clears visual MIDI holds in bindPracticeInputs on unplug without pausing', async () => {
    const input: MockInput = { name: 'Keystation 32', state: 'connected', onmidimessage: null };
    const access = { inputs: { values: () => [input].values() }, onstatechange: null as (() => void) | null };
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => access });
    vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });

    const mgr = new MidiManager();
    const holds = new MultiSourceHoldTracker();
    const audioOff = vi.fn();
    const syncVisual = vi.fn();

    const cleanup = bindPracticeInputs({
      midi: mgr,
      audio: { setSustainPedal: vi.fn(), noteOff: audioOff, dispose: vi.fn() } as unknown as AudioEngine,
      transport: { shiftLoop: vi.fn() } as unknown as Transport,
      holds, heldQwerty: new Map(), octaveRef: { current: 0 },
      setMidiStatus: vi.fn(), setOctaveShift: vi.fn(),
      pressNote: (m, src) => { holds.press(m, src); },
      releaseNote: (m, src) => { if (holds.release(m, src)) audioOff(m); syncVisual(); },
      syncVisualNotes: syncVisual, togglePlay: vi.fn(), resetLoop: vi.fn(), cycleHand: vi.fn(), commitSnapshot: vi.fn(),
    });
    await new Promise((r) => setTimeout(r, 10));

    input.onmidimessage?.({ data: new Uint8Array([0x90, 67, 100]) });
    expect(holds.getActiveMidis().has(67)).toBe(true);

    input.state = 'disconnected';
    access.onstatechange?.();
    expect(holds.getActiveMidis().size).toBe(0);
    expect(audioOff).toHaveBeenCalledWith(67);
    cleanup();
  });
});
