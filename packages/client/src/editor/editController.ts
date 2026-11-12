import { drawBlueprint, resolvePosition, tileKey, type DistrictId, type TileKindId, type TilePoint, type TileRect } from '@containment/shared';
import type { EditorDocument } from './document.ts';
import { addEntry, deleteEntry, deleteStep, duplicateEntry, editStep, eraseTiles, moveEntry, moveRoom, paintTiles, resizeRoom, rotateEntry, type Collection, type EditResult } from './edits.ts';
import { hitsAt, type Hit } from './hitTest.ts';

export type Tool = 'select' | 'paint' | 'erase' | 'add';

export interface PaletteEntry {
  readonly collection: Collection;
  readonly label: string;
  readonly entry: Record<string, unknown>;
}

export interface Modifiers {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
}

type Drag =
  | { readonly mode: 'entry'; readonly hit: Extract<Hit, { kind: 'entry' }>; readonly origin: TilePoint; readonly from: TilePoint }
  | { readonly mode: 'room'; readonly room: string; readonly rect: TileRect; readonly from: TilePoint; readonly edges: Edges }
  | { readonly mode: 'step'; readonly index: number; readonly rect: TileRect; readonly from: TilePoint }
  | { readonly mode: 'stroke'; readonly tiles: Map<string, TilePoint> };

interface Edges {
  readonly left: boolean;
  readonly right: boolean;
  readonly top: boolean;
  readonly bottom: boolean;
}

const NO_EDGES: Edges = { left: false, right: false, top: false, bottom: false };

const sameHit = (a: Hit | null, b: Hit): boolean => a !== null && JSON.stringify(a) === JSON.stringify(b);

export class EditController {
  tool: Tool = 'select';
  brush: TileKindId = 'hazard';
  selection: Hit | null = null;
  status = '';
  pending: PaletteEntry | null = null;
  ghost: TileRect | null = null;
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
    if (this.tool === 'paint' || this.tool === 'erase') {
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
    const hits = hitsAt(this.document.layout(this.districtId), this.document.district(this.districtId), tile);
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
    if (drag.mode === 'entry') this.ghost = { x: drag.origin.x + dx, y: drag.origin.y + dy, width: 1, height: 1 };
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
      this.apply((layout) => (this.tool === 'erase' ? eraseTiles(layout, tiles) : paintTiles(layout, tiles, brush)));
      this.changed();
      return;
    }
    const dx = tile.x - drag.from.x;
    const dy = tile.y - drag.from.y;
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
    if (lower === 'escape') {
      this.selection = null;
      this.setPending(null);
      return true;
    }
    const selection = this.selection;
    if (!selection) return false;
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

  private cycle(): void {
    const hits = this.pressHits;
    const current = hits.findIndex((hit) => sameHit(this.selection, hit));
    this.selection = hits[(current + 1) % hits.length] ?? this.selection;
  }

  private dragFor(hit: Hit, tile: TilePoint): Drag | null {
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
    if (step && (step.kind === 'patch' || step.kind === 'hollow')) return { mode: 'step', index: hit.index, rect: step.rect, from: tile };
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
