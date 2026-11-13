import { ChordMarker, HandIsolation, SongNote } from '../types/midi';
import { KEY_LAYOUTS, KEY_LAYOUT_MAP } from '../utils/musicTheory';

export interface HighwayPlaybackState {
  beat: number;
  loopStart: number;
  loopEnd: number;
  speedMultiplier: number;
  isFrozen: boolean;
  playing?: boolean;
  activeChord: ChordMarker | null;
}

export interface HighwayDrawParams {
  notes: SongNote[];
  timeSignature: [number, number];
  handIsolation: HandIsolation;
  state: HighwayPlaybackState;
}

const BEATS_AHEAD = 4.5;
const BEATS_BEHIND = 0.5;
const HIT_RATIO = 0.88;

function drawRoundedPill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  beat: number,
  timeSignature: [number, number],
  beatToY: (b: number) => number
): void {
  for (const k of KEY_LAYOUTS) {
    const x = k.xNorm * w;
    const kw = k.wNorm * w;
    if (k.isBlack) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fillRect(x, 0, kw, h);
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }

  const beatsPerBar = timeSignature[0] === 6 && timeSignature[1] === 8 ? 3 : Math.max(1, timeSignature[0]);
  const startGrid = Math.floor(beat - BEATS_BEHIND);
  const endGrid = Math.ceil(beat + BEATS_AHEAD);
  for (let b = startGrid; b <= endGrid; b++) {
    const y = beatToY(b);
    if (y < 0 || y > h) continue;
    const isBar = ((b % beatsPerBar) + beatsPerBar) % beatsPerBar === 0;
    ctx.strokeStyle = isBar ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.1)';
    ctx.lineWidth = isBar ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

// INVARIANT: Project notes across [0, loopLen] offsets so loopStart notes scroll in from top before loopEnd wrap.
function drawNotes(
  ctx: CanvasRenderingContext2D,
  w: number,
  params: HighwayDrawParams,
  beatToY: (b: number) => number
): void {
  const { notes, handIsolation, state } = params;
  const loopLen = Math.max(1, state.loopEnd - state.loopStart);
  const offsets = state.beat + BEATS_AHEAD >= state.loopEnd ? [0, loopLen] : [0];

  for (const offset of offsets) {
    for (const n of notes) {
      const nb = n.beat + offset;
      if (nb + n.duration < state.beat - BEATS_BEHIND || nb > state.beat + BEATS_AHEAD) continue;
      const key = KEY_LAYOUT_MAP[n.midi];
      if (!key) continue;

      const yBottom = beatToY(nb);
      const yTop = beatToY(nb + n.duration);
      const x = key.xNorm * w + 1;
      const nw = Math.max(4, key.wNorm * w - 2);
      const nh = Math.max(8, yBottom - yTop);
      const isAuto = (handIsolation === 'RIGHT_ONLY' && n.hand === 'L') || (handIsolation === 'LEFT_ONLY' && n.hand === 'R');

      ctx.globalAlpha = isAuto ? 0.35 : 0.95;
      ctx.fillStyle = n.hand === 'R' ? '#06B6D4' : '#F59E0B';
      drawRoundedPill(ctx, x, yBottom - nh, nw, nh, 4);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawHighwayFrame(ctx: CanvasRenderingContext2D, w: number, h: number, params: HighwayDrawParams): void {
  const { state, timeSignature } = params;
  ctx.fillStyle = '#0B0F19';
  ctx.fillRect(0, 0, w, h);

  const hitY = h * HIT_RATIO;
  const beatToY = (b: number) => hitY - ((b - state.beat) / BEATS_AHEAD) * hitY;

  drawGrid(ctx, w, h, state.beat, timeSignature, beatToY);
  drawNotes(ctx, w, params, beatToY);

  const showWaiting = state.playing !== false && state.isFrozen;
  const isPausedMid = state.playing === false && (state.isFrozen || state.speedMultiplier < 0.99);
  const statusTag = showWaiting ? 'VÄNTAR' : isPausedMid ? 'PAUSAD' : state.speedMultiplier < 0.99 ? `${Math.round(state.speedMultiplier * 100)}%` : null;

  ctx.strokeStyle = showWaiting ? '#F59E0B' : '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hitY);
  ctx.lineTo(w, hitY);
  ctx.stroke();

  if (state.activeChord || statusTag) {
    const label = [state.activeChord?.symbol, statusTag].filter(Boolean).join(' · ');
    ctx.font = '600 13px system-ui, sans-serif';
    const textW = ctx.measureText(label).width;
    ctx.fillStyle = showWaiting ? 'rgba(245, 158, 11, 0.22)' : 'rgba(15, 23, 42, 0.82)';
    drawRoundedPill(ctx, w - textW - 32, 12, textW + 20, 28, 6);
    ctx.fillStyle = showWaiting ? '#FDE68A' : '#E2E8F0';
    ctx.fillText(label, w - textW - 22, 30);
  }
}
