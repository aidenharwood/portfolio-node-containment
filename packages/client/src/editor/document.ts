import {
  buildDistrict,
  changedSquares,
  drawLand,
  GAME_CONTENT,
  LAND_SOURCES,
  parseLandPlan,
  parseLayout,
  type DistrictDefinition,
  type DistrictId,
  type DistrictLayout,
  type GameContent,
  type LandMap,
  type LandPlan,
} from '@containment/shared';
import type { EditResult } from './edits.ts';
import type { LandEditResult } from './landEdits.ts';

const UNDO_LIMIT = 200;

type Snapshot = { readonly kind: 'district'; readonly id: DistrictId; readonly layout: DistrictLayout } | { readonly kind: 'land'; readonly id: string; readonly plan: LandPlan };

export interface DocumentChange {
  readonly kind: 'district' | 'land';
  readonly id: string;
}

export class EditorDocument {
  private readonly sources: Readonly<Record<DistrictId, unknown>>;
  private readonly landSources: Readonly<Record<string, unknown>>;
  private readonly layouts = new Map<DistrictId, DistrictLayout>();
  private readonly saved = new Map<DistrictId, string>();
  private readonly districts = new Map<DistrictId, DistrictDefinition>();
  private readonly errors = new Map<DistrictId, string>();
  private readonly landPlans = new Map<string, LandPlan>();
  private readonly lands = new Map<string, LandMap>();
  private readonly firstPlans = new Map<string, LandPlan>();
  private readonly savedLands = new Map<string, string>();
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private readonly listeners: ((change: DocumentChange) => void)[] = [];

  readonly content: GameContent;

  constructor(sources: Readonly<Record<DistrictId, unknown>>, content: GameContent = GAME_CONTENT, landSources: Readonly<Record<string, unknown>> = LAND_SOURCES) {
    this.content = content;
    this.sources = sources;
    this.landSources = landSources;
  }

  layout(id: DistrictId): DistrictLayout {
    const known = this.layouts.get(id);
    if (known) return known;
    const parsed = parseLayout(this.sources[id]);
    this.layouts.set(id, parsed);
    this.saved.set(id, JSON.stringify(parsed));
    return parsed;
  }

  district(id: DistrictId): DistrictDefinition {
    const built = this.districts.get(id);
    if (built) return built;
    this.rebuild(id);
    const rebuilt = this.districts.get(id);
    if (!rebuilt) throw new Error(this.errors.get(id) ?? `District "${id}" could not be built.`);
    return rebuilt;
  }

  buildError(id: DistrictId): string | null {
    return this.errors.get(id) ?? null;
  }

  isDirty(id: DistrictId): boolean {
    const current = this.layouts.get(id);
    return current !== undefined && JSON.stringify(current) !== this.saved.get(id);
  }

  dirtyIds(): DistrictId[] {
    return [...this.layouts.keys()].filter((id) => this.isDirty(id));
  }

  landPlan(id: string): LandPlan {
    const known = this.landPlans.get(id);
    if (known) return known;
    if (this.landSources[id] === undefined) throw new Error(`There is no land plan "${id}".`);
    const parsed = parseLandPlan(this.landSources[id]);
    this.landPlans.set(id, parsed);
    this.firstPlans.set(id, parsed);
    this.savedLands.set(id, JSON.stringify(parsed));
    return parsed;
  }

  land(id: string): LandMap {
    const known = this.lands.get(id);
    if (known) return known;
    const drawn = drawLand(this.landPlan(id));
    this.lands.set(id, drawn);
    return drawn;
  }

  isLandDirty(id: string): boolean {
    const current = this.landPlans.get(id);
    return current !== undefined && JSON.stringify(current) !== this.savedLands.get(id);
  }

  dirtyLands(): string[] {
    return [...this.landPlans.keys()].filter((id) => this.isLandDirty(id));
  }

  markLandSaved(id: string, plan: LandPlan): void {
    this.savedLands.set(id, JSON.stringify(plan));
    this.notify({ kind: 'land', id });
  }

  editedLands(): ReadonlyMap<string, LandMap> {
    return new Map([...this.landPlans].filter(([id, plan]) => plan !== this.firstPlans.get(id)).map(([id]) => [id, this.land(id)]));
  }

  apply(id: DistrictId, edit: (layout: DistrictLayout) => EditResult): EditResult {
    const before = this.layout(id);
    const result = edit(before);
    if (!result.ok) return result;
    this.remember({ kind: 'district', id, layout: before });
    this.replace(id, result.layout);
    return result;
  }

  applyLand(id: string, edit: (plan: LandPlan) => LandEditResult): LandEditResult {
    const before = this.landPlan(id);
    const result = edit(before);
    if (!result.ok) return result;
    let drawn: LandMap;
    try {
      drawn = drawLand(result.plan);
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
    this.remember({ kind: 'land', id, plan: before });
    this.replaceLand(id, result.plan, drawn);
    return result;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): string | null {
    return this.step(this.undoStack, this.redoStack);
  }

  redo(): string | null {
    return this.step(this.redoStack, this.undoStack);
  }

  markSaved(id: DistrictId, layout: DistrictLayout): void {
    this.saved.set(id, JSON.stringify(layout));
    this.notify({ kind: 'district', id });
  }

  onChange(listener: (change: DocumentChange) => void): void {
    this.listeners.push(listener);
  }

  private remember(snapshot: Snapshot): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  private step(from: Snapshot[], to: Snapshot[]): string | null {
    const snapshot = from.pop();
    if (!snapshot) return null;
    if (snapshot.kind === 'land') {
      to.push({ kind: 'land', id: snapshot.id, plan: this.landPlan(snapshot.id) });
      this.replaceLand(snapshot.id, snapshot.plan, drawLand(snapshot.plan));
    } else {
      to.push({ kind: 'district', id: snapshot.id, layout: this.layout(snapshot.id) });
      this.replace(snapshot.id, snapshot.layout);
    }
    return snapshot.id;
  }

  private replace(id: DistrictId, layout: DistrictLayout): void {
    this.layouts.set(id, layout);
    this.rebuild(id);
    this.notify({ kind: 'district', id });
  }

  private replaceLand(id: string, plan: LandPlan, drawn: LandMap): void {
    const before = this.land(id);
    this.landPlans.set(id, plan);
    this.lands.set(id, drawn);
    const changed = new Set(changedSquares(before, drawn).map((square) => square.column + ',' + square.row));
    const recut = this.districtsOnLand(id).filter((districtId) => {
      const square = this.layout(districtId).square;
      return square !== undefined && changed.has(square.column + ',' + square.row);
    });
    for (const districtId of recut) this.rebuild(districtId);
    this.notify({ kind: 'land', id });
    for (const districtId of recut) this.notify({ kind: 'district', id: districtId });
  }

  private districtsOnLand(landId: string): DistrictId[] {
    return [...this.content.levelOfDistrict].filter(([districtId, levelId]) => this.sources[districtId] !== undefined && this.content.levels.get(levelId)?.definition.land?.plan.id === landId).map(([districtId]) => districtId);
  }

  private landOfDistrict(id: DistrictId): LandMap | undefined {
    const levelId = this.content.levelOfDistrict.get(id);
    const land = levelId === undefined ? undefined : this.content.levels.get(levelId)?.definition.land;
    if (!land) return undefined;
    return this.landSources[land.plan.id] === undefined ? land : this.land(land.plan.id);
  }

  private rebuild(id: DistrictId): void {
    try {
      this.districts.set(id, buildDistrict(this.layout(id), this.landOfDistrict(id), this.sources));
      this.errors.delete(id);
    } catch (error) {
      this.errors.set(id, (error as Error).message);
    }
  }

  private notify(change: DocumentChange): void {
    for (const listener of this.listeners) listener(change);
  }
}
