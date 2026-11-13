import { describe, it, expect, vi, afterEach } from 'vitest';
import { MidiFrameParser } from '../midiParser';
import { MidiManager } from '../MidiManager';

describe('MidiFrameParser', () => {
  it('detects Pitch Bend double-click with Schmitt hysteresis and rejects ramps', () => {
    let now = 1000;
    const parser = new MidiFrameParser({ now: () => now, doubleClickMs: 350 });

    // Ramp down: value 6000 then 5000 (delta > 2000)
    // 6000 = (46 << 7) | 112 -> 0x2E, 0x70
    const ev1 = parser.parse(new Uint8Array([0xe0, 112, 46])); // ~6000
    const ev2 = parser.parse(new Uint8Array([0xe0, 40, 39]));  // ~5032
    expect(ev1).toEqual([]);
    expect(ev2).toEqual([]); // still not rearmed

    // Return to center (delta < 500): 8192 = (64 << 7) | 0
    parser.parse(new Uint8Array([0xe0, 0, 64]));

    // Second edge within 200ms -> LOOP_RESET
    now += 200;
    const ev3 = parser.parse(new Uint8Array([0xe0, 112, 46]));
    expect(ev3).toEqual([{ type: 'macro', action: 'LOOP_RESET' }]);
  });

  it('rejects Pitch Bend double-click if interval > 350ms', () => {
    let now = 1000;
    const parser = new MidiFrameParser({ now: () => now, doubleClickMs: 350 });
    parser.parse(new Uint8Array([0xe0, 112, 46])); // 1st strike
    parser.parse(new Uint8Array([0xe0, 0, 64]));   // rearm
    now += 400; // > 350ms
    const ev = parser.parse(new Uint8Array([0xe0, 112, 46]));
    expect(ev).toEqual([]);
  });

  it('detects Mod (CC 1) double-click < 350ms for CYCLE_HAND', () => {
    let now = 2000;
    const parser = new MidiFrameParser({ now: () => now, doubleClickMs: 350 });
    expect(parser.parse(new Uint8Array([0xb0, 1, 127]))).toEqual([]);
    parser.parse(new Uint8Array([0xb0, 1, 0])); // release
    now += 150;
    expect(parser.parse(new Uint8Array([0xb0, 1, 127]))).toEqual([
      { type: 'macro', action: 'CYCLE_HAND' },
    ]);
  });

  it('handles CC 64 sustain pedal state changes', () => {
    const parser = new MidiFrameParser();
    expect(parser.parse(new Uint8Array([0xb0, 64, 127]))).toEqual([
      { type: 'sustain', down: true },
    ]);
    expect(parser.parse(new Uint8Array([0xb0, 64, 127]))).toEqual([]); // no change
    expect(parser.parse(new Uint8Array([0xb0, 64, 0]))).toEqual([
      { type: 'sustain', down: false },
    ]);
  });

  it('detects out-of-range octave offset on raw notes', () => {
    const parser = new MidiFrameParser();
    // Raw note 41 (F2, 1 octave below F3 [53]) -> minimum shift +12
    parser.parse(new Uint8Array([0x90, 41, 100]));
    expect(parser.getDetectedOffset()).toBe(12);

    parser.clearDetectedOffset();
    expect(parser.getDetectedOffset()).toBe(0);

    // Raw note 96 (C7, 1 octave above C6 [84]) -> minimum shift -12
    parser.parse(new Uint8Array([0x90, 96, 100]));
    expect(parser.getDetectedOffset()).toBe(-12);
  });
});

describe('MidiManager', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('connects safely without throwing in Node environment', async () => {
    const mgr = new MidiManager();
    const ok = await mgr.connect();
    expect(ok).toBe(false);
    expect(mgr.getStatus().supported).toBe(false);
  });

  it('clears detectedOctaveOffset when setAutoCenterOctave(true) is called', async () => {
    const fakeInput: { name: string; onmidimessage: ((msg: { data: Uint8Array }) => void) | null } = {
      name: 'Keystation Mini 32',
      onmidimessage: null,
    };
    vi.stubGlobal('navigator', {
      requestMIDIAccess: async () => ({ inputs: { values: () => [fakeInput].values() }, onstatechange: null }),
    });
    const mgr = new MidiManager();
    expect(await mgr.connect()).toBe(true);
    fakeInput.onmidimessage?.({ data: new Uint8Array([0x90, 41, 100]) });
    expect(mgr.getStatus().detectedOctaveOffset).toBe(12);
    mgr.setAutoCenterOctave(true);
    expect(mgr.getStatus().detectedOctaveOffset).toBe(0);
    expect(mgr.getStatus().autoCenterOctave).toBe(true);
    mgr.disconnect();
  });

  it('localizes Firefox add-on / permission errors in Swedish and clears error on retry (#2)', async () => {
    let shouldFail: Error | null = new Error('WebMIDI requires a site permission add-on to activate');
    const inputs: Array<{ name: string; onmidimessage: ((msg: { data: Uint8Array }) => void) | null }> = [];
    const access = { inputs: { values: () => inputs.values() }, onstatechange: null as (() => void) | null };
    vi.stubGlobal('navigator', {
      requestMIDIAccess: async () => {
        if (shouldFail) throw shouldFail;
        return access;
      },
    });
    const mgr = new MidiManager();
    expect(await mgr.connect()).toBe(false);
    const ff = mgr.getStatus() as { error: string | null; errorKind?: string };
    expect(ff.error).toBeTruthy();
    expect(ff.error).not.toMatch(/WebMIDI|requires|permission|add-on/i);
    expect(ff.errorKind).toBe('notice');

    shouldFail = Object.assign(new Error('Permission to use Web MIDI API was not granted'), { name: 'NotAllowedError' });
    expect(await mgr.connect()).toBe(false);
    const denied = mgr.getStatus() as { error: string | null; errorKind?: string };
    expect(denied.error).toBeTruthy();
    expect(denied.error).not.toMatch(/Permission|granted/i);
    expect(denied.errorKind).toBe('error');

    shouldFail = null;
    expect(await mgr.connect()).toBe(true);
    expect(mgr.getStatus().connected).toBe(false);
    expect(mgr.getStatus().error).toBeNull();
    expect(mgr.getStatus().errorKind).toBeUndefined();

    // Hot-plug via onstatechange updates connected, deviceName & clears error state
    (mgr as unknown as { status: { error: string | null; errorKind?: 'notice' | 'error' } }).status.error = 'stale';
    inputs.push({ name: 'Keystation 32', onmidimessage: null });
    access.onstatechange?.();
    expect(mgr.getStatus().connected).toBe(true);
    expect(mgr.getStatus().deviceName).toBe('Keystation 32');
    expect(mgr.getStatus().error).toBeNull();
    expect(mgr.getStatus().errorKind).toBeUndefined();
    mgr.disconnect();
  });
});
