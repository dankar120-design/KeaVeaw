import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../../App';

describe('Responsive viewport layout & scroll guards (#8)', () => {
  it('allows vertical scroll without horizontal overflow and shrinks Highway before clipping Keyboard', () => {
    vi.stubGlobal('navigator', {});
    const html = renderToStaticMarkup(createElement(App));
    vi.unstubAllGlobals();

    expect(html).not.toMatch(/<main[^>]*overflow-hidden/);
    expect(html).not.toContain('w-screen');
    expect(html).not.toContain('min-h-[260px]');
    expect(html).toContain('overflow-y-auto');
    expect(html).toContain('overflow-x-hidden');
    expect(html).toContain('min-h-[120px]');
    expect(html).toContain('clamp(112px,24dvh,176px)');
    expect(html).toContain('flex-wrap');
  });
});
