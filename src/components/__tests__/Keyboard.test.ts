import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Keyboard, KeyboardProps } from '../Keyboard';

const renderKb = (overrides: Partial<KeyboardProps> = {}) =>
  renderToStaticMarkup(
    createElement(Keyboard, {
      activeNotes: new Set<number>(),
      sustainedNotes: new Set<number>(),
      waitingNotes: [],
      activeChord: null,
      onNoteOn: vi.fn(),
      onNoteOff: vi.fn(),
      ...overrides,
    })
  );

describe('Keyboard focus-visible contrast & layering (#3)', () => {
  it('uses high-contrast focus-visible outline on white keys without white-on-white or z-20 overlap', () => {
    const html = renderKb();
    expect(html).not.toContain('focus-visible:outline-white');
    expect(html).not.toContain('focus-visible:z-20');
    expect(html).toContain('focus-visible:outline-slate-950');
    expect(html).toContain('focus-visible:outline-cyan-300');
  });

  it('renders data-midi on every key and discrete C4 anchor dot on midi 60', () => {
    const html = renderKb();
    expect(html).toContain('data-midi="48"');
    expect(html).toContain('data-midi="60"');
    expect(html).toContain('data-midi="79"');
    expect(html).toContain('data-testid="c4-anchor"');
  });

  it('renders qwertyLabels when provided as prop', () => {
    const html = renderKb({ qwertyLabels: { 48: 'A', 60: 'K', 66: '[' } });
    expect(html).toContain('data-testid="qwerty-label"');
    expect(html).toContain('>A<');
    expect(html).toContain('>K<');
    expect(html).toContain('>[<');
  });

  it('renders all keys as type="button" with accessible labels and visual state rings', () => {
    const html = renderKb({
      activeNotes: new Set<number>([60]),
      sustainedNotes: new Set<number>([62]),
    });
    expect(html).toContain('type="button"');
    expect(html).toContain('aria-label="C4"');
    expect(html).toContain('ring-emerald-400/80');
  });
});

describe('Keyboard waiting landing pad visuals (#Förslag-A)', () => {
  it('renders landing pads (V·F5 / H·F1) and ring-[3px] borders without upper-half bg tints', () => {
    const html = renderKb({
      waitingNotes: [
        { beat: 0, duration: 1, midi: 60, hand: 'L', role: 'root', finger: 5 },
        { beat: 0, duration: 1, midi: 64, hand: 'R', role: 'third', finger: 1 },
      ],
    });
    expect(html).toContain('ring-[3px]');
    expect(html).toContain('ring-amber-400');
    expect(html).toContain('ring-cyan-400');
    expect(html).toContain('data-testid="waiting-pad"');
    expect(html).toContain('V·F5');
    expect(html).toContain('H·F1');
    expect(html).not.toContain('bg-cyan-500/30');
    expect(html).not.toContain('bg-amber-500/30');
  });

  it('shows isRestrike waiting-pad and ring-[3px] when waiting key is held (isActive)', () => {
    const html = renderKb({
      activeNotes: new Set<number>([60]),
      waitingNotes: [{ beat: 0, duration: 1, midi: 60, hand: 'L', role: 'root', finger: 5 }],
    });
    const key60 = html.match(/<button[^>]*data-midi="60"[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(key60).toContain('bg-cyan-300');
    expect(key60).toContain('ring-[3px]');
    expect(key60).toContain('ring-amber-400');
    expect(key60).toContain('data-testid="waiting-pad"');
    expect(key60).toContain('bg-slate-950');
    expect(key60).toContain('↻ V·F5');
  });

  it('suppresses sustainRing on waiting key while keeping it on non-waiting sustained keys', () => {
    const html = renderKb({
      sustainedNotes: new Set<number>([62, 65]),
      waitingNotes: [{ beat: 0, duration: 1, midi: 62, hand: 'R', role: 'melody', finger: 2 }],
    });
    const waitingKeyMatch = html.match(/<button[^>]*data-midi="62"[^>]*>/);
    const sustainedKeyMatch = html.match(/<button[^>]*data-midi="65"[^>]*>/);
    expect(waitingKeyMatch?.[0]).toContain('ring-[3px]');
    expect(waitingKeyMatch?.[0]).not.toContain('ring-emerald-400/80');
    expect(sustainedKeyMatch?.[0]).toContain('ring-emerald-400/80');
  });

  it('renders waiting black key with ring-[3px], whitespace-nowrap, H·F3 and no interval label', () => {
    const html = renderKb({
      waitingNotes: [{ beat: 0, duration: 1, midi: 61, hand: 'R', role: 'melody', finger: 3 }],
      activeChord: { beat: 0, symbol: 'C', rootMidi: 60 },
    });
    const key61 = html.match(/<button[^>]*data-midi="61"[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(key61).toContain('ring-[3px]');
    expect(key61).toContain('whitespace-nowrap');
    expect(key61).toContain('H·F3');
    expect(key61).not.toContain('>b2<');
    expect(key61).not.toContain('text-slate-600');
  });

  it('renders waiting white key with both interval label (>3<) and landing pad (H·F3)', () => {
    const html = renderKb({
      waitingNotes: [{ beat: 0, duration: 1, midi: 64, hand: 'R', role: 'third', finger: 3 }],
      activeChord: { beat: 0, symbol: 'C', rootMidi: 60 },
    });
    const key64 = html.match(/<button[^>]*data-midi="64"[\s\S]*?<\/button>/)?.[0] ?? '';
    expect(key64).toContain('>3<');
    expect(key64).toContain('H·F3');
  });
});
