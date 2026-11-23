import { LAYOUT_CHOICES, PREFABS, type BlueprintStep, type DistrictLayout, type GameContent, type LandPlan, type LandStep, type TileRect } from '@containment/shared';
import type { EditController } from './editController.ts';
import { deleteEntry, deleteStep, duplicateEntry, editStep, resizeRoom, rotateEntry, setDressing, setField, type EditResult, type RoomDressingEntry } from './edits.ts';

type FieldKind = 'text' | 'number' | { readonly choices: readonly string[] } | { readonly suggest: readonly string[] };

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

const KIND_NAMES: Readonly<Record<string, string>> = {
  objects: 'Object',
  assemblies: 'Assembly',
  npcs: 'Person',
  creatures: 'Creature',
  lights: 'Light',
  decals: 'Decal',
  setPieces: 'Set-piece',
};

const FIELD_NAMES: Readonly<Record<string, string>> = {
  npc: 'person',
  prefab: 'set-piece',
  everyX: 'every x',
  everyY: 'every y',
};

const describePosition = (at: unknown): string => {
  if (!at || typeof at !== 'object') return 'No position.';
  const place = at as Record<string, unknown>;
  if (typeof place.room === 'string') return `In room ${place.room}, ${String(place.dx ?? 0)} across and ${String(place.dy ?? 0)} down from its corner.`;
  if (typeof place.exit === 'string') return `In exit ${place.exit}, tile ${String(place.index)} along it.`;
  if (Array.isArray(place.link)) return `In the link between ${place.link.join(' and ')}, tile ${String(place.index)} along it.`;
  if (typeof place.x === 'number' && typeof place.y === 'number') return `At tile ${place.x}, ${place.y}.`;
  return `At ${JSON.stringify(at)}.`;
};

type LandFieldKind = 'number' | 'text' | 'tile' | 'side' | 'ward';

const LAND_FIELDS: Readonly<Record<LandStep['kind'], Readonly<Record<string, LandFieldKind>>>> = {
  fill: { tile: 'tile' },
  line: { tile: 'tile', width: 'number' },
  rise: { height: 'number' },
  ramp: { side: 'side', from: 'number', to: 'number' },
  ward: { ward: 'ward' },
  gate: { id: 'text', tile: 'tile' },
  relief: { seed: 'number', low: 'number', high: 'number', scale: 'number' },
  soften: {},
};

const cornersOf = (rect: TileRect) => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
  { x: rect.x, y: rect.y + rect.height },
];

const boxOfPoints = (points: readonly { readonly x: number; readonly y: number }[]): TileRect => {
  if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 };
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(1, Math.max(...xs) - x), height: Math.max(1, Math.max(...ys) - y) };
};

export function landStepName(step: LandStep): string {
  if (step.kind === 'fill') return 'fill ' + step.tile + ' (' + step.shape.kind + ')';
  if (step.kind === 'line') return 'line ' + step.tile + ' ×' + step.width;
  if (step.kind === 'rise') return 'rise to ' + step.height + ' (' + step.shape.kind + ')';
  if (step.kind === 'ramp') return 'ramp ' + step.from + '→' + step.to + ' ' + step.side;
  if (step.kind === 'ward') return 'ward ' + step.ward + ' (' + step.shape.kind + ')';
  if (step.kind === 'relief') return 'relief ' + step.low + '→' + step.high + ' (' + step.shape.kind + ')';
  if (step.kind === 'soften') return 'soften (' + step.shape.kind + ')';
  return 'gate ' + step.id;
}

export class PropertiesPanel {
  readonly root = element('section', { class: 'properties', 'aria-label': 'Properties' });
  private readonly content: GameContent;
  private readonly controller: EditController;
  private readonly suggestions: Record<string, readonly string[]>;

  constructor(content: GameContent, controller: EditController) {
    this.content = content;
    this.controller = controller;
    this.suggestions = {
      object: [...content.worldObjects.keys()],
      assembly: [...content.assemblies.keys()],
      npc: [...content.npcs.keys()],
      creature: [...content.creatures.keys()],
      prefab: Object.keys(PREFABS),
    };
    for (const [name, values] of Object.entries(this.suggestions)) {
      const list = element('datalist', { id: `suggest-${name}` });
      list.append(...values.map((value) => element('option', { value })));
      this.root.append(list);
    }
  }

  private shownLayout: DistrictLayout | null = null;
  private shownLand: LandPlan | null = null;
  private shownSelection = '';

  render(layout: DistrictLayout, land: LandPlan | null = null): void {
    const selectionKey = JSON.stringify(this.controller.selection);
    if (layout === this.shownLayout && land === this.shownLand && selectionKey === this.shownSelection) return;
    this.shownLayout = layout;
    this.shownLand = land;
    this.shownSelection = selectionKey;
    const keep = [...this.root.querySelectorAll('datalist')];
    this.root.replaceChildren(...keep);
    const selection = this.controller.selection;
    if (land && (this.controller.onlyLand || selection?.kind === 'landStep' || selection?.kind === 'landVertex')) {
      this.renderLand(land, selection?.kind === 'landStep' || selection?.kind === 'landVertex' ? selection.index : null);
      return;
    }
    if (!selection) {
      this.root.append(element('h2', {}, 'Nothing selected'));
      const steps = element('ol', { class: 'hint steps' });
      steps.append(
        element('li', {}, 'Click a room, object or person on the plan to select it.'),
        element('li', {}, 'Drag it, or use the arrow keys, to move it.'),
        element('li', {}, 'Change its details here, or add something new from the list above.'),
        element('li', {}, 'Save when you are happy. Press ? for every shortcut.'),
      );
      this.root.append(steps);
      return;
    }
    if (selection.kind === 'entry') this.renderEntry(layout, selection.ref);
    else if (selection.kind === 'step') this.renderStep(layout, selection.index);
    else if (selection.kind === 'room' || selection.kind === 'dressing') this.renderRoom(layout, selection.room, selection.kind === 'dressing');
  }

  private renderLand(plan: LandPlan, index: number | null): void {
    const step = index === null ? undefined : plan.steps[index];
    if (step && index !== null) {
      this.root.append(element('h2', {}, 'Land step ' + index + ' · ' + step.kind));
      const record = step as unknown as Record<string, unknown>;
      const replace = (next: LandStep) => this.controller.editLandStep(index, next);
      const fields = LAND_FIELDS[step.kind] ?? {};
      for (const [field, kind] of Object.entries(fields)) {
        const choices = kind === 'tile' ? { choices: LAYOUT_CHOICES.tiles } : kind === 'side' ? { choices: LAYOUT_CHOICES.facings } : kind === 'ward' ? { suggest: [...this.content.regions.keys()] } : kind;
        this.root.append(this.landField(field, choices, record[field], (value) => replace({ ...step, [field]: value } as LandStep)));
      }
      const rect: TileRect | null = step.kind === 'ramp' || step.kind === 'gate' ? step.rect : step.kind !== 'line' && step.shape.kind !== 'polygon' ? step.shape.rect : null;
      if (step.kind !== 'line' && step.kind !== 'ramp' && step.kind !== 'gate') {
        this.root.append(
          this.landField('shape', { choices: ['polygon', 'rect', 'round', 'octagon'] }, step.shape.kind, (value) => {
            if (value === step.shape.kind) return { ok: true, plan };
            const box = rect ?? boxOfPoints(step.shape.kind === 'polygon' ? step.shape.points : []);
            const shape = value === 'polygon' ? { kind: 'polygon' as const, points: cornersOf(box) } : { kind: value as 'rect' | 'round' | 'octagon', rect: box };
            return replace({ ...step, shape } as LandStep);
          }),
        );
      }
      if (rect) {
        for (const side of ['x', 'y', 'width', 'height'] as const) {
          this.root.append(
            this.landField(side, 'number', rect[side], (value) => {
              const next = { ...rect, [side]: value };
              if (step.kind === 'ramp' || step.kind === 'gate') return replace({ ...step, rect: next });
              if (step.kind === 'line' || step.shape.kind === 'polygon') return { ok: true, plan };
              return replace({ ...step, shape: { kind: step.shape.kind, rect: next } });
            }),
          );
        }
      }
    } else this.root.append(element('h2', {}, 'Land · ' + plan.id), element('p', { class: 'hint' }, 'Click land on the plan to select a step, or pick the Land tool (L) to draw a new one. Later steps paint over earlier ones.'));
    this.root.append(element('h3', {}, 'Steps'));
    const list = element('ol', { class: 'land-steps', start: '0' });
    plan.steps.forEach((each, at) => {
      const item = element('li');
      if (at === index) item.setAttribute('aria-current', 'true');
      const pick = element('button', { type: 'button', title: 'Select this step' }, landStepName(each));
      pick.addEventListener('click', () => this.controller.select({ kind: 'landStep', index: at }));
      const up = element('button', { type: 'button', title: 'Draw it earlier', 'aria-label': 'Move up' }, '↑');
      up.disabled = at === 0;
      up.addEventListener('click', () => this.controller.moveLandStep(at, at - 1));
      const down = element('button', { type: 'button', title: 'Draw it later', 'aria-label': 'Move down' }, '↓');
      down.disabled = at === plan.steps.length - 1;
      down.addEventListener('click', () => this.controller.moveLandStep(at, at + 1));
      const remove = element('button', { type: 'button', title: 'Remove this step', 'aria-label': 'Remove' }, '×');
      remove.addEventListener('click', () => this.controller.removeLandStep(at));
      item.append(pick, up, down, remove);
      list.append(item);
    });
    this.root.append(list);
  }

  private landField(name: string, kind: FieldKind, value: unknown, change: (value: unknown) => unknown): HTMLElement {
    const label = element('label', { class: 'field' });
    label.append(element('span', {}, name));
    let input: HTMLInputElement | HTMLSelectElement;
    if (typeof kind === 'object' && 'choices' in kind) {
      input = element('select');
      input.append(...kind.choices.map((choice) => element('option', { value: choice }, choice)));
    } else {
      input = element('input', { type: kind === 'number' ? 'number' : 'text', step: '1' });
      if (typeof kind === 'object') {
        const id = 'suggest-land-' + name;
        if (!this.root.querySelector('#' + id)) {
          const list = element('datalist', { id });
          list.append(...kind.suggest.map((each) => element('option', { value: each })));
          this.root.append(list);
        }
        input.setAttribute('list', id);
      }
    }
    input.value = value === undefined || value === null ? '' : String(value);
    input.addEventListener('change', () => {
      change(kind === 'number' ? Number(input.value) : input.value);
    });
    label.append(input);
    return label;
  }

  private renderEntry(layout: DistrictLayout, ref: Parameters<typeof setField>[1]): void {
    if (ref.collection === 'anchors') {
      this.root.append(element('h2', {}, `Anchor · ${ref.name}`), element('p', { class: 'hint' }, 'Other content reads this point by name. Drag it to move it.'));
      return;
    }
    const entry = (layout[ref.collection] as readonly Record<string, unknown>[])[ref.index];
    if (!entry) return;
    this.root.append(element('h2', {}, `${KIND_NAMES[ref.collection] ?? ref.collection} · ${String(entry.id ?? entry.kind ?? entry.color ?? ref.index)}`));
    this.root.append(element('p', { class: 'hint' }, describePosition(entry.at)));
    const fields: Record<string, Record<string, FieldKind>> = {
      objects: { object: { suggest: this.suggestions.object ?? [] }, facing: { choices: ['', ...LAYOUT_CHOICES.facings] } },
      assemblies: { assembly: { suggest: this.suggestions.assembly ?? [] }, facing: { choices: ['', ...LAYOUT_CHOICES.facings] }, span: 'number' },
      npcs: { npc: { suggest: this.suggestions.npc ?? [] } },
      creatures: { creature: { suggest: this.suggestions.creature ?? [] } },
      lights: { radius: 'number', color: 'text', intensity: 'number' },
      decals: { kind: { choices: LAYOUT_CHOICES.decalKinds }, pattern: { choices: ['', ...LAYOUT_CHOICES.decalPatterns] }, tint: 'text', width: 'number', height: 'number' },
      setPieces: { prefab: { suggest: this.suggestions.prefab ?? [] }, facing: { choices: LAYOUT_CHOICES.facings } },
    };
    for (const [field, kind] of Object.entries(fields[ref.collection] ?? {})) {
      this.root.append(this.field(field, kind, entry[field], (value) => setField(this.layoutNow(), ref, field, value)));
    }
    this.root.append(
      this.actions([
        ['Rotate (R)', () => rotateEntry(this.layoutNow(), ref)],
        ['Duplicate (Ctrl+D)', () => duplicateEntry(this.layoutNow(), ref)],
        ['Delete', () => deleteEntry(this.layoutNow(), ref), true],
      ]),
    );
  }

  private renderStep(layout: DistrictLayout, index: number): void {
    const step = layout.steps[index];
    if (!step) return;
    this.root.append(element('h2', {}, `Step ${index} · ${step.kind}`));
    const numbers = (names: readonly string[]): Record<string, FieldKind> => Object.fromEntries(names.map((name) => [name, 'number' as const]));
    const fields: Partial<Record<BlueprintStep['kind'], Record<string, FieldKind>>> = {
      link: { ...numbers(['width', 'offset']), floor: { choices: LAYOUT_CHOICES.tiles } },
      exit: { side: { choices: LAYOUT_CHOICES.facings }, ...numbers(['width', 'offset']), gate: { choices: ['false', 'true'] } },
      pillars: numbers(['everyX', 'everyY', 'inset']),
      patch: { tile: { choices: LAYOUT_CHOICES.tiles } },
    };
    const record = step as unknown as Record<string, unknown>;
    for (const [field, kind] of Object.entries(fields[step.kind] ?? {})) {
      this.root.append(this.field(field, kind, record[field], (value) => editStep(this.layoutNow(), index, { [field]: field === 'gate' ? value === 'true' : value })));
    }
    if ('rect' in step) {
      for (const side of ['x', 'y', 'width', 'height'] as const) {
        this.root.append(this.field(side, 'number', step.rect[side], (value) => editStep(this.layoutNow(), index, { rect: { ...step.rect, [side]: value } })));
      }
    }
    this.root.append(this.actions([['Delete step', () => deleteStep(this.layoutNow(), index), true]]));
  }

  private renderRoom(layout: DistrictLayout, room: string, generated: boolean): void {
    this.root.append(element('h2', {}, `Room · ${room}`));
    if (generated) this.root.append(element('p', { class: 'hint' }, 'That is one of this room’s generated crowd. Change who stands here with the dressing below.'));
    const step = layout.steps.find((each) => each.kind === 'room' && each.id === room);
    if (step && step.kind === 'room') {
      for (const side of ['x', 'y', 'width', 'height'] as const) {
        this.root.append(this.field(side, 'number', step.rect[side], (value) => resizeRoom(this.layoutNow(), room, { ...step.rect, [side]: Number(value) })));
      }
    }
    const current = layout.dressing[room];
    const dressing: Record<string, unknown> = typeof current === 'string' ? { theme: current } : { ...(current ?? {}) };
    const update = (field: string, value: unknown): EditResult => {
      const next: Record<string, unknown> = { ...dressing, [field]: value };
      for (const key of Object.keys(next)) if (next[key] === '' || next[key] === undefined) delete next[key];
      if (!next.theme) return setDressing(this.layoutNow(), room, null);
      return setDressing(this.layoutNow(), room, next as RoomDressingEntry);
    };
    this.root.append(element('h3', {}, 'Dressing'));
    const choices: Record<string, readonly string[]> = {
      theme: ['', ...LAYOUT_CHOICES.themes],
    };
    for (const [field, list] of Object.entries(choices)) this.root.append(this.field(field, { choices: list }, dressing[field], (value) => update(field, value)));
  }

  private field(name: string, kind: FieldKind, value: unknown, change: (value: unknown) => EditResult): HTMLElement {
    const label = element('label', { class: 'field' });
    label.append(element('span', {}, FIELD_NAMES[name] ?? name));
    let input: HTMLInputElement | HTMLSelectElement;
    if (typeof kind === 'object' && 'choices' in kind) {
      input = element('select');
      input.append(...kind.choices.map((choice) => element('option', { value: choice }, choice === '' ? '—' : choice)));
    } else {
      input = element('input', { type: kind === 'number' ? 'number' : 'text', step: 'any' });
      if (typeof kind === 'object') input.setAttribute('list', `suggest-${name}`);
    }
    input.value = value === undefined || value === null ? '' : String(value);
    input.addEventListener('change', () => {
      const raw = input.value;
      this.controller.apply(() => change(kind === 'number' ? (raw === '' ? undefined : Number(raw)) : raw === '' ? undefined : raw));
      this.controller.select(this.controller.selection);
    });
    label.append(input);
    return label;
  }

  private actions(buttons: readonly (readonly [string, () => EditResult, boolean?])[]): HTMLElement {
    const row = element('div', { class: 'actions' });
    for (const [label, run, clears] of buttons) {
      const button = element('button', { type: 'button' }, label);
      button.addEventListener('click', () => {
        const result = this.controller.apply(() => run());
        this.controller.select(result.ok && clears ? null : this.controller.selection);
      });
      row.append(button);
    }
    return row;
  }

  private layoutNow(): DistrictLayout {
    return this.controller.currentLayout();
  }
}
