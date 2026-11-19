import { LAYOUT_CHOICES, PREFABS, type GameContent } from '@containment/shared';
import { landBrushClicks, type LandBrush, type PaletteEntry } from './editController.ts';
import type { Collection } from './edits.ts';
import { requestThumbnail } from './thumbnails.ts';

const RESULT_LIMIT = 80;

export const PALETTE_GROUPS: readonly { readonly collection: Collection; readonly title: string }[] = [
  { collection: 'objects', title: 'Objects' },
  { collection: 'setPieces', title: 'Set-pieces' },
  { collection: 'npcs', title: 'People' },
  { collection: 'creatures', title: 'Creatures' },
  { collection: 'decals', title: 'Decals' },
  { collection: 'lights', title: 'Lights' },
];

const swatchOf = (entry: PaletteEntry): string | null => {
  if (entry.collection === 'lights') return String(entry.entry.color ?? '#ffffff');
  if (entry.collection === 'decals') return '#4fd8ff';
  return null;
};

const readable = (id: string): string => {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export function paletteEntries(content: GameContent): PaletteEntry[] {
  return [
    ...[...content.worldObjects.values()].map((object): PaletteEntry => ({ collection: 'objects', label: `object · ${object.id}`, name: object.name, entry: { object: object.id } })),
    ...Object.keys(PREFABS).map((id): PaletteEntry => ({ collection: 'setPieces', label: `set-piece · ${id}`, name: readable(id), entry: { prefab: id, facing: 'south' } })),
    ...[...content.npcs.values()].map((npc): PaletteEntry => ({ collection: 'npcs', label: `npc · ${npc.id}`, name: npc.name, entry: { npc: npc.id } })),
    ...[...content.creatures.values()].map((creature): PaletteEntry => ({ collection: 'creatures', label: `creature · ${creature.id}`, name: creature.name, entry: { creature: creature.id } })),
    ...LAYOUT_CHOICES.decalKinds.map((kind): PaletteEntry => ({ collection: 'decals', label: `decal · ${kind}`, name: readable(kind), entry: { kind, width: 3, height: 3 } })),
    { collection: 'lights', label: 'light · warm', name: 'Warm light', entry: { radius: 8, color: '#ffd27f', intensity: 0.5 } },
    { collection: 'lights', label: 'light · cool', name: 'Cool light', entry: { radius: 8, color: '#9fd8ff', intensity: 0.5 } },
  ];
}

export function searchPalette(entries: readonly PaletteEntry[], query: string, group?: Collection): PaletteEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => group === undefined || entry.collection === group)
    .filter((entry) => {
      const haystack = `${entry.label} ${entry.name ?? ''}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    })
    .slice(0, RESULT_LIMIT);
}

const LAND_STEP_KINDS: readonly LandBrush['step'][] = ['fill', 'line', 'rise', 'ramp', 'ward', 'gate'];
const LAND_SHAPES: readonly LandBrush['shape'][] = ['polygon', 'rect', 'round', 'octagon'];

export function landBrushFields(brush: LandBrush): readonly (keyof LandBrush)[] {
  const shaped = brush.step === 'fill' || brush.step === 'rise' || brush.step === 'ward';
  return [
    'step',
    ...(shaped ? (['shape'] as const) : []),
    ...(brush.step === 'fill' || brush.step === 'line' || brush.step === 'gate' ? (['tile'] as const) : []),
    ...(brush.step === 'rise' || brush.step === 'ramp' ? (['height'] as const) : []),
    ...(brush.step === 'line' ? (['width'] as const) : []),
    ...(brush.step === 'ward' ? (['ward'] as const) : []),
    ...(brush.step === 'ramp' ? (['side'] as const) : []),
    ...(brush.step === 'gate' ? (['gate'] as const) : []),
  ];
}

export function landBrushHint(brush: LandBrush): string {
  return landBrushClicks(brush)
    ? 'Click the plan to add points, then press Enter or double-click to finish. Esc cancels.'
    : 'Drag a rectangle on the plan to draw it.';
}

export class LandPalette {
  readonly root = document.createElement('section');
  private readonly inputs = new Map<keyof LandBrush, HTMLInputElement | HTMLSelectElement>();
  private readonly labels = new Map<keyof LandBrush, HTMLLabelElement>();
  private brush: LandBrush;
  private readonly onChange: (brush: LandBrush) => void;

  constructor(content: GameContent, brush: LandBrush, onChange: (brush: LandBrush) => void) {
    this.onChange = onChange;
    const regions = [...content.regions.keys()];
    this.brush = brush.ward === '' && regions[0] ? { ...brush, ward: regions[0] } : brush;
    this.root.className = 'palette land-palette';
    const heading = document.createElement('h2');
    heading.textContent = 'Draw land';
    this.root.append(heading);
    const select = (name: keyof LandBrush, title: string, choices: readonly string[]): void => {
      const input = document.createElement('select');
      for (const choice of choices) {
        const option = document.createElement('option');
        option.value = choice;
        option.textContent = choice;
        input.append(option);
      }
      this.add(name, title, input);
    };
    const number = (name: keyof LandBrush, title: string, min: number, step: number): void => {
      const input = document.createElement('input');
      input.type = 'number';
      input.min = String(min);
      input.step = String(step);
      this.add(name, title, input);
    };
    select('step', 'Step', LAND_STEP_KINDS);
    select('shape', 'Shape', LAND_SHAPES);
    select('tile', 'Tile', LAYOUT_CHOICES.tiles);
    number('height', 'Height', 0, 1);
    number('width', 'Width (odd)', 1, 2);
    select('ward', 'Ward', regions);
    select('side', 'Ramp rises toward', LAYOUT_CHOICES.facings);
    const gate = document.createElement('input');
    gate.type = 'text';
    this.add('gate', 'Gate id', gate);
    this.hint.className = 'hint';
    this.root.append(this.hint);
    this.sync();
    if (this.brush !== brush) onChange(this.brush);
  }

  private readonly hint = document.createElement('p');

  current(): LandBrush {
    return this.brush;
  }

  private add(name: keyof LandBrush, title: string, input: HTMLInputElement | HTMLSelectElement): void {
    const label = document.createElement('label');
    label.className = 'field';
    const span = document.createElement('span');
    span.textContent = title;
    label.append(span, input);
    input.addEventListener('change', () => this.read(name, input.value));
    this.inputs.set(name, input);
    this.labels.set(name, label);
    this.root.append(label);
  }

  private read(name: keyof LandBrush, raw: string): void {
    let value: string | number = raw;
    if (name === 'height') value = Math.max(0, Math.min(15, Math.round(Number(raw) || 0)));
    if (name === 'width') {
      const whole = Math.max(1, Math.round(Number(raw) || 1));
      value = whole % 2 === 1 ? whole : whole + 1;
    }
    this.brush = { ...this.brush, [name]: value };
    this.sync();
    this.onChange(this.brush);
  }

  private sync(): void {
    const shown = new Set(landBrushFields(this.brush));
    for (const [name, input] of this.inputs) {
      input.value = String(this.brush[name]);
      const label = this.labels.get(name);
      if (label) label.hidden = !shown.has(name);
    }
    this.hint.textContent = landBrushHint(this.brush);
  }
}

export class Palette {
  readonly root = document.createElement('section');
  private readonly input = document.createElement('input');
  private readonly chips = document.createElement('div');
  private readonly list = document.createElement('div');
  private readonly count = document.createElement('p');
  private readonly entries: readonly PaletteEntry[];
  private readonly onPick: (entry: PaletteEntry) => void;
  private group: Collection | undefined;
  private active: PaletteEntry | null = null;
  private shown: PaletteEntry[] = [];
  private readonly onDrag: ((entry: PaletteEntry | null) => void) | undefined;
  private readonly pictures = new Map<Element, PaletteEntry>();
  private readonly observer = new IntersectionObserver((seen) => {
    for (const each of seen) if (each.isIntersecting) this.load(each.target as HTMLElement);
  });

  constructor(entries: readonly PaletteEntry[], onPick: (entry: PaletteEntry) => void, onDrag?: (entry: PaletteEntry | null) => void) {
    this.entries = entries;
    this.onPick = onPick;
    this.onDrag = onDrag;
    this.root.className = 'palette';
    const heading = document.createElement('h2');
    heading.textContent = 'Add to the map';
    this.input.type = 'search';
    this.input.placeholder = 'Search: planter, okafor, rug…';
    this.input.setAttribute('aria-label', 'Search things to add');
    this.input.addEventListener('input', () => this.render());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && this.shown[0]) {
        event.preventDefault();
        this.onPick(this.shown[0]);
      } else if (event.key === 'Escape') {
        this.input.value = '';
        this.input.blur();
        this.render();
      }
    });
    this.chips.className = 'palette-groups';
    this.chips.setAttribute('role', 'group');
    this.chips.setAttribute('aria-label', 'Filter by kind');
    for (const choice of [{ collection: undefined, title: 'All' }, ...PALETTE_GROUPS]) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = choice.title;
      chip.dataset.group = choice.collection ?? '';
      chip.addEventListener('click', () => {
        this.group = choice.collection;
        this.render();
      });
      this.chips.append(chip);
    }
    this.list.className = 'palette-results';
    this.count.className = 'palette-count';
    this.root.append(heading, this.input, this.chips, this.list, this.count);
    this.render();
  }

  setActive(entry: PaletteEntry | null): void {
    if (entry === this.active) return;
    this.active = entry;
    this.render();
  }

  focus(): void {
    this.input.focus();
    this.input.select();
  }

  private render(): void {
    for (const picture of this.pictures.keys()) this.observer.unobserve(picture);
    this.pictures.clear();
    for (const chip of this.chips.querySelectorAll('button')) chip.setAttribute('aria-pressed', String((chip.dataset.group || undefined) === this.group));
    this.shown = searchPalette(this.entries, this.input.value, this.group);
    const sections: HTMLElement[] = PALETTE_GROUPS.flatMap(({ collection, title }) => {
      const found = this.shown.filter((entry) => entry.collection === collection);
      if (found.length === 0) return [];
      const section = document.createElement('section');
      const heading = document.createElement('h3');
      heading.textContent = title;
      const list = document.createElement('ul');
      list.append(...found.map((entry) => this.item(entry)));
      section.append(heading, list);
      return [section];
    });
    if (sections.length === 0) {
      const none = document.createElement('p');
      none.className = 'palette-empty';
      none.textContent = 'Nothing matches. Try another word, or pick All.';
      sections.push(none);
    }
    this.list.replaceChildren(...sections);
    const total = this.entries.filter((entry) => this.group === undefined || entry.collection === this.group).length;
    const capped = this.shown.length >= RESULT_LIMIT;
    if (this.input.value.trim() === '') this.count.textContent = capped ? `Showing ${this.shown.length} of ${total}. Type to narrow it down.` : `${total} to choose from`;
    else this.count.textContent = capped ? `First ${this.shown.length} matches. Type more to narrow it down.` : `${this.shown.length} match${this.shown.length === 1 ? '' : 'es'}`;
  }

  private item(entry: PaletteEntry): HTMLElement {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.draggable = true;
    button.title = `${entry.name ?? entry.label} (${entry.label}). Drag it into the 3D view, or click it and then click where it goes.`;
    button.setAttribute('aria-pressed', String(entry === this.active));
    const picture = document.createElement('span');
    picture.className = 'thumb';
    const swatch = swatchOf(entry);
    if (swatch) {
      picture.style.setProperty('--swatch', swatch);
      picture.dataset.swatch = entry.collection;
    } else this.observe(picture, entry);
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = entry.name ?? entry.label;
    button.append(picture, name);
    button.addEventListener('click', () => this.onPick(entry));
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', entry.label);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
      const image = picture.querySelector('img');
      if (image && event.dataTransfer) event.dataTransfer.setDragImage(image, 28, 28);
      this.onDrag?.(entry);
    });
    button.addEventListener('dragend', () => this.onDrag?.(null));
    item.append(button);
    return item;
  }

  private observe(picture: HTMLElement, entry: PaletteEntry): void {
    this.pictures.set(picture, entry);
    this.observer.observe(picture);
  }

  private load(picture: HTMLElement): void {
    const entry = this.pictures.get(picture);
    this.observer.unobserve(picture);
    this.pictures.delete(picture);
    if (!entry) return;
    picture.dataset.loading = 'true';
    requestThumbnail(entry, (url) => {
      delete picture.dataset.loading;
      if (!url) {
        picture.dataset.missing = 'true';
        picture.textContent = (entry.name ?? entry.label).charAt(0);
        return;
      }
      const image = document.createElement('img');
      image.src = url;
      image.alt = '';
      image.draggable = false;
      picture.replaceChildren(image);
    });
  }
}
