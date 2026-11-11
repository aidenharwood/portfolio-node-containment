import { POINT_OF_INTEREST_LABELS, type PointOfInterestKind } from '@containment/shared';
import { h } from '../ui/dom.ts';

const TINTS: Readonly<Record<PointOfInterestKind, string>> = {
  tram: '#4fd8ff',
  passage: '#9fb4ff',
  contracts: '#ffd23f',
  shop: '#ffd23f',
  market: '#7cf29a',
  storage: '#a9bcc6',
  crafting: '#ffb347',
  medical: '#ff5e5e',
  quest: '#ffd23f',
  gathering: '#7cf29a',
};

const PLATE_FILL = 'rgba(3, 8, 11, 0.92)';
const SOLID_KINDS: ReadonlySet<PointOfInterestKind> = new Set(['quest']);

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

function platePath(context: CanvasRenderingContext2D, radius: number): void {
  const cut = radius * 0.42;
  context.beginPath();
  context.moveTo(-radius + cut, -radius);
  context.lineTo(radius - cut, -radius);
  context.lineTo(radius, -radius + cut);
  context.lineTo(radius, radius - cut);
  context.lineTo(radius - cut, radius);
  context.lineTo(-radius + cut, radius);
  context.lineTo(-radius, radius - cut);
  context.lineTo(-radius, -radius + cut);
  context.closePath();
}

function drawResource(context: CanvasRenderingContext2D, tint: string, radius: number): void {
  context.beginPath();
  context.moveTo(0, -radius);
  context.lineTo(radius * 0.72, 0);
  context.lineTo(0, radius);
  context.lineTo(-radius * 0.72, 0);
  context.closePath();
  context.fillStyle = PLATE_FILL;
  context.fill();
  context.lineWidth = 1;
  context.strokeStyle = tint;
  context.stroke();
  context.beginPath();
  context.arc(0, 0, radius * 0.22, 0, Math.PI * 2);
  context.fillStyle = tint;
  context.fill();
}

export function drawPoiIcon(context: CanvasRenderingContext2D, kind: PointOfInterestKind, x: number, y: number, size: number, alpha = 1): void {
  const radius = size / 2;
  const tint = TINTS[kind];
  const solid = SOLID_KINDS.has(kind);
  context.save();
  context.globalAlpha = alpha;
  context.translate(x, y);
  if (kind === 'gathering') {
    drawResource(context, tint, radius);
    context.restore();
    return;
  }
  platePath(context, radius - 0.5);
  context.fillStyle = solid ? tint : PLATE_FILL;
  context.shadowColor = tint;
  context.shadowBlur = solid ? 6 : 3;
  context.fill();
  context.shadowBlur = 0;
  context.lineWidth = 1;
  context.strokeStyle = solid ? PLATE_FILL : tint;
  context.stroke();
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
  const glyphScale = pixels * 0.38;
  glyphContext.translate(pixels / 2, pixels / 2);
  glyphContext.scale(glyphScale, glyphScale);
  glyphContext.fillStyle = SOLID_KINDS.has(kind) ? '#0b1014' : TINTS[kind];
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
