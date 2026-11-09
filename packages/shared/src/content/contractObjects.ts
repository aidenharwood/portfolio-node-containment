import type { WorldObjectDefinition } from '../world/entities.ts';

export const CONTRACTS_SHOP_ID = 'contracts-office';

export const CONTRACT_BOARD: WorldObjectDefinition = {
  id: 'contract-board',
  name: 'Contract Board',
  examine: 'The Directorate contracts board. Fresh work goes up every day at midnight, Site time, and the big jobs every Monday.',
  model: 'noticeBoard',
  blocksMovement: false,
  light: { radius: 2, color: '#ffcf4d', intensity: 0.6 },
  interactions: [
    { verb: 'Review contracts', effects: [{ type: 'openContracts' }] },
    { verb: 'Spend commendations', effects: [{ type: 'openShop', shopId: CONTRACTS_SHOP_ID }] },
  ],
};

export const CONTRACT_OBJECTS: readonly WorldObjectDefinition[] = [CONTRACT_BOARD];
