import { describe, it, expect, vi, afterEach } from 'vitest';
import { SONGS } from '../../data/songs';
import { MIDI_MAX, MIDI_MIN } from '../../types/midi';
import { KEY_LAYOUTS, WHITE_KEY_COUNT } from '../../utils/musicTheory';
import { MidiManager } from '../MidiManager';
import { MidiFrameParser } from '../midiParser';

describe('Keystation 32 hardware range C3–G5 & uniform octave centering (#10)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  it('maps 32 keys from C3 (48) to G5 (79) with 19 white keys', () => {
    expect(MIDI_MIN).toBe(48);
    expect(MIDI_MAX).toBe(79);
    expect(KEY_LAYOUTS).toHaveLength(32);
    expect(KEY_LAYOUTS.filter((k) => !k.isBlack)).toHaveLength(WHITE_KEY_COUNT);
    expect(KEY_LAYOUTS[0].name).toBe('C3');
    expect(KEY_LAYOUTS[31].name).toBe('G5');
  });

  it('shifts a whole Octave +1 span (60..91) uniformly by -12 without splitting at G5 (79)', () => {
    const parser = new MidiFrameParser();
    parser.parse(new Uint8Array([0x90, 84, 100])); // triggers -12 warning
    expect(parser.getDetectedOffset()).toBe(-12);

    parser.setAutoCenter(true);
    expect(parser.getActiveCenterOffset()).toBe(-12);

    // G5 (79) is physically inside 48..79, yet must shift -12 -> 67 to stay unified with 80..91 -> 68..79
    const upperSplitCheck = parser.parse(new Uint8Array([0x90, 79, 100]));
    expect(upperSplitCheck).toEqual([{ type: 'noteOn', midi: 67, velocity: 100 / 127, rawMidi: 79 }]);
    expect(parser.parse(new Uint8Array([0x80, 79, 0]))).toEqual([{ type: 'noteOff', midi: 67, rawMidi: 79 }]);

    // Returning keyboard physically to Octave 0 and hitting C3 (48): 48 - 12 = 36 (< 48) resets center offset to 0
    const resetCheck = parser.parse(new Uint8Array([0x90, 48, 100]));
    expect(resetCheck).toEqual([{ type: 'noteOn', midi: 48, velocity: 100 / 127, rawMidi: 48 }]);
    expect(parser.getActiveCenterOffset()).toBe(0);

    // flush() while autoCenter === true preserves activeCenterOffset across reconnect / ↻ MIDI
    parser.parse(new Uint8Array([0x90, 84, 100]));
    expect(parser.getActiveCenterOffset()).toBe(-12);
    const flushed = parser.flush();
    expect(flushed).toContainEqual({ type: 'noteOff', midi: 72, rawMidi: 84 });
    expect(parser.getActiveCenterOffset()).toBe(-12);
    expect(parser.parse(new Uint8Array([0x90, 60, 100]))[0]).toMatchObject({ type: 'noteOn', midi: 48, rawMidi: 60 });

    parser.setAutoCenter(false);
    expect(parser.getActiveCenterOffset()).toBe(0);
  });

  it('applies full offset from first strike after intervening in-range notes across Octave +1, -1, +2', () => {
    const cases: Array<[number, number, number, number]> = [
      [91, 60, -12, 48],  // Octave +1
      [36, 60, 12, 72],   // Octave -1
      [103, 72, -24, 48], // Octave +2
    ];
    for (const [outNote, inNote, expectedOffset, expectedShifted] of cases) {
      const p = new MidiFrameParser();
      p.parse(new Uint8Array([0x90, outNote, 100]));
      p.parse(new Uint8Array([0x90, inNote, 100]));
      p.setAutoCenter(true);
      expect(p.getActiveCenterOffset()).toBe(expectedOffset);
      expect(p.parse(new Uint8Array([0x90, inNote, 100]))[0]).toMatchObject({ type: 'noteOn', midi: expectedShifted });
    }
  });

  it('atomically shifts already-held chord notes without splitting when offset switches mid-chord', () => {
    const p = new MidiFrameParser();
    p.setAutoCenter(true);

    expect(p.parse(new Uint8Array([0x90, 60, 100]))).toEqual([{ type: 'noteOn', midi: 60, velocity: 100 / 127, rawMidi: 60 }]);
    const onHigh = p.parse(new Uint8Array([0x90, 91, 110]));
    expect(onHigh).toEqual([
      { type: 'noteOff', midi: 60, rawMidi: 60 },
      { type: 'noteOn', midi: 48, velocity: 100 / 127, rawMidi: 60, rebalance: true },
      { type: 'noteOn', midi: 79, velocity: 110 / 127, rawMidi: 91 },
    ]);
    expect(p.parse(new Uint8Array([0x90, 64, 90]))[0]).toMatchObject({ type: 'noteOn', midi: 52, rawMidi: 64 });

    expect(p.parse(new Uint8Array([0x80, 60, 0]))[0]).toMatchObject({ type: 'noteOff', midi: 48, rawMidi: 60 });
    expect(p.parse(new Uint8Array([0x80, 91, 0]))[0]).toMatchObject({ type: 'noteOff', midi: 79, rawMidi: 91 });
    expect(p.parse(new Uint8Array([0x80, 64, 0]))[0]).toMatchObject({ type: 'noteOff', midi: 52, rawMidi: 64 });
  });

  it('detects -24 on Octave +2 chord [72, 84, 103], preserves it across setAutoCenter(true), and rebalances to [48, 60, 79] (#19)', () => {
    const p = new MidiFrameParser();
    p.parse(new Uint8Array([0x90, 72, 100]));
    p.parse(new Uint8Array([0x90, 84, 100]));
    p.parse(new Uint8Array([0x90, 103, 100]));
    expect(p.getDetectedOffset()).toBe(-24);

    p.setAutoCenter(true);
    expect(p.getActiveCenterOffset()).toBe(-24);

    const rebalanced = p.rebalanceHeldNotes();
    expect(rebalanced).toEqual([
      { type: 'noteOff', midi: 72, rawMidi: 72 },
      { type: 'noteOn', midi: 48, velocity: 100 / 127, rawMidi: 72, rebalance: true },
      { type: 'noteOn', midi: 60, velocity: 100 / 127, rawMidi: 84, rebalance: true },
    ]);
    expect(p.parse(new Uint8Array([0x80, 72, 0]))[0]).toMatchObject({ type: 'noteOff', midi: 48, rawMidi: 72 });
    expect(p.parse(new Uint8Array([0x80, 84, 0]))[0]).toMatchObject({ type: 'noteOff', midi: 60, rawMidi: 84 });
    expect(p.parse(new Uint8Array([0x80, 103, 0]))[0]).toMatchObject({ type: 'noteOff', midi: 79, rawMidi: 103 });
  });

  it('updates MidiManager status to activeCenterOffset === -24 and clears warning for Octave +2 (#19)', async () => {
    const input = { name: 'K32', state: 'connected', onmidimessage: null as ((m: { data: Uint8Array }) => void) | null };
    vi.stubGlobal('navigator', { requestMIDIAccess: async () => ({ inputs: { values: () => [input].values() }, onstatechange: null }) });
    const mgr = new MidiManager();
    await mgr.connect();
    input.onmidimessage?.({ data: new Uint8Array([0x90, 72, 100]) });
    input.onmidimessage?.({ data: new Uint8Array([0x90, 84, 100]) });
    input.onmidimessage?.({ data: new Uint8Array([0x90, 103, 100]) });
    expect(mgr.getStatus().detectedOctaveOffset).toBe(-24);
    mgr.setAutoCenterOctave(true);
    expect(mgr.getStatus().activeCenterOffset).toBe(-24);
    expect(mgr.getStatus().detectedOctaveOffset).toBe(0);
    mgr.disconnect();
  });

  it('keeps every note of all built-in songs within physical C3–G5 (48..79)', () => {
    for (const song of SONGS) {
      for (const n of song.notes) {
        expect(n.midi, `${song.id} beat ${n.beat}`).toBeGreaterThanOrEqual(48);
        expect(n.midi, `${song.id} beat ${n.beat}`).toBeLessThanOrEqual(79);
      }
    }
  });
});
