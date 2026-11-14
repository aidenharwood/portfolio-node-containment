import type { FurnishingKit } from '../../../src/content/furnishingKit.ts';
import type { FurnishingProfile } from '../../../src/content/furnishingCatalogue.ts';
import { DRESSING_THEMES, prefab, type DressingTheme } from '../../../src/content/prefabs/types.ts';
import type { WorldObjectDefinition } from '../../../src/world/entities.ts';

const ALL: readonly DressingTheme[] = DRESSING_THEMES;
const except = (...themes: readonly DressingTheme[]): readonly DressingTheme[] => DRESSING_THEMES.filter((theme) => !themes.includes(theme));

const prop = (id: string, furnishing: FurnishingProfile, extra: Partial<WorldObjectDefinition> = {}): WorldObjectDefinition => ({
  id,
  name: id.split('-').map((word) => word[0]?.toUpperCase() + word.slice(1)).join(' '),
  examine: `A test ${id}.`,
  model: 'placeholder',
  blocksMovement: true,
  furnishing,
  interactions: [],
  ...extra,
});

export const KIT_OBJECTS: readonly WorldObjectDefinition[] = [
  prop('planter', { mount: 'free', homes: ['civic', 'garden', 'ward', 'office', 'works', 'medical', 'canteen', 'camp', 'dormitory', 'lab'] }),
  prop('potted-fern', { mount: 'free', homes: ['civic', 'garden', 'medical', 'office', 'ward', 'camp', 'dormitory', 'post', 'archive', 'canteen', 'lab'] }),
  prop('bookcase', { mount: 'backed', homes: ['archive', 'office', 'dormitory', 'camp', 'chapel', 'ward'], inRows: true }),
  prop('packing-crate', { mount: 'free', homes: ALL }),
  prop('briefing-bench', { mount: 'seat', seatsAt: 'view', homes: except('industrial', 'mine', 'wet', 'chapel') }),
  prop('bench-curve', { mount: 'seat', seatsAt: 'view', homes: ['civic', 'garden', 'ward', 'camp', 'medical', 'office', 'transit'] }, { footprint: { width: 3, height: 1 } }),
  prop('pew', { mount: 'seat', seatsAt: 'view', homes: ['chapel'], inRows: true }),
  prop('office-chair', { mount: 'seat', seatsAt: 'surface', homes: ['office', 'archive', 'lab', 'civic', 'medical', 'ward', 'industrial', 'post', 'camp', 'cold', 'freight', 'works'], inRows: true }, { blocksMovement: false }),
  prop('stool', { mount: 'seat', seatsAt: 'surface', homes: except('chapel', 'ward'), inRows: true, backless: true }, { blocksMovement: false }),
  prop('office-desk', { mount: 'free', surface: true, homes: ['office', 'archive', 'post', 'medical', 'ward', 'lab', 'camp', 'freight', 'civic', 'industrial'], inRows: true }),
  prop('canteen-table', { mount: 'free', surface: true, homes: ['canteen', 'camp', 'garden', 'dormitory', 'civic'], inRows: true }),
  prop('workbench', { mount: 'free', surface: true, homes: ['industrial', 'lab', 'garden', 'wet', 'camp', 'works', 'freight', 'mine', 'cold'], inRows: true }),
  prop('storage-rack', { mount: 'free', homes: except('civic', 'chapel'), inRows: true, backstop: true }),
  prop('gurney', { mount: 'free', homes: ['medical', 'ward', 'camp', 'lab', 'civic'], inRows: true }),
  prop('water-cooler', { mount: 'backed', homes: except('chapel', 'mine', 'wet', 'industrial', 'cold') }),
  prop('vending-machine', { mount: 'backed', homes: ['civic', 'canteen', 'camp', 'office', 'dormitory', 'freight', 'medical', 'ward', 'works'], inRows: true }),
  prop('specimen-tank', { mount: 'free', homes: ['lab', 'garden', 'medical', 'cold'], inRows: true }),
  prop('sorting-case', { mount: 'backed', homes: ['post', 'archive'], inRows: true, surface: true }),
  prop('shuttered-kiosk', { mount: 'free', homes: ['civic', 'freight'] }),
  prop('server-rack', { mount: 'free', homes: ['industrial', 'archive', 'office', 'civic', 'cold', 'medical', 'lab', 'garden', 'works'], inRows: true, backstop: true }),
  prop('trash-bin', { mount: 'free', homes: except('chapel', 'mine', 'wet') }),
  prop('transit-shelter', { mount: 'free', homes: ['civic', 'office', 'camp', 'freight'] }, { footprint: { width: 3, height: 2 }, blocksMovement: false, deck: true }),
];

export const FIXTURE_FURNISHING: FurnishingKit = {
  objects: KIT_OBJECTS,
  prefabs: [
    prefab('bench-planters', ['island', 'edge'], [[0, 0, 'planter'], [1, 0, 'briefing-bench'], [2, 0, 'briefing-bench'], [3, 0, 'planter']]),
    prefab('fern-bench', ['island', 'edge'], [[0, 0, 'potted-fern'], [1, 0, 'briefing-bench'], [2, 0, 'potted-fern']]),
    prefab('ferns', ['island'], [[0, 0, 'potted-fern'], [1, 0, 'potted-fern'], [0, 1, 'potted-fern']]),
    prefab('barrels', ['island'], [[0, 0, 'packing-crate'], [1, 0, 'trash-bin'], [0, 1, 'packing-crate']]),
    prefab('crates', ['island'], [[0, 0, 'packing-crate'], [1, 0, 'packing-crate'], [0, 1, 'storage-rack']]),
    prefab('ore-heap', ['focal'], [[1, 1, 'workbench'], [0, 0, 'packing-crate'], [3, 0, 'packing-crate']]),
  ],
  signatures: {
    civic: ['briefing-bench', 'bench-curve', 'planter', 'potted-fern', 'transit-shelter', 'shuttered-kiosk', 'vending-machine'],
    office: ['office-desk'],
    canteen: ['canteen-table'],
    industrial: ['workbench', 'server-rack'],
    freight: ['storage-rack'],
    medical: ['gurney', 'specimen-tank'],
    lab: ['workbench', 'specimen-tank', 'server-rack'],
    garden: ['planter', 'potted-fern'],
    chapel: ['pew'],
    ward: ['gurney'],
    archive: ['bookcase', 'storage-rack'],
    post: ['sorting-case'],
  },
};
