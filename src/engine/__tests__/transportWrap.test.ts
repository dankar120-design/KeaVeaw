import { describe, it, expect, vi, afterEach } from 'vitest';
import { Song } from '../../types/midi';
import { Transport } from '../Transport';
import { MidiManager } from '../MidiManager';
import { MidiFrameParser } from '../midiParser';

const wrapSong: Song = {
  id: 'wrap-test',
  title: 'Wrap',
  bpm: 120,
  timeSignature: [4, 4],
  sections: [{ id: 's1', name: 'S1', startBeat: 0, endBeat: 4, chords: [{ beat: 0, symbol: 'F', rootMidi: 53 }] }],
  notes: [
    { beat: 0, duration: 0.5, midi: 53, hand: 'L', role: 'root', sustainClear: true },
    { beat: 1, duration: 0.5, midi: 65, hand: 'R', role: 'melody' },
  ],
};

describe('Transport loop wrap & getSnapshot', () => {
  it('triggers beat 0 autoNoteOns and sustainClear again on cycle 2 after wrap overshoot', () => {
    let now = 0;
    const tr = new Transport(wrapSong, () => now);
    expect(tr.getSnapshot()).toMatchObject({ loopStart: 0, loopEnd: 4, beat: 0, playing: false });

    tr.setHandIsolation('RIGHT_ONLY');
    tr.setPlaying(true);

    // Cycle 1: beat 0 auto-note triggers
    const c1 = tr.step(20);
    expect(c1.autoNoteOns.map((n) => n.midi)).toEqual([53]);
    expect(c1.shouldClearSustain).toBe(true);

    // Advance near beat 1 so note 65 is within early-hit window, then advance past loopEnd (beat 4) with overshoot
    while (tr.step(35).beat < 0.85) { now += 35; }
    tr.registerNoteOn(65, now);
    let wrapped = false;
    for (let i = 0; i < 80; i++) {
      now += 35;
      const snap = tr.step(35);
      if (snap.allNotesOff && snap.beat > 0 && snap.beat < 0.5) {
        wrapped = true;
        break;
      }
    }
    expect(wrapped).toBe(true);

    // Next step starts from beat > 0 overshoot; beat 0 auto-note MUST still fire in cycle 2
    now += 20;
    const c2 = tr.step(20);
    expect(c2.autoNoteOns.map((n) => n.midi)).toEqual([53]);
    expect(c2.shouldClearSustain).toBe(true);
  });

  it('shows waitingNotes at loopStart while paused, and hides them when paused mid-song', () => {
    let now = 0;
    const tr = new Transport(wrapSong, () => now);
    expect(tr.getSnapshot().waitingNotes.map((n) => n.midi)).toEqual([53]);

    tr.setPlaying(true);
    now += 40;
    tr.step(40);
    const midPaused = tr.setPlaying(false);
    expect(midPaused.beat).toBeGreaterThan(0);
    expect(midPaused.waitingNotes).toEqual([]);

    const resetSnap = tr.resetLoop();
    expect(resetSnap.waitingNotes.map((n) => n.midi)).toEqual([53]);
  });
});

describe('MidiManager race guard & MidiFrameParser noteOff stability', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('aborts pending connect() when disconnect() is called mid-flight', async () => {
    let resolveMidi!: (v: unknown) => void;
    const fakeInput = { name: 'Keystation', onmidimessage: null as unknown };
    vi.stubGlobal('navigator', {
      requestMIDIAccess: () => new Promise((res) => { resolveMidi = res; }),
    });

    const mgr = new MidiManager();
    const pending = mgr.connect();
    mgr.disconnect();
    resolveMidi({ inputs: { values: () => [fakeInput].values() }, onstatechange: null });

    expect(await pending).toBe(false);
    expect(mgr.getStatus().connected).toBe(false);
    expect(fakeInput.onmidimessage).toBeNull();
  });

  it('ignores noteOff for detectedOffset and matches noteOn pitch across autoCenter toggle', () => {
    const parser = new MidiFrameParser();
    parser.parse(new Uint8Array([0x80, 41, 0])); // noteOff alone must not trigger octave warning
    expect(parser.getDetectedOffset()).toBe(0);

    const onEv = parser.parse(new Uint8Array([0x90, 40, 100]))[0];
    expect(onEv).toMatchObject({ type: 'noteOn', midi: 53 });
    parser.setAutoCenter(true);
    const offEv = parser.parse(new Uint8Array([0x80, 40, 0]))[0];
    expect(offEv).toMatchObject({ type: 'noteOff', midi: 53 });
  });
});
