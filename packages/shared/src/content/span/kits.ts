import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { FurnishingProfile } from '../furnishingCatalogue.ts';

type Piece = Pick<WorldObjectDefinition, 'id' | 'name' | 'examine' | 'model'> & Partial<Pick<WorldObjectDefinition, 'footprint' | 'light' | 'modelScale' | 'blocksMovement'>> & { readonly furnishing: FurnishingProfile };

const piece = (definition: Piece): WorldObjectDefinition => ({ blocksMovement: definition.furnishing.mount !== 'wall' && definition.furnishing.mount !== 'flat', interactions: [], ...definition });

const SIGNS = ['street', 'shop', 'canteen'] as const;
const SERVICES = ['street', 'works', 'industrial', 'freight', 'canteen'] as const;

export const SPAN_STREET_PROPS: readonly WorldObjectDefinition[] = [
  piece({ id: 'blade-sign', name: 'Blade Sign', examine: 'A sign hung edge-on to the street so it reads from both ends. Half the letters are lit; the half that matter, the owner says.', model: 'bladeSign', furnishing: { mount: 'wall', homes: SIGNS } }),
  piece({ id: 'ac-unit', name: 'Air Conditioner', examine: 'A wall unit rattling away above the street. It drips on whoever stands under it, which in Halcyon counts as weather.', model: 'acUnit', furnishing: { mount: 'wall', homes: SERVICES } }),
  piece({ id: 'wall-vent', name: 'Wall Vent', examine: 'An extractor breathing warm air into the street. Something behind it is always cooking.', model: 'wallVent', furnishing: { mount: 'wall', homes: SERVICES } }),
  piece({ id: 'roll-shutter', name: 'Roll Shutter', examine: 'A steel shutter over a shopfront, tagged and re-tagged. Some of them open at night. Nobody remembers seeing one open by day.', model: 'rollShutter', footprint: { width: 2, height: 1 }, furnishing: { mount: 'wall', homes: ['street', 'shop', 'freight'] } }),
  piece({ id: 'holo-panel', name: 'Holo Panel', examine: 'An advertising panel bolted to the façade, cycling through things you cannot afford. The Combine owns the airtime; the pigeons own the frame.', model: 'holoPanel', footprint: { width: 2, height: 1 }, furnishing: { mount: 'wall', homes: ['street'] } }),
  piece({ id: 'cable-run', name: 'Cable Run', examine: 'Power, data and something unlabelled, clipped to the wall in loops. Every cable in Halcyon is somebody’s, and none of them are on the plans.', model: 'cableRun', furnishing: { mount: 'wall', homes: SERVICES } }),
  piece({ id: 'street-stall', name: 'Street Stall', examine: 'A stall under a tarp, selling whatever came in on the last tram. The owner watches the street more than the stock.', model: 'streetStall', footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: ['street', 'shop'], inRows: true } }),
  piece({ id: 'trash-bags', name: 'Rubbish Bags', examine: 'Bags piled for a collection that runs when it runs. One of them is moving. Rats, probably.', model: 'trashBags', modelScale: 1.3, furnishing: { mount: 'free', homes: [...SERVICES, 'camp'] } }),
  piece({ id: 'parked-bike', name: 'Parked Bike', examine: 'A motorbike chained to nothing in particular. The battery is the only part worth stealing, so it has been stolen.', model: 'parkedBike', modelScale: 1.6, footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: ['street'], inRows: true } }),
];
