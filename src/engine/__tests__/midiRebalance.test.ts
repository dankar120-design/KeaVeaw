import { describe, it, expect, vi, afterEach } from 'vitest';
import { MidiFrameParser } from '../midiParser';
import { MidiManager } from '../MidiManager';
import { MultiSourceHoldTracker, shouldAutoStartOnPress } from '../../hooks/practiceEffects';
import { ParsedMidiEvent, TransportSnapshot } from '../../types/midi';

describe('rebalanceHeldNotes, double-tap & clamp-collision audit (#10)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('emits all noteOffs before noteOns on descending chord [72, 60] -> 91 so 60 stays active', () => {
    const parser = new MidiFrameParser();
    parser.setAutoCenter(true);

    const holds = new MultiSourceHoldTracker();
    const applyToHolds = (evs: ParsedMidiEvent[]) => {
      for (const ev of evs) {
        if (ev.type === 'noteOn') holds.press(ev.midi, 'midi');
        else if (ev.type === 'noteOff') holds.release(ev.midi, 'midi');
      }
    };

    applyToHolds(parser.parse(new Uint8Array([0x90, 72, 100])));
    applyToHolds(parser.parse(new Uint8Array([0x90, 60, 90])));
    const shiftEvs = parser.parse(new Uint8Array([0x90, 91, 110]));
    applyToHolds(shiftEvs);

    expect(shiftEvs).toEqual([
      { type: 'noteOff', midi: 72, rawMidi: 72 },
      { type: 'noteOff', midi: 60, rawMidi: 60 },
      { type: 'noteOn', midi: 60, velocity: 100 / 127, rawMidi: 72, rebalance: true },
      { type: 'noteOn', midi: 48, velocity: 90 / 127, rawMidi: 60, rebalance: true },
      { type: 'noteOn', midi: 79, velocity: 110 / 127, rawMidi: 91 },
    ]);
    expect(holds.getActiveMidis()).toEqual(new Set([48, 60, 79]));
  });

  it('does not falsify first Pitch Bend or CC 1 double-tap macro at t < 350ms or after reset', () => {
    const parser = new MidiFrameParser({ doubleClickMs: 350 });
    expect(parser.parse(new Uint8Array([0xb0, 1, 127]), 100)).toEqual([]);
    expect(parser.parse(new Uint8Array([0xb0, 1, 0]), 150)).toEqual([]);
    expect(parser.parse(new Uint8Array([0xb0, 1, 127]), 250)).toEqual([{ type: 'macro', action: 'CYCLE_HAND' }]);
    expect(parser.parse(new Uint8Array([0xb0, 1, 0]), 260)).toEqual([]);

    // Post-macro / post-reset tap at small timestamp must NOT trigger macro
    parser.parse(new Uint8Array([0xb0, 121, 0]), 50);
    expect(parser.parse(new Uint8Array([0xb0, 1, 127]), 100)).toEqual([]);
    expect(parser.parse(new Uint8Array([0xe0, 112, 46]), 100)).toEqual([]);
  });

  it('guards shared clamped noteOff until both held raw keys [79, 80] release after resetAutoCenter()', async () => {
    const input = { name: 'K32', state: 'connected', onmidimessage: null as ((m: { data: Uint8Array }) => void) | null };
    vi.stubGlobal('navigator', {
      requestMIDIAccess: async () => ({ inputs: { values: () => [input].values() }, onstatechange: null }),
    });
    const mgr = new MidiManager();
    const events: ParsedMidiEvent[] = [];
    mgr.onEvent((e) => events.push(e));

    await mgr.connect();
    mgr.setAutoCenterOctave(true);
    input.onmidimessage?.({ data: new Uint8Array([0x90, 84, 100]) }); // engage -12
    input.onmidimessage?.({ data: new Uint8Array([0x80, 84, 0]) });
    input.onmidimessage?.({ data: new Uint8Array([0x90, 79, 100]) }); // 67
    input.onmidimessage?.({ data: new Uint8Array([0x90, 80, 100]) }); // 68

    events.length = 0;
    mgr.resetAutoCenter(); // both 79 and 80 clamp -> 79
    expect(events).toEqual([
      { type: 'noteOff', midi: 67, rawMidi: 79 },
      { type: 'noteOff', midi: 68, rawMidi: 80 },
      { type: 'noteOn', midi: 79, velocity: 100 / 127, rawMidi: 79, rebalance: true },
    ]);

    events.length = 0;
    input.onmidimessage?.({ data: new Uint8Array([0x80, 79, 0]) });
    expect(events).toEqual([]); // 80 still clamps to 79
    input.onmidimessage?.({ data: new Uint8Array([0x80, 80, 0]) });
    expect(events).toEqual([{ type: 'noteOff', midi: 79, rawMidi: 80 }]);
    mgr.disconnect();
  });

  it('prevents synthetic rebalance notes from auto-starting transport (DEC-004)', () => {
    const snap: TransportSnapshot = {
      beat: 0, loopStart: 0, loopEnd: 8, playing: false, speedMultiplier: 1,
      isFrozen: false, activeChord: null, autoNoteOns: [], autoNoteOffs: [],
      shouldClearSustain: false, allNotesOff: false,
      waitingNotes: [{ beat: 0, duration: 1, midi: 48, hand: 'L', role: 'root' }],
    };
    expect(shouldAutoStartOnPress(snap, false, 48, false)).toBe(true);
    expect(shouldAutoStartOnPress(snap, false, 48, true)).toBe(false);
  });
});
