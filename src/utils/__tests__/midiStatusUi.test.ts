import { describe, it, expect } from 'vitest';
import { getMidiBadgeUi, parseMidiError } from '../midiStatusUi';
import { MidiStatus } from '../../types/midi';

const base: MidiStatus = {
  supported: true,
  connected: false,
  deviceName: null,
  error: null,
  detectedOctaveOffset: 0,
  autoCenterOctave: false,
};

describe('getMidiBadgeUi (#2)', () => {
  it('uses neutral style for Firefox notice & waiting state with retry enabled, and rose style for denied error', () => {
    const waiting = getMidiBadgeUi(base);
    expect(waiting.showRetry).toBe(true);
    expect(waiting.className).toContain('bg-gray-800');

    const ff = getMidiBadgeUi({ ...base, error: 'MIDI kräver behörighet/tillägg i Firefox (QWERTY/Mus aktiv).', errorKind: 'notice' });
    expect(ff.showRetry).toBe(true);
    expect(ff.className).not.toContain('bg-rose-950');

    const denied = getMidiBadgeUi({ ...base, error: 'MIDI-behörighet nekad (QWERTY/Mus aktiv).', errorKind: 'error' });
    expect(denied.showRetry).toBe(true);
    expect(denied.className).toContain('bg-rose-950');

    const connected = getMidiBadgeUi({ ...base, connected: true, deviceName: 'Keystation' });
    expect(connected.showRetry).toBe(false);
    expect(connected.label).toContain('Keystation');
  });

  it('classifies WebMIDI errors into Swedish notice/error status payloads (#2)', () => {
    expect(parseMidiError(new Error('add-on required'))).toEqual({
      error: 'MIDI kräver behörighet/tillägg i Firefox (QWERTY/Mus aktiv).',
      errorKind: 'notice',
    });
    expect(parseMidiError(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))).toEqual({
      error: 'MIDI-behörighet nekad (QWERTY/Mus aktiv).',
      errorKind: 'error',
    });
    expect(parseMidiError('unknown')).toEqual({
      error: 'Kunde inte ansluta MIDI (QWERTY/Mus aktiv).',
      errorKind: 'notice',
    });
  });
});
