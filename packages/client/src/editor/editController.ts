import { drawBlueprint, resolvePosition, tileKey, type DistrictId, type ExitSide, type LandPlan, type LandShape, type LandStep, type RegionId, type RoomShape, type TileKindId, type TilePoint, type TileRect } from '@containment/shared';
import type { EditorDocument } from './document.ts';
import { addStep as addLandStep, insertVertex, moveStep as moveLandStep, moveStepBy, moveVertex, removeStep as removeLandStep, removeVertex, replaceStep, resizeStep, type LandEditResult } from './landEdits.ts';
import { addEntry, deleteEntry, deleteStep, duplicateEntry, editStep, eraseTiles, moveEntry, moveRoom, paintHeights, paintTiles, resizeRoom, rotateEntry, type Collection, type EditResult, type HeightMode } from './edits.ts';
import { hitsAt, landHitsAt, landPointsOf, landRectOf, landStepBounds, landStepCovers, segmentDistance, type Hit } from './hitTest.ts';

export type Tool = 'select' | 'paint' | 'erase' | 'height' | 'add' | 'land';

export interface LandBrush {
  readonly step: LandStep['kind'];
  readonly shape: 'polygon' | RoomShape;
  readonly tile: TileKindId;
  readonly height: number;
  readonly width: number;
  readonly ward: RegionId;
  readonly side: ExitSide;
  readonly gate: string;
}

export const DEFAULT_LAND_BRUSH: LandBrush = { step: 'fill', shape: 'polygon', tile: 'grass', height: 1, width: 1, ward: '', side: 'north', gate: 'gate' };

export interface PaletteEntry {
  readonly collection: Collection;
  readonly label: string;
  readonly name?: string;
  readonly entry: Record<string, unknown>;
}

export interface Modifiers {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
  readonly alt?: boolean;
}

type Drag =
  | { readonly mode: 'entry'; readonly hit: Extract<Hit, { kind: 'entry' }>; readonly origin: TilePoint; readonly from: TilePoint }
  | { readonly mode: 'room'; readonly room: string; readonly rect: TileRect; readonly from: TilePoint; readonly edges: Edges }
  | { readonly mode: 'step'; readonly index: number; readonly rect: TileRect; readonly from: TilePoint }
  | { readonly mode: 'stroke'; readonly tiles: Map<string, TilePoint> }
  | { readonly mode: 'landRect'; readonly from: TilePoint }
  | { readonly mode: 'landVertex'; readonly index: number; readonly vertex: number; readonly from: TilePoint }
  | { readonly mode: 'landStep'; readonly index: number; readonly box: TileRect; readonly from: TilePoint; readonly edges: Edges };

interface Edges {
  readonly left: boolean;
  readonly right: boolean;
  readonly top: boolean;
  readonly bottom: boolean;
}

const NO_EDGES: Edges = { left: false, right: false, top: false, bottom: false };

const ARROWS: Readonly<Record<string, TilePoint>> = {
  arrowleft: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  arrowup: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
};

const TOOL_KEYS: Readonly<Record<string, Tool>> = { v: 'select', b: 'paint', e: 'erase', h: 'height', l: 'land' };

const rectBetween = (a: TilePoint, b: TilePoint): TileRect => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x) + 1, height: Math.abs(a.y - b.y) + 1 });

const isLandHit = (hit: Hit | null): hit is Extract<Hit, { kind: 'landStep' | 'landVertex' }> => hit !== null && (hit.kind === 'landStep' || hit.kind === 'landVertex');

export function landBrushClicks(brush: LandBrush): boolean {
  return brush.step === 'line' || ((brush.step === 'fill' || brush.step === 'rise' || brush.step === 'ward') && brush.shape === 'polygon');
}

export function landStepOf(brush: LandBrush, points: readonly TilePoint[], rect: TileRect): LandStep {
  const shape: LandShape = brush.shape === 'polygon' ? { kind: 'polygon', points } : { kind: brush.shape, rect };
  if (brush.step === 'line') return { kind: 'line', points, width: brush.width, tile: brush.tile };
  if (brush.step === 'rise') return { kind: 'rise', shape, height: brush.height };
  if (brush.step === 'ward') return { kind: 'ward', shape, ward: brush.ward };
  if (brush.step === 'ramp') return { kind: 'ramp', rect, side: brush.side, from: 0, to: brush.height };
  if (brush.step === 'gate') return { kind: 'gate', id: brush.gate, rect, tile: brush.tile };
  return { kind: 'fill', shape, tile: brush.tile };
}

const STROKE_TOOLS: ReadonlySet<Tool> = new Set<Tool>(['paint', 'erase', 'height']);

const sameHit = (a: Hit | null, b: Hit): boolean => a !== null && JSON.stringify(a) === JSON.stringify(b);

export class EditController {
  tool: Tool = 'select';
  brush: TileKindId = 'hazard';
  heightMode: HeightMode = 'raise';
  heightLevel = 1;
  selection: Hit | null = null;
  status = '';
  pending: PaletteEntry | null = null;
  ghost: TileRect | null = null;
  landBrush: LandBrush = DEFAULT_LAND_BRUSH;
  landDraft: readonly TilePoint[] | null = null;
  private landId: string | null = null;
  private landOnly = false;
  private landPress: Hit[] = [];
  private districtId: DistrictId;
  private readonly document: EditorDocument;
  private drag: Drag | null = null;
  private pressHits: Hit[] = [];
  private pressKept = false;
  private moved = false;
  private readonly listeners: (() => void)[] = [];

  constructor(document: EditorDocument, districtId: DistrictId) {
    this.document = document;
    this.districtId = districtId;
  }

  get district(): DistrictId {
    return this.districtId;
  }

  get dragging(): boolean {
    return this.drag !== null;
  }

  setDistrict(id: DistrictId): void {
    if (id === this.districtId) return;
    this.districtId = id;
    this.selection = null;
    this.drag = null;
    this.ghost = null;
    this.changed();
  }

  currentLayout(): ReturnType<EditorDocument['layout']> {
    return this.document.layout(this.districtId);
  }

  get land(): string | null {
    return this.landId;
  }

  get onlyLand(): boolean {
    return this.landOnly;
  }

  setLand(id: string | null, only = false): void {
    if (id === this.landId && only === this.landOnly) return;
    this.landId = id;
    this.landOnly = id !== null && only;
    this.landDraft = null;
    if (isLandHit(this.selection)) this.selection = null;
    if (this.landOnly && this.tool !== 'land') this.tool = 'select';
    if (!id && this.tool === 'land') this.tool = 'select';
    this.changed();
  }

  landPlan(): LandPlan | null {
    return this.landId === null ? null : this.document.landPlan(this.landId);
  }

  applyLand(edit: (plan: LandPlan) => LandEditResult): LandEditResult {
    if (this.landId === null) return { ok: false, error: 'There is no land here.' };
    const result = this.document.applyLand(this.landId, edit);
    this.status = result.ok ? '' : result.error;
    return result;
  }

  editLandStep(index: number, step: LandStep): LandEditResult {
    const result = this.applyLand((plan) => replaceStep(plan, index, step));
    this.changed();
    return result;
  }

  moveLandStep(from: number, to: number): LandEditResult {
    const result = this.applyLand((plan) => moveLandStep(plan, from, to));
    if (result.ok) this.selection = { kind: 'landStep', index: to };
    this.changed();
    return result;
  }

  removeLandStep(index: number): LandEditResult {
    const result = this.applyLand((plan) => removeLandStep(plan, index));
    if (result.ok) this.selection = null;
    this.changed();
    return result;
  }

  finishLandDraft(): boolean {
    const draft = this.landDraft;
    if (!draft) return false;
    this.landDraft = null;
    const points = draft.filter((point, index) => index === 0 || point.x !== draft[index - 1]?.x || point.y !== draft[index - 1]?.y);
    const polygon = this.landBrush.step !== 'line';
    if (points.length < (polygon ? 3 : 2)) {
      this.status = polygon ? 'A polygon needs at least 3 points.' : 'A line needs at least 2 points.';
      this.changed();
      return true;
    }
    const result = this.applyLand((plan) => addLandStep(plan, landStepOf(this.landBrush, points, landStepBounds({ kind: 'line', points, width: 1, tile: 'grass' }))));
    if (result.ok) this.selection = { kind: 'landStep', index: result.plan.steps.length - 1 };
    this.changed();
    return true;
  }

  selectLand(tile: TilePoint, modifiers: Modifiers): void {
    const plan = this.landPlan();
    if (!plan) return;
    this.moved = false;
    const selected = isLandHit(this.selection) ? this.selection.index : -1;
    const selectedStep = plan.steps[selected];
    if (modifiers.alt && selectedStep) {
      const found = landPointsOf(selectedStep);
      if (found) {
        const count = found.kind === 'polygon' ? found.points.length : found.points.length - 1;
        let best = 0;
        let distance = Infinity;
        for (let edge = 0; edge < count; edge++) {
          const here = segmentDistance(tile, found.points[edge] as TilePoint, found.points[(edge + 1) % found.points.length] as TilePoint);
          if (here < distance) {
            distance = here;
            best = edge;
          }
        }
        const result = this.applyLand((current) => insertVertex(current, selected, best, tile));
        if (result.ok) this.selection = { kind: 'landVertex', index: selected, vertex: best + 1 };
        this.changed();
        return;
      }
    }
    const hits = landHitsAt(plan, tile);
    const bodies = hits.filter((hit) => hit.kind === 'landStep');
    this.landPress = bodies;
    const vertex = hits.find((hit) => hit.kind === 'landVertex' && hit.index === selected);
    if (vertex && vertex.kind === 'landVertex') {
      this.selection = vertex;
      this.pressKept = false;
      this.drag = { mode: 'landVertex', index: vertex.index, vertex: vertex.vertex, from: tile };
    } else if (selectedStep && landStepCovers(selectedStep, tile)) {
      this.selection = { kind: 'landStep', index: selected };
      this.pressKept = true;
      const box = landStepBounds(selectedStep);
      const rect = landRectOf(selectedStep);
      const edges: Edges = rect
        ? { left: tile.x === rect.x, right: tile.x === rect.x + rect.width - 1, top: tile.y === rect.y, bottom: tile.y === rect.y + rect.height - 1 }
        : NO_EDGES;
      this.drag = { mode: 'landStep', index: selected, box, from: tile, edges };
    } else {
      this.selection = bodies[0] ?? null;
      this.pressKept = false;
      this.drag = null;
    }
    this.changed();
  }

  setPending(entry: PaletteEntry | null): void {
    this.pending = entry;
    this.tool = entry ? 'add' : 'select';
    this.changed();
  }

  select(hit: Hit | null): void {
    this.selection = hit;
    this.changed();
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  pointerDown(tile: TilePoint, modifiers: Modifiers): void {
    if (this.tool === 'land') {
      if (this.landId === null) return;
      if (landBrushClicks(this.landBrush)) {
        this.landDraft = [...(this.landDraft ?? []), tile];
        this.changed();
        return;
      }
      this.drag = { mode: 'landRect', from: tile };
      this.ghost = rectBetween(tile, tile);
      this.changed();
      return;
    }
    if (this.tool === 'select' && this.landOnly) {
      this.selectLand(tile, modifiers);
      return;
    }
    if (STROKE_TOOLS.has(this.tool)) {
      this.drag = { mode: 'stroke', tiles: new Map([[tileKey(tile), tile]]) };
      return;
    }
    if (this.tool === 'add') {
      if (!this.pending) return;
      const collection = this.pending.collection;
      const result = this.apply((layout) => addEntry(layout, collection, this.pending?.entry ?? {}, tile));
      if (result.ok) this.selection = { kind: 'entry', ref: { collection, index: (result.layout[collection] as readonly unknown[]).length - 1 } };
      if (!modifiers.shift && result.ok) {
        this.pending = null;
        this.tool = 'select';
      }
      this.changed();
      return;
    }
    const hits = hitsAt(this.document.layout(this.districtId), this.document.district(this.districtId), tile, this.document.content);
    this.pressHits = hits;
    this.moved = false;
    const selection = this.selection;
    this.pressKept = selection !== null && hits.some((hit) => sameHit(selection, hit));
    if (this.pressKept && selection) {
      this.drag = this.dragFor(selection, tile);
    } else {
      const chosen = hits[0] ?? null;
      this.selection = chosen;
      this.drag = chosen && chosen.kind === 'entry' ? this.dragFor(chosen, tile) : null;
    }
    this.changed();
  }

  pointerMove(tile: TilePoint): void {
    const drag = this.drag;
    if (!drag) return;
    if (drag.mode !== 'stroke' && (tile.x !== drag.from.x || tile.y !== drag.from.y)) this.moved = true;
    if (drag.mode === 'stroke') {
      drag.tiles.set(tileKey(tile), tile);
      return;
    }
    const dx = tile.x - drag.from.x;
    const dy = tile.y - drag.from.y;
    if (drag.mode === 'landRect') this.ghost = rectBetween(drag.from, tile);
    else if (drag.mode === 'landVertex') this.ghost = { x: tile.x, y: tile.y, width: 1, height: 1 };
    else if (drag.mode === 'landStep') this.ghost = this.resized(drag.box, drag.edges, dx, dy);
    else if (drag.mode === 'entry') this.ghost = { x: drag.origin.x + dx, y: drag.origin.y + dy, width: 1, height: 1 };
    else if (drag.mode === 'room') this.ghost = this.resized(drag.rect, drag.edges, dx, dy);
    else this.ghost = { ...drag.rect, x: drag.rect.x + dx, y: drag.rect.y + dy };
    this.changed();
  }

  pointerUp(tile: TilePoint): void {
    const drag = this.drag;
    this.drag = null;
    this.ghost = null;
    if (!drag) return;
    if (drag.mode === 'stroke') {
      drag.tiles.set(tileKey(tile), tile);
      const tiles = [...drag.tiles.values()];
      const brush = this.brush;
      const { heightMode, heightLevel } = this;
      this.apply((layout) => (this.tool === 'height' ? paintHeights(layout, tiles, heightMode, heightLevel) : this.tool === 'erase' ? eraseTiles(layout, tiles) : paintTiles(layout, tiles, brush)));
      this.changed();
      return;
    }
    if (drag.mode === 'landRect') {
      const rect = rectBetween(drag.from, tile);
      const result = this.applyLand((plan) => addLandStep(plan, landStepOf(this.landBrush, [], rect)));
      if (result.ok) this.selection = { kind: 'landStep', index: result.plan.steps.length - 1 };
      this.changed();
      return;
    }
    const dx = tile.x - drag.from.x;
    const dy = tile.y - drag.from.y;
    if (drag.mode === 'landVertex' || drag.mode === 'landStep') {
      if (dx === 0 && dy === 0) {
        if (this.pressKept && !this.moved) this.cycleLand();
      } else if (drag.mode === 'landVertex') this.applyLand((plan) => moveVertex(plan, drag.index, drag.vertex, tile));
      else if (drag.edges === NO_EDGES || (!drag.edges.left && !drag.edges.right && !drag.edges.top && !drag.edges.bottom)) this.applyLand((plan) => moveStepBy(plan, drag.index, { x: dx, y: dy }));
      else this.applyLand((plan) => resizeStep(plan, drag.index, this.resized(drag.box, drag.edges, dx, dy)));
      this.changed();
      return;
    }
    if (dx === 0 && dy === 0) {
      if (this.pressKept && !this.moved) this.cycle();
      this.changed();
      return;
    }
    if (drag.mode === 'entry') this.apply((layout) => moveEntry(layout, drag.hit.ref, { x: drag.origin.x + dx, y: drag.origin.y + dy }));
    else if (drag.mode === 'room') {
      const moving = !drag.edges.left && !drag.edges.right && !drag.edges.top && !drag.edges.bottom;
      this.apply((layout) => (moving ? moveRoom(layout, drag.room, { x: drag.rect.x + dx, y: drag.rect.y + dy }) : resizeRoom(layout, drag.room, this.resized(drag.rect, drag.edges, dx, dy))));
    } else this.apply((layout) => editStep(layout, drag.index, { rect: { ...drag.rect, x: drag.rect.x + dx, y: drag.rect.y + dy } }));
    this.changed();
  }

  key(key: string, modifiers: Modifiers): boolean {
    const lower = key.toLowerCase();
    if (modifiers.ctrl && lower === 'z') {
      const changed = modifiers.shift ? this.document.redo() : this.document.undo();
      this.selection = null;
      this.status = changed ? '' : modifiers.shift ? 'Nothing to redo.' : 'Nothing to undo.';
      this.changed();
      return true;
    }
    if (modifiers.ctrl && lower === 'y') return this.key('z', { ctrl: true, shift: true });
    if (lower === 'enter' && this.landDraft) return this.finishLandDraft();
    if (lower === 'escape') {
      this.selection = null;
      this.landDraft = null;
      this.setPending(null);
      return true;
    }
    const tool = TOOL_KEYS[lower];
    if (tool && !modifiers.ctrl) {
      if (tool === 'land' && this.landId === null) return false;
      if (tool !== 'land' && tool !== 'select' && this.landOnly) return false;
      this.landDraft = null;
      this.pending = null;
      this.tool = tool;
      this.changed();
      return true;
    }
    const selection = this.selection;
    if (!selection) return false;
    if (selection.kind === 'landStep' || selection.kind === 'landVertex') return this.landKey(selection, lower);
    const arrow = ARROWS[lower];
    if (arrow) {
      if (!this.nudge(selection, arrow)) return false;
      this.changed();
      return true;
    }
    if (selection.kind === 'entry') {
      if (lower === 'r' && !modifiers.ctrl) {
        this.apply((layout) => rotateEntry(layout, selection.ref));
      } else if (lower === 'delete' || lower === 'backspace') {
        if (this.apply((layout) => deleteEntry(layout, selection.ref)).ok) this.selection = null;
      } else if (modifiers.ctrl && lower === 'd') {
        const result = this.apply((layout) => duplicateEntry(layout, selection.ref));
        if (result.ok && selection.ref.collection !== 'anchors') {
          const collection = selection.ref.collection;
          this.selection = { kind: 'entry', ref: { collection, index: (result.layout[collection] as readonly unknown[]).length - 1 } };
        }
      } else return false;
      this.changed();
      return true;
    }
    if (selection.kind === 'step' && (lower === 'delete' || lower === 'backspace')) {
      if (this.apply((layout) => deleteStep(layout, selection.index)).ok) this.selection = null;
      this.changed();
      return true;
    }
    return false;
  }

  apply(edit: (layout: Parameters<Parameters<EditorDocument['apply']>[1]>[0]) => EditResult): EditResult {
    const result = this.document.apply(this.districtId, edit);
    this.status = result.ok ? '' : result.reason;
    return result;
  }

  private nudge(selection: Hit, by: TilePoint): boolean {
    const drag = this.dragFor(selection, { x: 0, y: 0 });
    if (!drag || (drag.mode !== 'entry' && drag.mode !== 'room' && drag.mode !== 'step')) return false;
    if (drag.mode === 'entry') this.apply((layout) => moveEntry(layout, drag.hit.ref, { x: drag.origin.x + by.x, y: drag.origin.y + by.y }));
    else if (drag.mode === 'room') this.apply((layout) => moveRoom(layout, drag.room, { x: drag.rect.x + by.x, y: drag.rect.y + by.y }));
    else this.apply((layout) => editStep(layout, drag.index, { rect: { ...drag.rect, x: drag.rect.x + by.x, y: drag.rect.y + by.y } }));
    return true;
  }

  private landKey(selection: Extract<Hit, { kind: 'landStep' | 'landVertex' }>, lower: string): boolean {
    const arrow = ARROWS[lower];
    if (arrow) {
      this.applyLand((plan) => moveStepBy(plan, selection.index, arrow));
      this.changed();
      return true;
    }
    if (lower !== 'delete' && lower !== 'backspace') return false;
    if (selection.kind === 'landVertex') {
      if (this.applyLand((plan) => removeVertex(plan, selection.index, selection.vertex)).ok) this.selection = { kind: 'landStep', index: selection.index };
    } else if (this.applyLand((plan) => removeLandStep(plan, selection.index)).ok) this.selection = null;
    this.changed();
    return true;
  }

  private cycleLand(): void {
    const hits = this.landPress;
    const current = hits.findIndex((hit) => sameHit(this.selection, hit));
    this.selection = hits[(current + 1) % hits.length] ?? this.selection;
  }

  private cycle(): void {
    const hits = this.pressHits;
    const current = hits.findIndex((hit) => sameHit(this.selection, hit));
    this.selection = hits[(current + 1) % hits.length] ?? this.selection;
  }

  private dragFor(hit: Hit, tile: TilePoint): Drag | null {
    if (hit.kind === 'landStep' || hit.kind === 'landVertex') return null;
    const layout = this.document.layout(this.districtId);
    if (hit.kind === 'entry') {
      const ref = hit.ref;
      const at = ref.collection === 'anchors' ? layout.anchors[ref.name] : (layout[ref.collection][ref.index] as { at?: Parameters<typeof resolvePosition>[1] } | undefined)?.at;
      if (!at) return null;
      const origin = resolvePosition(drawBlueprint(layout.size, layout.steps, layout.tiles), at, 'selection');
      return { mode: 'entry', hit, origin, from: tile };
    }
    if (hit.kind === 'room' || hit.kind === 'dressing') {
      const step = layout.steps.find((each) => each.kind === 'room' && each.id === hit.room);
      if (!step || step.kind !== 'room') return null;
      const rect = step.rect;
      const edges: Edges = {
        left: tile.x === rect.x,
        right: tile.x === rect.x + rect.width - 1,
        top: tile.y === rect.y,
        bottom: tile.y === rect.y + rect.height - 1,
      };
      return { mode: 'room', room: hit.room, rect, from: tile, edges: hit.kind === 'dressing' ? NO_EDGES : edges };
    }
    const step = layout.steps[hit.index];
    if (step && (step.kind === 'patch' || step.kind === 'hollow' || step.kind === 'rise' || step.kind === 'ramp')) return { mode: 'step', index: hit.index, rect: step.rect, from: tile };
    return null;
  }

  private resized(rect: TileRect, edges: Edges, dx: number, dy: number): TileRect {
    const moving = !edges.left && !edges.right && !edges.top && !edges.bottom;
    if (moving) return { ...rect, x: rect.x + dx, y: rect.y + dy };
    const left = edges.left ? rect.x + dx : rect.x;
    const top = edges.top ? rect.y + dy : rect.y;
    const right = edges.right ? rect.x + rect.width - 1 + dx : rect.x + rect.width - 1;
    const bottom = edges.bottom ? rect.y + rect.height - 1 + dy : rect.y + rect.height - 1;
    return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
