import { LAYOUT_CHOICES, PREFABS, type BlueprintStep, type DistrictLayout, type GameContent } from '@containment/shared';
import type { EditController } from './editController.ts';
import { deleteEntry, deleteStep, duplicateEntry, editStep, resizeRoom, rotateEntry, setDressing, setField, type EditResult, type RoomDressingEntry } from './edits.ts';

type FieldKind = 'text' | 'number' | { readonly choices: readonly string[] } | { readonly suggest: readonly string[] };

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, attributes: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  if (text !== undefined) node.textContent = text;
  return node;
};

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

  render(layout: DistrictLayout): void {
    const keep = [...this.root.querySelectorAll('datalist')];
    this.root.replaceChildren(...keep);
    const selection = this.controller.selection;
    if (!selection) {
      this.root.append(element('p', { class: 'hint' }, 'Click anything on the plan to edit it. Drag to move, R to rotate, Delete to remove, Ctrl+Z to undo.'));
      return;
    }
    if (selection.kind === 'entry') this.renderEntry(layout, selection.ref);
    else if (selection.kind === 'step') this.renderStep(layout, selection.index);
    else this.renderRoom(layout, selection.room, selection.kind === 'dressing');
  }

  private renderEntry(layout: DistrictLayout, ref: Parameters<typeof setField>[1]): void {
    if (ref.collection === 'anchors') {
      this.root.append(element('h2', {}, `Anchor · ${ref.name}`), element('p', { class: 'hint' }, 'Other content reads this point by name. Drag it to move it.'));
      return;
    }
    const entry = (layout[ref.collection] as readonly Record<string, unknown>[])[ref.index];
    if (!entry) return;
    this.root.append(element('h2', {}, `${ref.collection.replace(/s$/, '')} · ${String(entry.id ?? entry.kind ?? entry.color ?? ref.index)}`));
    this.root.append(element('p', { class: 'hint' }, `at ${JSON.stringify(entry.at)}`));
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
    if (generated) this.root.append(element('p', { class: 'hint' }, 'That piece is generated by this room’s dressing. Change the dressing below; drag the room to move it.'));
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
      density: ['', ...LAYOUT_CHOICES.densities],
      composition: ['', ...LAYOUT_CHOICES.compositions],
      condition: ['', ...LAYOUT_CHOICES.conditions],
    };
    for (const [field, list] of Object.entries(choices)) this.root.append(this.field(field, { choices: list }, dressing[field], (value) => update(field, value)));
  }

  private field(name: string, kind: FieldKind, value: unknown, change: (value: unknown) => EditResult): HTMLElement {
    const label = element('label', { class: 'field' });
    label.append(element('span', {}, name));
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
