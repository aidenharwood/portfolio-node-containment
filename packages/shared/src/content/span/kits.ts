import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { FurnishingProfile } from '../furnishingCatalogue.ts';

type Piece = Pick<WorldObjectDefinition, 'id' | 'name' | 'examine' | 'model'> & Partial<Pick<WorldObjectDefinition, 'footprint' | 'light' | 'modelScale' | 'blocksMovement'>> & { readonly furnishing: FurnishingProfile };

const piece = (definition: Piece): WorldObjectDefinition => ({ blocksMovement: definition.furnishing.mount !== 'wall' && definition.furnishing.mount !== 'flat', interactions: [], ...definition });

const SIGNS = ['street', 'shop', 'canteen'] as const;
const SERVICES = ['street', 'works', 'industrial', 'freight', 'canteen'] as const;
const OUTDOOR = ['street', 'containment'] as const;
const NOTICES = ['street', 'containment', 'lab', 'office', 'transit', 'medical'] as const;
const STORES = ['street', 'containment', 'freight', 'industrial', 'lab'] as const;

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

export const SPAN_CONTAINMENT_PROPS: readonly WorldObjectDefinition[] = [
  piece({ id: 'blast-frame-left', name: 'Blast Door Frame', examine: 'A reinforced frame round a facility entrance, rated for a pressure wave the Directorate prefers not to describe. The lamp turns red when the door seals.', model: 'blastFrameLeft', furnishing: { mount: 'wall', homes: OUTDOOR } }),
  piece({ id: 'blast-frame-right', name: 'Blast Door Frame', examine: 'A reinforced frame round a facility entrance, rated for a pressure wave the Directorate prefers not to describe. The lamp turns red when the door seals.', model: 'blastFrameRight', furnishing: { mount: 'wall', homes: OUTDOOR } }),
  piece({ id: 'class-placard', name: 'Class Placard', examine: 'A placard giving the Security Class of whatever is kept inside. The colour tells a trained eye how fast to walk past.', model: 'classPlacard', furnishing: { mount: 'wall', homes: NOTICES } }),
  piece({ id: 'warning-sign', name: 'Warning Sign', examine: 'A warning in the Directorate’s colours. They are replaced when they fade, and when what they warn about changes.', model: 'warningSign', furnishing: { mount: 'wall', homes: NOTICES } }),
  piece({ id: 'sentry-tower', name: 'Sentry Tower', examine: 'A watch tower whose searchlight sweeps the compound on a timer. The cabin log is filled in every hour, sometimes by the guard.', model: 'sentryTower', footprint: { width: 2, height: 2 }, light: { radius: 6, color: '#e8f2ff', intensity: 0.7, beam: 1.6 }, furnishing: { mount: 'free', homes: OUTDOOR } }),
  piece({ id: 'jersey-barrier', name: 'Jersey Barrier', examine: 'A concrete barrier, heavy enough to stop a truck and most things that walk on fewer than six legs.', model: 'jerseyBarrier', footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: [...OUTDOOR, 'freight', 'industrial'], inRows: true } }),
  piece({ id: 'razor-wire', name: 'Razor Wire', examine: 'Coils of razor wire along the top of the fence. They face in, not out.', model: 'razorWire', footprint: { width: 2, height: 1 }, furnishing: { mount: 'wall', homes: OUTDOOR } }),
  piece({ id: 'siren-beacon', name: 'Siren', examine: 'A siren and a turning beacon. During a breach it is the loudest thing on the Span; during drills, the second loudest.', model: 'sirenBeacon', furnishing: { mount: 'wall', homes: [...OUTDOOR, 'transit'] } }),
  piece({ id: 'decon-tent', name: 'Decontamination Tent', examine: 'A tent with a shower frame and a sign asking you to remove everything. Somebody has added AND KEEP IT underneath.', model: 'deconTent', footprint: { width: 3, height: 2 }, furnishing: { mount: 'free', homes: [...OUTDOOR, 'medical'] } }),
  piece({ id: 'containment-crate', name: 'Containment Crate', examine: 'A sealed crate for moving something that should not be moved. The seal light is the only part anyone is allowed to look at.', model: 'containmentCrate', footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: STORES } }),
  piece({ id: 'cordon-post', name: 'Cordon Post', examine: 'A post and a length of tape marking a line you are asked not to cross. It would not stop anything that wanted to.', model: 'cordonPost', furnishing: { mount: 'free', homes: OUTDOOR, inRows: true } }),
  piece({ id: 'cargo-container', name: 'Cargo Container', examine: 'A container from the Meridian’s hold, still sealed with the colony stamp. Mags says she will open it when she knows what is inside.', model: 'cargoContainer', footprint: { width: 4, height: 2 }, furnishing: { mount: 'free', homes: ['street', 'freight', 'industrial', 'works'] } }),
];
