import { parseTileLayout, planMarks, TILE_KINDS, type DistrictId, type Facing, type GameContent, type PlanIssue, type PlanMarkKind, type TilePoint, type TileKindId } from '@containment/shared';
import { DECAL_KIND_COLORS } from '../render/world/floorDecals.ts';
import type { PlanLayer } from './viewState.ts';

export type PlanShapeKind = 'tile' | 'mark' | 'room' | 'light' | 'decal' | 'issue';

export interface PlanShape {
  readonly kind: PlanShapeKind;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly color: string;
  readonly label?: string;
  readonly facing?: Facing;
  readonly markKind?: PlanMarkKind;
}

const MARK_COLORS: Readonly<Record<PlanMarkKind, string>> = {
  fixture: '#4fd8ff',
  dressing: '#8796a3',
  'set-piece': '#ffb347',
  quest: '#7cf29a',
  litter: '#56616b',
  npc: '#ff6ad5',
  creature: '#ff4a3a',
  light: '#ffffff',
  anchor: '#ffffff',
};

const MARK_LAYER: Readonly<Record<PlanMarkKind, PlanLayer>> = {
  fixture: 'objects',
  quest: 'objects',
  'set-piece': 'objects',
  dressing: 'dressing',
  litter: 'dressing',
  npc: 'npcs',
  creature: 'npcs',
  anchor: 'npcs',
  light: 'lights',
};

export const tileColor = (kind: TileKindId): string => {
  if (kind === 'void') return '#05080a';
  if (kind === 'door') return '#b8932a';
  if (kind === 'track') return '#4a3a2a';
  if (kind === 'hazard') return '#6f6420';
  const definition = TILE_KINDS[kind];
  if (!definition.walkable) return definition.structure === 'wall' ? '#3a4652' : '#14303a';
  return '#1b2830';
};

const hexOf = (value: number): string => `#${value.toString(16).padStart(6, '0')}`;

export function planDrawList(content: GameContent, districtId: DistrictId, layers: readonly PlanLayer[], issues: readonly PlanIssue[] = []): PlanShape[] {
  const district = content.districts.get(districtId);
  if (!district) return [];
  const on = new Set(layers);
  const shapes: PlanShape[] = [];
  if (on.has('tiles')) {
    const layout = parseTileLayout(district.map);
    for (let y = 0; y < layout.height; y++) {
      for (let x = 0; x < layout.width; x++) shapes.push({ kind: 'tile', x, y, width: 1, height: 1, color: tileColor(layout.tileAt({ x, y })) });
    }
  }
  if (on.has('decals')) {
    for (const decal of district.decals ?? []) {
      shapes.push({ kind: 'decal', ...decal.rect, color: decal.tint ?? hexOf(DECAL_KIND_COLORS[decal.kind] ?? 0x6a6a6a), label: decal.kind });
    }
  }
  if (on.has('rooms')) {
    for (const [id, rect] of Object.entries(district.rooms ?? {})) shapes.push({ kind: 'room', ...rect, color: '#9fd8ff', label: id });
  }
  for (const mark of planMarks(content, districtId)) {
    if (!on.has(MARK_LAYER[mark.kind])) continue;
    const xs = mark.tiles.map((tile) => tile.x);
    const ys = mark.tiles.map((tile) => tile.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const base = { x, y, width: Math.max(...xs) - x + 1, height: Math.max(...ys) - y + 1, color: MARK_COLORS[mark.kind], label: mark.label, markKind: mark.kind };
    if (mark.kind === 'light') {
      const light = district.lights[Number(mark.id.replace('light-', '')) - 1];
      const radius = light?.radius ?? 1;
      shapes.push({ ...base, kind: 'light', x: x + 0.5 - radius, y: y + 0.5 - radius, width: radius * 2, height: radius * 2, color: light?.color ?? '#ffffff' });
      continue;
    }
    shapes.push({ ...base, kind: 'mark', ...(mark.facing === undefined ? {} : { facing: mark.facing }) });
  }
  if (on.has('issues')) {
    for (const issue of issues) if (issue.tile) shapes.push({ kind: 'issue', ...issue.tile, width: 1, height: 1, color: '#ff3b3b', label: issue.message });
  }
  return shapes;
}

const FACING_STEP: Readonly<Record<Facing, TilePoint>> = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 }, east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };

export interface TileBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export class PlanCanvas {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private shapes: readonly PlanShape[] = [];
  private scale = 6;
  private offsetX = 0;
  private offsetY = 0;
  private hoverListeners: ((tile: TilePoint) => void)[] = [];
  private clickListeners: ((tile: TilePoint) => void)[] = [];
  private drag: { x: number; y: number; moved: boolean } | null = null;
  private highlight: TilePoint | null = null;
  private selectionRect: TileBox | null = null;
  private ghostRect: TileBox | null = null;
  private editing = false;
  private tiles: HTMLCanvasElement | null = null;
  private editPointer = false;
  private pointerListeners: Record<'down' | 'move' | 'up', ((tile: TilePoint, event?: PointerEvent) => void)[]> = { down: [], move: [], up: [] };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The plan needs a 2D canvas.');
    this.context = context;
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? 1.2 : 1 / 1.2;
      const next = Math.min(64, Math.max(1, this.scale * factor));
      this.offsetX = event.offsetX - ((event.offsetX - this.offsetX) * next) / this.scale;
      this.offsetY = event.offsetY - ((event.offsetY - this.offsetY) * next) / this.scale;
      this.scale = next;
      this.draw();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    canvas.addEventListener('pointerdown', (event) => {
      canvas.setPointerCapture(event.pointerId);
      if (this.editing && event.button === 0) {
        this.editPointer = true;
        const tile = this.tileAt(event.offsetX, event.offsetY);
        for (const listener of this.pointerListeners.down) listener(tile, event);
        return;
      }
      this.drag = { x: event.offsetX, y: event.offsetY, moved: false };
    });
    canvas.addEventListener('pointermove', (event) => {
      if (this.drag) {
        const dx = event.offsetX - this.drag.x;
        const dy = event.offsetY - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) this.drag.moved = true;
        if (this.drag.moved) {
          this.offsetX += dx;
          this.offsetY += dy;
          this.drag.x = event.offsetX;
          this.drag.y = event.offsetY;
          this.draw();
        }
      }
      const tile = this.tileAt(event.offsetX, event.offsetY);
      if (this.editPointer) for (const listener of this.pointerListeners.move) listener(tile);
      for (const listener of this.hoverListeners) listener(tile);
    });
    canvas.addEventListener('pointerup', (event) => {
      if (this.editPointer) {
        this.editPointer = false;
        const tile = this.tileAt(event.offsetX, event.offsetY);
        for (const listener of this.pointerListeners.up) listener(tile);
        return;
      }
      const clicked = this.drag && !this.drag.moved;
      this.drag = null;
      if (clicked) {
        const tile = this.tileAt(event.offsetX, event.offsetY);
        for (const listener of this.clickListeners) listener(tile);
      }
    });
  }

  setTiles(image: { readonly width: number; readonly height: number; readonly pixels: Uint8ClampedArray } | null): void {
    if (!image) {
      this.tiles = null;
      this.draw();
      return;
    }
    const bitmap = document.createElement('canvas');
    bitmap.width = image.width;
    bitmap.height = image.height;
    bitmap.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height), 0, 0);
    this.tiles = bitmap;
    this.draw();
  }

  setEditing(on: boolean): void {
    this.editing = on;
    this.canvas.style.cursor = on ? 'default' : 'crosshair';
  }

  onPointer(kind: 'down' | 'move' | 'up', listener: (tile: TilePoint, event?: PointerEvent) => void): void {
    this.pointerListeners[kind].push(listener);
  }

  showSelection(rect: TileBox | null, ghost: TileBox | null): void {
    this.selectionRect = rect;
    this.ghostRect = ghost;
    this.draw();
  }

  onHover(listener: (tile: TilePoint) => void): void {
    this.hoverListeners.push(listener);
  }

  onClick(listener: (tile: TilePoint) => void): void {
    this.clickListeners.push(listener);
  }

  show(shapes: readonly PlanShape[], focus?: TilePoint): void {
    const firstShow = this.shapes.length === 0;
    this.shapes = shapes;
    if (firstShow) this.fit();
    if (focus) this.centre(focus);
    this.draw();
  }

  mark(tile: TilePoint | null): void {
    this.highlight = tile;
    this.draw();
  }

  centre(tile: TilePoint): void {
    this.offsetX = this.canvas.clientWidth / 2 - (tile.x + 0.5) * this.scale;
    this.offsetY = this.canvas.clientHeight / 2 - (tile.y + 0.5) * this.scale;
    this.draw();
  }

  fit(): void {
    if (this.tiles) {
      this.fitRect({ x: 0, y: 0, width: this.tiles.width, height: this.tiles.height });
      return;
    }
    const tiles = this.shapes.filter((shape) => shape.kind === 'tile');
    if (tiles.length === 0) return;
    this.fitRect({ x: 0, y: 0, width: Math.max(...tiles.map((shape) => shape.x)) + 1, height: Math.max(...tiles.map((shape) => shape.y)) + 1 });
  }

  fitRect(rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }): void {
    this.scale = Math.min(64, Math.max(1, Math.min(this.canvas.clientWidth / rect.width, this.canvas.clientHeight / rect.height) * 0.95));
    this.offsetX = (this.canvas.clientWidth - rect.width * this.scale) / 2 - rect.x * this.scale;
    this.offsetY = (this.canvas.clientHeight - rect.height * this.scale) / 2 - rect.y * this.scale;
    this.draw();
  }

  private tileAt(px: number, py: number): TilePoint {
    return { x: Math.floor((px - this.offsetX) / this.scale), y: Math.floor((py - this.offsetY) / this.scale) };
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(this.canvas.clientWidth * ratio);
    this.canvas.height = Math.round(this.canvas.clientHeight * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }

  private draw(): void {
    const context = this.context;
    const s = this.scale;
    context.fillStyle = '#020405';
    context.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
    context.save();
    context.translate(this.offsetX, this.offsetY);
    if (this.tiles) {
      context.imageSmoothingEnabled = false;
      context.drawImage(this.tiles, 0, 0, this.tiles.width * s, this.tiles.height * s);
    }
    for (const shape of this.shapes) {
      const x = shape.x * s;
      const y = shape.y * s;
      const w = shape.width * s;
      const h = shape.height * s;
      if (shape.kind === 'tile') {
        context.fillStyle = shape.color;
        context.fillRect(x, y, w + 0.5, h + 0.5);
      } else if (shape.kind === 'decal') {
        context.globalAlpha = 0.5;
        context.fillStyle = shape.color;
        context.fillRect(x, y, w, h);
        context.globalAlpha = 1;
      } else if (shape.kind === 'room') {
        context.strokeStyle = shape.color;
        context.lineWidth = 1;
        context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        if (s >= 3 && shape.label) {
          context.fillStyle = shape.color;
          context.font = `${Math.max(9, Math.min(14, s * 1.4))}px "IBM Plex Mono", monospace`;
          context.fillText(shape.label, x + 3, y + Math.max(10, s * 1.6));
        }
      } else if (shape.kind === 'light') {
        context.strokeStyle = shape.color;
        context.globalAlpha = 0.35;
        context.beginPath();
        context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      } else if (shape.kind === 'issue') {
        context.strokeStyle = '#ff3b3b';
        context.lineWidth = 2;
        context.strokeRect(x - 2, y - 2, w + 4, h + 4);
        context.lineWidth = 1;
      } else {
        const inset = Math.min(1, s * 0.12);
        context.fillStyle = shape.color;
        if (shape.markKind === 'npc' || shape.markKind === 'creature' || shape.markKind === 'anchor') {
          context.beginPath();
          context.arc(x + w / 2, y + h / 2, Math.max(1.5, s * 0.35), 0, Math.PI * 2);
          if (shape.markKind === 'anchor') {
            context.strokeStyle = shape.color;
            context.stroke();
          } else context.fill();
        } else {
          context.fillRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
          if (shape.facing && s >= 4) {
            const step = FACING_STEP[shape.facing];
            context.strokeStyle = '#020405';
            context.lineWidth = Math.max(1, s * 0.15);
            context.beginPath();
            context.moveTo(x + w / 2, y + h / 2);
            context.lineTo(x + w / 2 + (step.x * w) / 2, y + h / 2 + (step.y * h) / 2);
            context.stroke();
            context.lineWidth = 1;
          }
        }
      }
    }
    if (this.selectionRect) {
      context.strokeStyle = '#ffd23f';
      context.lineWidth = 2;
      context.strokeRect(this.selectionRect.x * s - 1, this.selectionRect.y * s - 1, this.selectionRect.width * s + 2, this.selectionRect.height * s + 2);
      context.lineWidth = 1;
    }
    if (this.ghostRect) {
      context.strokeStyle = '#ffffff';
      context.setLineDash([4, 3]);
      context.strokeRect(this.ghostRect.x * s, this.ghostRect.y * s, this.ghostRect.width * s, this.ghostRect.height * s);
      context.setLineDash([]);
    }
    if (this.highlight) {
      context.strokeStyle = '#ffffff';
      context.strokeRect(this.highlight.x * s, this.highlight.y * s, s, s);
    }
    context.restore();
  }
}
