import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SONGS } from '../../data/songs';
import { Hud, HudProps } from '../Hud';

function makeProps(overrides: Partial<HudProps> = {}): HudProps {
  return {
    songs: SONGS,
    selectedSongId: SONGS[0].id,
    onSelectSong: vi.fn(),
    playing: false,
    onTogglePlay: vi.fn(),
    onResetLoop: vi.fn(),
    bpm: 80,
    onChangeBpm: vi.fn(),
    handIsolation: 'BOTH',
    onChangeHandIsolation: vi.fn(),
    sustainMode: 'AUTO_ROOT',
    onChangeSustainMode: vi.fn(),
    audioState: 'suspended',
    audioPrompt: false,
    onUnlockAudio: vi.fn(),
    midiStatus: {
      supported: true,
      connected: false,
      deviceName: null,
      error: null,
      autoCenterOctave: false,
      detectedOctaveOffset: 0,
    },
    onRetryMidi: vi.fn(),
    onEnableAutoCenter: vi.fn(),
    onDismissOctaveWarning: vi.fn(),
    ...overrides,
  };
}

describe('Hud audio state & MIDI prompt (#6)', () => {
  it('renders Aktivera Ljud when suspended and Ljud Aktivt when running', () => {
    const suspendedHtml = renderToStaticMarkup(createElement(Hud, makeProps({ audioState: 'suspended' })));
    const runningHtml = renderToStaticMarkup(createElement(Hud, makeProps({ audioState: 'running' })));

    expect(suspendedHtml).toContain('Aktivera Ljud');
    expect(suspendedHtml).not.toContain('role="status"');
    expect(runningHtml).toContain('Ljud Aktivt');
  });

  it('shows visible status prompt and highlight ring when audioPrompt is true while suspended', () => {
    const html = renderToStaticMarkup(createElement(Hud, makeProps({ audioState: 'suspended', audioPrompt: true })));
    const runningPromptHtml = renderToStaticMarkup(createElement(Hud, makeProps({ audioState: 'running', audioPrompt: true })));

    expect(html).toContain('role="status"');
    expect(html).toContain('Klicka Aktivera Ljud för att höra MIDI');
    expect(html).toContain('ring-amber-200');
    expect(runningPromptHtml).not.toContain('Klicka Aktivera Ljud för att höra MIDI');
  });
});
