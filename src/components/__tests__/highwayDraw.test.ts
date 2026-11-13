import { describe, it, expect, vi } from 'vitest';
import { drawHighwayFrame, HighwayPlaybackState } from '../highwayDraw';
import { Transport } from '../../engine/Transport';
import { fMinorArpeggio } from '../../data/songs/fMinorArpeggio';

function makeMockCtx() {
  const texts: string[] = [];
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '',
    fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(), closePath: vi.fn(), fill: vi.fn(), stroke: vi.fn(),
    measureText: (t: string) => ({ width: t.length * 7 }),
    fillText: vi.fn((text: string) => { texts.push(text); }),
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

describe('drawHighwayFrame paused wait-mode badge (#9)', () => {
  const baseState: HighwayPlaybackState = {
    beat: 0, loopStart: 0, loopEnd: 24, speedMultiplier: 1, isFrozen: true,
    activeChord: { beat: 0, symbol: 'Fm', rootMidi: 53 },
  };

  it('hides VÄNTAR and shows PAUSAD when paused from wait mode or deceleration, then restores VÄNTAR', () => {
    const playingDraw = makeMockCtx();
    drawHighwayFrame(playingDraw.ctx, 800, 300, { notes: [], timeSignature: [6, 8], handIsolation: 'BOTH', state: { ...baseState, playing: true } });
    expect(playingDraw.texts).toContain('Fm · VÄNTAR');

    const pausedDraw = makeMockCtx();
    drawHighwayFrame(pausedDraw.ctx, 800, 300, { notes: [], timeSignature: [6, 8], handIsolation: 'BOTH', state: { ...baseState, playing: false } });
    expect(pausedDraw.texts.join(' ')).not.toContain('VÄNTAR');
    expect(pausedDraw.texts).toContain('Fm · PAUSAD');

    const decelPaused = makeMockCtx();
    drawHighwayFrame(decelPaused.ctx, 800, 300, { notes: [], timeSignature: [6, 8], handIsolation: 'BOTH', state: { ...baseState, isFrozen: false, speedMultiplier: 0.45, playing: false } });
    expect(decelPaused.texts).toContain('Fm · PAUSAD');

    const resumedDraw = makeMockCtx();
    drawHighwayFrame(resumedDraw.ctx, 800, 300, { notes: [], timeSignature: [6, 8], handIsolation: 'BOTH', state: { ...baseState, playing: true } });
    expect(resumedDraw.texts).toContain('Fm · VÄNTAR');
  });

  it('propagates Transport setPlaying(false) -> setPlaying(true) without losing frozen state', () => {
    let now = 0;
    const tr = new Transport(fMinorArpeggio, () => now);
    tr.setPlaying(true);
    let snap = tr.getSnapshot();
    for (let i = 0; i < 12; i++) { now += 45; snap = tr.step(45); }
    expect(snap.isFrozen).toBe(true);

    const pausedSnap = tr.setPlaying(false);
    expect(pausedSnap.playing).toBe(false);
    const d1 = makeMockCtx();
    drawHighwayFrame(d1.ctx, 800, 300, { notes: fMinorArpeggio.notes, timeSignature: [6, 8], handIsolation: 'BOTH', state: pausedSnap });
    expect(d1.texts).toContain('Fm · PAUSAD');

    const resumedSnap = tr.setPlaying(true);
    expect(resumedSnap.playing).toBe(true);
    const d2 = makeMockCtx();
    drawHighwayFrame(d2.ctx, 800, 300, { notes: fMinorArpeggio.notes, timeSignature: [6, 8], handIsolation: 'BOTH', state: resumedSnap });
    expect(d2.texts).toContain('Fm · VÄNTAR');
  });
});
