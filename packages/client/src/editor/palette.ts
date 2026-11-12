import { LAYOUT_CHOICES, PREFABS, type GameContent } from '@containment/shared';
import type { PaletteEntry } from './editController.ts';

const RESULT_LIMIT = 60;

export function paletteEntries(content: GameContent): PaletteEntry[] {
  return [
    ...[...content.worldObjects.values()].map((object): PaletteEntry => ({ collection: 'objects', label: `object · ${object.id}`, entry: { object: object.id } })),
    ...Object.keys(PREFABS).map((id): PaletteEntry => ({ collection: 'setPieces', label: `set-piece · ${id}`, entry: { prefab: id, facing: 'south' } })),
    ...[...content.npcs.values()].map((npc): PaletteEntry => ({ collection: 'npcs', label: `npc · ${npc.id}`, entry: { npc: npc.id } })),
    ...[...content.creatures.values()].map((creature): PaletteEntry => ({ collection: 'creatures', label: `creature · ${creature.id}`, entry: { creature: creature.id } })),
    ...LAYOUT_CHOICES.decalKinds.map((kind): PaletteEntry => ({ collection: 'decals', label: `decal · ${kind}`, entry: { kind, width: 3, height: 3 } })),
    { collection: 'lights', label: 'light · warm', entry: { radius: 8, color: '#ffd27f', intensity: 0.5 } },
    { collection: 'lights', label: 'light · cool', entry: { radius: 8, color: '#9fd8ff', intensity: 0.5 } },
  ];
}

export function searchPalette(entries: readonly PaletteEntry[], query: string): PaletteEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => words.every((word) => entry.label.toLowerCase().includes(word))).slice(0, RESULT_LIMIT);
}

export class Palette {
  readonly root = document.createElement('section');
  private readonly input = document.createElement('input');
  private readonly list = document.createElement('ul');
  private readonly entries: readonly PaletteEntry[];

  constructor(entries: readonly PaletteEntry[], onPick: (entry: PaletteEntry) => void) {
    this.entries = entries;
    this.root.className = 'palette';
    this.input.type = 'search';
    this.input.placeholder = 'Add… (planter, npc okafor, decal rug)';
    this.input.setAttribute('aria-label', 'Search things to add');
    this.list.className = 'palette-results';
    this.input.addEventListener('input', () => this.render(onPick));
    this.root.append(this.input, this.list);
    this.render(onPick);
  }

  private render(onPick: (entry: PaletteEntry) => void): void {
    this.list.replaceChildren(
      ...searchPalette(this.entries, this.input.value).map((entry) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = entry.label;
        button.addEventListener('click', () => onPick(entry));
        item.append(button);
        return item;
      }),
    );
  }
}
