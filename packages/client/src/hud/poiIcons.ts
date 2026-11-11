import { POINT_OF_INTEREST_LABELS, type PointOfInterestKind } from '@containment/shared';
import { h } from '../ui/dom.ts';

const BADGE_COLORS: Readonly<Record<PointOfInterestKind, string>> = {
  tram: '#3f8cff',
  passage: '#8a7dff',
  contracts: '#c9a227',
  shop: '#e0a33a',
  market: '#3fbf8a',
  storage: '#8c6a48',
  crafting: '#d2683a',
  medical: '#e8f4f8',
  quest: '#ffd23f',
  gathering: '#4f9e5a',
};

const GLYPH_COLORS: Partial<Record<PointOfInterestKind, string>> = { medical: '#e0414a', quest: '#1a1405' };

type Glyph = (context: CanvasRenderingContext2D) => void;

const GLYPHS: Readonly<Record<PointOfInterestKind, Glyph>> = {
  tram: (context) => {
    context.fillRect(-0.5, -0.55, 1, 0.85);
    context.clearRect(-0.36, -0.42, 0.72, 0.3);
    context.beginPath();
    context.arc(-0.28, 0.48, 0.13, 0, Math.PI * 2);
    context.arc(0.28, 0.48, 0.13, 0, Math.PI * 2);
    context.fill();
  },
  passage: (context) => {
    context.beginPath();
    context.moveTo(-0.25, -0.65);
    context.lineTo(0.05, -0.25);
    context.lineTo(-0.55, -0.25);
    context.closePath();
    context.moveTo(0.25, 0.65);
    context.lineTo(-0.05, 0.25);
    context.lineTo(0.55, 0.25);
    context.closePath();
    context.fill();
    context.fillRect(-0.33, -0.3, 0.16, 0.6);
    context.fillRect(0.17, -0.3, 0.16, 0.6);
  },
  contracts: (context) => {
    context.fillRect(-0.42, -0.6, 0.84, 1.2);
    context.globalCompositeOperation = 'destination-out';
    for (const y of [-0.3, 0, 0.3]) context.fillRect(-0.26, y - 0.05, 0.52, 0.1);
  },
  shop: (context) => {
    context.fillRect(-0.5, -0.2, 1, 0.8);
    context.lineWidth = 0.14;
    context.beginPath();
    context.arc(0, -0.2, 0.28, Math.PI, 0);
    context.stroke();
  },
  market: (context) => {
    context.lineWidth = 0.16;
    context.beginPath();
    context.moveTo(-0.55, -0.25);
    context.lineTo(0.45, -0.25);
    context.moveTo(0.55, 0.25);
    context.lineTo(-0.45, 0.25);
    context.stroke();
    context.beginPath();
    context.moveTo(0.6, -0.25);
    context.lineTo(0.25, -0.5);
    context.lineTo(0.25, 0);
    context.closePath();
    context.moveTo(-0.6, 0.25);
    context.lineTo(-0.25, 0);
    context.lineTo(-0.25, 0.5);
    context.closePath();
    context.fill();
  },
  storage: (context) => {
    context.fillRect(-0.55, -0.45, 1.1, 0.95);
    context.globalCompositeOperation = 'destination-out';
    context.fillRect(-0.55, -0.12, 1.1, 0.1);
    context.fillRect(-0.1, -0.2, 0.2, 0.26);
  },
  crafting: (context) => {
    context.beginPath();
    context.moveTo(-0.6, -0.35);
    context.lineTo(0.6, -0.35);
    context.lineTo(0.35, -0.05);
    context.lineTo(0.15, -0.05);
    context.lineTo(0.3, 0.4);
    context.lineTo(-0.3, 0.4);
    context.lineTo(-0.15, -0.05);
    context.lineTo(-0.45, -0.1);
    context.closePath();
    context.fill();
    context.fillRect(-0.45, 0.4, 0.9, 0.18);
  },
  medical: (context) => {
    context.fillRect(-0.16, -0.55, 0.32, 1.1);
    context.fillRect(-0.55, -0.16, 1.1, 0.32);
  },
  quest: (context) => {
    context.fillRect(-0.12, -0.6, 0.24, 0.75);
    context.beginPath();
    context.arc(0, 0.45, 0.14, 0, Math.PI * 2);
    context.fill();
  },
  gathering: (context) => {
    context.beginPath();
    context.moveTo(0, -0.6);
    context.lineTo(0.42, -0.1);
    context.lineTo(0, 0.6);
    context.lineTo(-0.42, -0.1);
    context.closePath();
    context.fill();
  },
};

export function drawPoiIcon(context: CanvasRenderingContext2D, kind: PointOfInterestKind, x: number, y: number, size: number, alpha = 1): void {
  const radius = size / 2;
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, y);
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.fillStyle = 'rgba(3, 8, 11, 0.9)';
  context.fill();
  context.beginPath();
  context.arc(0, 0, radius - 1, 0, Math.PI * 2);
  context.fillStyle = BADGE_COLORS[kind];
  context.fill();
  context.restore();

  context.save();
  context.globalAlpha = alpha;
  context.drawImage(glyphImage(kind, Math.ceil(size * 2)), x - size / 2, y - size / 2, size, size);
  context.restore();
}

const glyphCache = new Map<string, HTMLCanvasElement>();

function glyphImage(kind: PointOfInterestKind, pixels: number): HTMLCanvasElement {
  const key = `${kind}:${pixels}`;
  const cached = glyphCache.get(key);
  if (cached) return cached;
  const glyph = document.createElement('canvas');
  glyph.width = pixels;
  glyph.height = pixels;
  const glyphContext = glyph.getContext('2d') as CanvasRenderingContext2D;
  const glyphScale = pixels * 0.42;
  glyphContext.translate(pixels / 2, pixels / 2);
  glyphContext.scale(glyphScale, glyphScale);
  glyphContext.fillStyle = GLYPH_COLORS[kind] ?? '#0b1014';
  glyphContext.strokeStyle = glyphContext.fillStyle;
  GLYPHS[kind](glyphContext);
  glyphCache.set(key, glyph);
  return glyph;
}

export function poiLegend(kinds: readonly PointOfInterestKind[]): HTMLElement {
  return h('ul', { className: 'map-legend', ariaLabel: 'Map legend' },
    ...kinds.map((kind) => {
      const swatch = h('canvas', { className: 'map-legend-icon', width: 32, height: 32 });
      const context = swatch.getContext('2d') as CanvasRenderingContext2D;
      context.scale(2, 2);
      drawPoiIcon(context, kind, 8, 8, 15);
      return h('li', {}, swatch, h('span', {}, POINT_OF_INTEREST_LABELS[kind]));
    }),
  );
}
