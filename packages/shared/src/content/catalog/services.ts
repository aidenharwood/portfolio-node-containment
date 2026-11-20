import type { ShopDefinition } from '../../economy/shop.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';
import { DRESSING_THEMES } from '../prefabs/types.ts';

export const STORAGE_LOCKER: WorldObjectDefinition = {
    id: 'storage-locker',
    name: 'Storage Locker',
    examine: 'A battered steel locker. Every locker in the city opens onto the same shelves.',
    model: 'storageLocker',
    blocksMovement: true,
    furnishing: { mount: 'wall', homes: DRESSING_THEMES },
    interactions: [{ verb: 'Open', effects: [{ type: 'openStorage' }] }],
  };

export const CONTRACTS_OFFICE: ShopDefinition = {
    id: 'contracts-office',
    name: 'Contracts Office',
    greeting: 'Commendations only. Scrip is for people who do not finish their contracts.',
    currency: { itemId: 'directorate-commendation', label: 'commendations' },
    listings: [
      { itemId: 'noodle-bowl', price: 1 },
      { itemId: 'culvert-trace', price: 1 },
      { itemId: 'ferro-plating', price: 2 },
      { itemId: 'ballistic-cloth', price: 2 },
      { itemId: 'grip-tincture', price: 2 },
      { itemId: 'reed-tonic', price: 3 },
      { itemId: 'heavy-scrap', price: 2 },
      { itemId: 'amber-trace', price: 2 },
      { itemId: 'plasteel-plating', price: 4 },
      { itemId: 'hull-plate', price: 4 },
    ],
    buysCategories: [],
    sellRate: 0,
  };
