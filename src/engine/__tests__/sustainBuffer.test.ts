import { describe, it, expect } from 'vitest';
import { SustainBuffer } from '../sustainBuffer';

describe('SustainBuffer', () => {
  it('preserves C3 sustain when playing C4 in free-play AUTO_ROOT, clears on E3', () => {
    const buf = new SustainBuffer();
    expect(buf.onNoteOn(48, false)).toEqual([]); // C3
    expect(buf.onNoteOff(48)).toBe(false); // sustained
    expect(buf.getSustainedOnly()).toEqual([48]);

    // C4 (60) is outside 48..59 -> must NOT clear C3
    expect(buf.onNoteOn(60, false)).toEqual([]);
    expect(buf.onNoteOff(60)).toBe(false);
    expect(buf.getSustainedOnly()).toEqual([48, 60]);

    // E3 (52) is in 48..59 with new pitch class -> clears C3 & C4
    const released = buf.onNoteOn(52, false);
    expect(released.sort()).toEqual([48, 60]);
    expect(buf.getSustainedOnly()).toEqual([]);
  });

  it('defers AUTO_ROOT clearing to clearSustain() in song mode', () => {
    const buf = new SustainBuffer();
    buf.onNoteOn(53, true);
    buf.onNoteOff(53);
    expect(buf.onNoteOn(55, true)).toEqual([]);
    expect(buf.getSustainedOnly()).toEqual([53]);
    expect(buf.clearSustain()).toEqual([53]);
    expect(buf.getSustainedOnly()).toEqual([]);
  });

  it('supports LATCH_TOGGLE and MOMENTARY modes cleanly', () => {
    const buf = new SustainBuffer();
    buf.setMode('LATCH_TOGGLE');
    buf.onNoteOn(60, false);
    expect(buf.onNoteOff(60)).toBe(true); // latch off -> immediate release

    buf.onSustainPedal(true); // latch ON
    buf.onSustainPedal(false);
    buf.onNoteOn(60, false);
    expect(buf.onNoteOff(60)).toBe(false);
    expect(buf.onSustainPedal(true)).toEqual([60]); // latch OFF -> release

    buf.setMode('MOMENTARY');
    buf.onSustainPedal(true);
    buf.onNoteOn(64, false);
    expect(buf.onNoteOff(64)).toBe(false);
    expect(buf.onSustainPedal(false)).toEqual([64]);
  });

  it('expires decayed sustained notes without affecting held keys', () => {
    const buf = new SustainBuffer();
    buf.onNoteOn(67, false);
    expect(buf.onNoteOff(67)).toBe(false);
    expect(buf.getSustainedOnly()).toEqual([67]);
    buf.expireSustained(67);
    expect(buf.getSustainedOnly()).toEqual([]);
  });
});
