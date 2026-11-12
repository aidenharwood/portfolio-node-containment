import { buildDistrict, parseLayout, type DistrictDefinition, type DistrictId, type DistrictLayout } from '@containment/shared';
import type { EditResult } from './edits.ts';

const UNDO_LIMIT = 200;

interface Snapshot {
  readonly id: DistrictId;
  readonly layout: DistrictLayout;
}

export class EditorDocument {
  private readonly sources: Readonly<Record<DistrictId, unknown>>;
  private readonly layouts = new Map<DistrictId, DistrictLayout>();
  private readonly saved = new Map<DistrictId, string>();
  private readonly districts = new Map<DistrictId, DistrictDefinition>();
  private readonly errors = new Map<DistrictId, string>();
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];
  private readonly listeners: ((id: DistrictId) => void)[] = [];

  constructor(sources: Readonly<Record<DistrictId, unknown>>) {
    this.sources = sources;
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

  apply(id: DistrictId, edit: (layout: DistrictLayout) => EditResult): EditResult {
    const before = this.layout(id);
    const result = edit(before);
    if (!result.ok) return result;
    this.undoStack.push({ id, layout: before });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.replace(id, result.layout);
    return result;
  }

  undo(): DistrictId | null {
    return this.step(this.undoStack, this.redoStack);
  }

  redo(): DistrictId | null {
    return this.step(this.redoStack, this.undoStack);
  }

  markSaved(id: DistrictId, layout: DistrictLayout): void {
    this.saved.set(id, JSON.stringify(layout));
    this.notify(id);
  }

  onChange(listener: (id: DistrictId) => void): void {
    this.listeners.push(listener);
  }

  private step(from: Snapshot[], to: Snapshot[]): DistrictId | null {
    const snapshot = from.pop();
    if (!snapshot) return null;
    to.push({ id: snapshot.id, layout: this.layout(snapshot.id) });
    this.replace(snapshot.id, snapshot.layout);
    return snapshot.id;
  }

  private replace(id: DistrictId, layout: DistrictLayout): void {
    this.layouts.set(id, layout);
    this.rebuild(id);
    this.notify(id);
  }

  private rebuild(id: DistrictId): void {
    try {
      this.districts.set(id, buildDistrict(this.layout(id)));
      this.errors.delete(id);
    } catch (error) {
      this.errors.set(id, (error as Error).message);
    }
  }

  private notify(id: DistrictId): void {
    for (const listener of this.listeners) listener(id);
  }
}
