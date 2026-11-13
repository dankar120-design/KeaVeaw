import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Keyboard } from '../Keyboard';

describe('Keyboard focus-visible contrast & layering (#3)', () => {
  it('uses high-contrast focus-visible outline on white keys without white-on-white or z-20 overlap', () => {
    const html = renderToStaticMarkup(
      createElement(Keyboard, {
        activeNotes: new Set<number>(),
        sustainedNotes: new Set<number>(),
        waitingNotes: [],
        activeChord: null,
        onNoteOn: vi.fn(),
        onNoteOff: vi.fn(),
      })
    );
    expect(html).not.toContain('focus-visible:outline-white');
    expect(html).not.toContain('focus-visible:z-20');
    expect(html).toContain('focus-visible:outline-slate-950');
    expect(html).toContain('focus-visible:outline-cyan-300');
  });
});
