import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Highway } from '../Highway';

const baseProps = {
  notes: [],
  timeSignature: [4, 4] as [number, number],
  handIsolation: 'BOTH' as const,
  playing: false,
  getPlaybackState: () => ({
    beat: 0,
    loopStart: 0,
    loopEnd: 4,
    speedMultiplier: 1,
    isFrozen: false,
    activeChord: null,
  }),
};

describe('Highway playedChord badge', () => {
  it('renders played-chord-badge with Spelar: and chord symbol when playedChord is provided', () => {
    const html = renderToStaticMarkup(
      createElement(Highway, { ...baseProps, playedChord: 'Am7' })
    );
    expect(html).toContain('data-testid="played-chord-badge"');
    expect(html).toContain('Spelar:');
    expect(html).toContain('Am7');
  });

  it('does not render played-chord-badge when playedChord is null or omitted', () => {
    const htmlNull = renderToStaticMarkup(
      createElement(Highway, { ...baseProps, playedChord: null })
    );
    expect(htmlNull).not.toContain('played-chord-badge');
    expect(htmlNull).not.toContain('Spelar:');

    const htmlOmitted = renderToStaticMarkup(createElement(Highway, baseProps));
    expect(htmlOmitted).not.toContain('played-chord-badge');
    expect(htmlOmitted).not.toContain('Spelar:');
  });
});
