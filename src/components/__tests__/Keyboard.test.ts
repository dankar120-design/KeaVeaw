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

  it('renders data-midi on every key and discrete C4 anchor dot on midi 60', () => {
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
    expect(html).toContain('data-midi="48"');
    expect(html).toContain('data-midi="60"');
    expect(html).toContain('data-midi="79"');
    expect(html).toContain('data-testid="c4-anchor"');
  });

  it('renders qwertyLabels when provided as prop', () => {
    const html = renderToStaticMarkup(
      createElement(Keyboard, {
        activeNotes: new Set<number>(),
        sustainedNotes: new Set<number>(),
        waitingNotes: [],
        activeChord: null,
        onNoteOn: vi.fn(),
        onNoteOff: vi.fn(),
        qwertyLabels: { 48: 'A', 60: 'K', 66: '[' },
      })
    );
    expect(html).toContain('data-testid="qwerty-label"');
    expect(html).toContain('>A<');
    expect(html).toContain('>K<');
    expect(html).toContain('>[<');
  });

  it('renders all keys as type="button" with accessible labels and visual state rings', () => {
    const html = renderToStaticMarkup(
      createElement(Keyboard, {
        activeNotes: new Set<number>([60]),
        sustainedNotes: new Set<number>([62]),
        waitingNotes: [],
        activeChord: null,
        onNoteOn: vi.fn(),
        onNoteOff: vi.fn(),
      })
    );
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="C4"');
    expect(html).toContain('ring-emerald-400/80');
  });
});
