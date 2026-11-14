import type { WorldObjectDefinition } from '../../world/entities.ts';
import type { FurnishingProfile } from '../furnishingCatalogue.ts';
import type { FurnishingKit } from '../furnishingKit.ts';

type Prop = Pick<WorldObjectDefinition, 'id' | 'name' | 'examine' | 'model'> & Partial<Pick<WorldObjectDefinition, 'footprint' | 'light' | 'blocksMovement' | 'interactions'>> & { readonly furnishing: FurnishingProfile };

const prop = (definition: Prop): WorldObjectDefinition => ({ blocksMovement: true, interactions: [], ...definition });

const OUTDOORS = ['street', 'containment'] as const;
const INDOORS = ['shop', 'home', 'office', 'civic', 'transit', 'canteen', 'containment'] as const;
const PUBLIC = ['street', 'civic', 'transit', 'shop', 'canteen', 'office', 'containment'] as const;

export const CITY_KIT_OBJECTS: readonly WorldObjectDefinition[] = [
  prop({ id: 'street-lamp', name: 'Street Lamp', examine: 'Sodium orange. Half the city is this colour after dark.', model: 'streetLamp', furnishing: { mount: 'free', homes: OUTDOORS, inRows: true }, light: { radius: 4, color: '#ffb35a', intensity: 0.9 } }),
  prop({ id: 'bollard', name: 'Bollard', examine: 'Keeps the traffic off the pavement, mostly.', model: 'bollard', furnishing: { mount: 'free', homes: OUTDOORS, inRows: true } }),
  prop({ id: 'street-bench', name: 'Bench', examine: 'Slats worn pale where people wait.', model: 'streetBench', furnishing: { mount: 'seat', homes: ['street', 'civic', 'transit', 'containment'], seatsAt: 'view' } }),
  prop({ id: 'litter-bin', name: 'Litter Bin', examine: 'Full. It is always full.', model: 'litterBin', furnishing: { mount: 'free', homes: PUBLIC } }),
  prop({ id: 'vending-machine', name: 'Vending Machine', examine: 'Lit up and humming. Most of the buttons still work.', model: 'vendingMachine', furnishing: { mount: 'backed', homes: [...PUBLIC, 'home'] } }),
  prop({ id: 'dumpster', name: 'Dumpster', examine: 'Whatever is in there has been in there a while.', model: 'dumpster', footprint: { width: 2, height: 1 }, furnishing: { mount: 'backed', homes: ['street'] } }),
  prop({ id: 'street-tree', name: 'Street Tree', examine: 'A tough little tree in a concrete box.', model: 'streetTree', furnishing: { mount: 'free', homes: ['street'], inRows: true } }),
  prop({ id: 'utility-pole', name: 'Utility Pole', examine: 'Creosote, wires and a hundred torn flyers.', model: 'utilityPole', furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'parked-car', name: 'Parked Car', examine: 'Nobody has driven it in a long time. There is a ticket under the wiper.', model: 'parkedCar', footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'food-stall', name: 'Food Stall', examine: 'Noodles, steam and a sign that buzzes.', model: 'foodStall', footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: ['street'] } }),
  prop({ id: 'checkpoint-barrier', name: 'Checkpoint Barrier', examine: 'A Directorate boom gate. The light means wait.', model: 'checkpointBarrier', furnishing: { mount: 'free', homes: OUTDOORS } }),
  prop({ id: 'steam-vent', name: 'Steam Vent', examine: 'Warm air from somewhere underneath.', model: 'steamVent', blocksMovement: false, furnishing: { mount: 'flat', homes: OUTDOORS } }),
  prop({ id: 'neon-sign', name: 'Neon Sign', examine: 'Some of the letters are lit.', model: 'neonSign', blocksMovement: false, furnishing: { mount: 'wall', homes: ['street', 'shop', 'canteen'] } }),
  prop({ id: 'shop-awning', name: 'Awning', examine: 'Striped canvas over a shopfront.', model: 'shopAwning', blocksMovement: false, furnishing: { mount: 'wall', homes: ['street'] } }),
  prop({ id: 'security-camera', name: 'Security Camera', examine: 'The red light blinks. Someone is watching, or nobody is.', model: 'securityCamera', blocksMovement: false, furnishing: { mount: 'wall', homes: ['street', ...INDOORS] } }),
  prop({ id: 'notice-board', name: 'Notice Board', examine: 'Lost pets, rooms to let, and a Directorate curfew notice.', model: 'noticeBoard', blocksMovement: false, furnishing: { mount: 'wall', homes: ['street', ...INDOORS] } }),
  prop({ id: 'directorate-sign', name: 'Directorate Sign', examine: 'The Directorate mark, and the rules of the site beneath it.', model: 'directorateSign', blocksMovement: false, furnishing: { mount: 'wall', homes: OUTDOORS } }),
  prop({ id: 'counter', name: 'Counter', examine: 'A long counter, wiped down often.', model: 'counter', furnishing: { mount: 'free', homes: INDOORS, surface: true, inRows: true } }),
  prop({ id: 'shelving', name: 'Shelving', examine: 'Shelves of tins, boxes and things in jars.', model: 'shelving', furnishing: { mount: 'backed', homes: ['shop', 'home', 'office', 'canteen'], inRows: true } }),
  prop({ id: 'table', name: 'Table', examine: 'A table with a ring on it from every cup.', model: 'table', furnishing: { mount: 'free', homes: INDOORS, surface: true, inRows: true } }),
  prop({ id: 'chair', name: 'Chair', examine: 'A chair. It wobbles.', model: 'chair', furnishing: { mount: 'seat', homes: INDOORS, seatsAt: 'surface' } }),
  prop({ id: 'bed', name: 'Bed', examine: 'A narrow bed with a thin blanket.', model: 'bed', furnishing: { mount: 'free', homes: ['home'], inRows: true } }),
  prop({ id: 'containment-cell', name: 'Containment Cell', examine: 'A low-security cell. Amber means occupied, or recently.', model: 'containmentCell', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: ['containment'] } }),
  prop({ id: 'keycard-reader', name: 'Keycard Reader', examine: 'It wants a card you do not have.', model: 'keycardReader', blocksMovement: false, furnishing: { mount: 'wall', homes: ['containment'] } }),
  prop({ id: 'clock-tower', name: 'Station Clock', examine: 'The station clock. It has kept time since before the anomalies, and nobody has had to wind it since.', model: 'clockTower', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: ['street', 'civic', 'transit'] } }),
  prop({ id: 'washing-line', name: 'Washing Line', examine: "Shirts, sheets and somebody's good coat, drying in the soot.", model: 'washingLine', furnishing: { mount: 'free', homes: ['street', 'home'], inRows: true } }),
  prop({ id: 'exchange-post', name: 'Exchange Post', examine: 'A city exchange post. Whatever you sold on the exchange waits in here.', model: 'exchangePost', furnishing: { mount: 'free', homes: PUBLIC }, interactions: [{ verb: 'Collect', effects: [{ type: 'openMarket', access: 'collect' }] }, { verb: 'Trade', effects: [{ type: 'openMarket', access: 'trade' }] }] }),
  prop({ id: 'contract-board', name: 'Contract Board', examine: 'Directorate work orders. Amber tags are routine, red tags pay.', model: 'contractBoard', blocksMovement: false, furnishing: { mount: 'wall', homes: PUBLIC }, interactions: [{ verb: 'Read', effects: [{ type: 'openContracts' }] }] }),
  prop({ id: 'market-stall', name: 'Market Stall', examine: 'Trestles, a striped cover and everything the trains brought in this week.', model: 'marketStall', footprint: { width: 2, height: 1 }, furnishing: { mount: 'free', homes: ['street', 'shop'], inRows: true } }),
  prop({ id: 'headframe', name: 'Headframe', examine: 'The winding tower over the Site Meridian shaft. The wheel turns when something goes down, and sometimes when nothing does.', model: 'headframe', footprint: { width: 2, height: 2 }, furnishing: { mount: 'free', homes: ['street', 'containment'] } }),
  prop({ id: 'mooring-post', name: 'Mooring Post', examine: 'Cast iron, worn smooth by a century of rope.', model: 'mooringPost', furnishing: { mount: 'free', homes: ['street'], inRows: true } }),
  prop({ id: 'lift-door', name: 'Lift', examine: 'The Site Meridian lift. A red lamp says it is not taking passengers.', model: 'liftDoor', furnishing: { mount: 'wall', homes: ['containment', 'transit', 'office'] } }),
];

export const CITY_KIT: FurnishingKit = {
  objects: CITY_KIT_OBJECTS,
  prefabs: [],
  signatures: { street: ['street-lamp'], shop: ['counter', 'shelving', 'market-stall'], home: ['bed'], containment: ['containment-cell'] },
};
