import type { ObjectLight, WorldObjectDefinition } from '../world/entities.ts';

interface SetPieceOptions {
  readonly light?: ObjectLight;
  readonly walkUnder?: boolean;
}

const setPiece = (
  id: string,
  name: string,
  examine: string,
  model: WorldObjectDefinition['model'],
  footprint: NonNullable<WorldObjectDefinition['footprint']>,
  options: SetPieceOptions = {},
): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: !options.walkUnder,
  ...(options.walkUnder ? { deck: true } : {}),
  footprint,
  ...(options.light ? { light: options.light } : {}),
  interactions: [],
});

const glow = (color: string, radius: number, intensity: number): ObjectLight => ({ color, radius, intensity });

const LANDMARK_OBJECTS: readonly WorldObjectDefinition[] = [
  setPiece('signal-mast', 'Signal Mast', 'A red-and-white lattice mast with a dish half-way up and a lamp at the top. It was meant to carry the Circuit’s paging system. It still pages, every eleven minutes, for nobody in particular.', 'signalMast', { width: 2, height: 2 }, { light: glow('#ff4a3a', 4, 0.3) }),
  setPiece('lantern-tower', 'Lantern Tower', 'A fluted iron column with four lanterns on brackets. The lanterns burn real oil, by order of a safety committee that did not trust the grid to stay on. It was right.', 'lanternTower', { width: 2, height: 2 }, { light: glow('#ffc35a', 7, 0.55) }),
  setPiece('ledger-clock', 'Ledger Clock', 'A stone obelisk with a clock on every face, ruled with the lines of a ledger. All four clocks agree, which is the most suspicious thing about them.', 'ledgerClock', { width: 2, height: 2 }),
  setPiece('gantry-crane', 'Gantry Crane', 'A yellow travelling crane on two splayed legs, its hook hanging at head height. The cab door is chained shut from the outside.', 'gantryCrane', { width: 7, height: 3 }, { walkUnder: true, light: glow('#ffb347', 5, 0.3) }),
  setPiece('settling-tank', 'Settling Tank', 'A round concrete tank of still, green water. A skimmer arm turns over it once every few minutes, pushing a skin of scum to the edge. Something below the skin pushes back.', 'settlingTank', { width: 5, height: 5 }, { light: glow('#4fd8ff', 6, 0.3) }),
  setPiece('beam-engine', 'Beam Engine', 'A pumping engine older than the facility around it: a rocking beam on an iron frame, a cylinder taller than a door and a flywheel you could stand inside. It kept the Undercroft dry for forty years.', 'beamEngine', { width: 5, height: 3 }),
  setPiece('heart-bloom', 'Heart Bloom', 'A flower the size of a shed, grown from a single cutting that was meant to be sterile. The bulb at its centre beats about once a minute. The beds around it lean towards it.', 'heartBloom', { width: 3, height: 3 }, { light: glow('#9cf27a', 7, 0.5) }),
  setPiece('salt-reliquary', 'Salt Reliquary', 'An altar cut from one block of salt, under a reredos of salt spires grown in the brine. The casket on it glows. The saltworkers say it holds the first thing they ever pulled out of the deep pans.', 'saltReliquary', { width: 5, height: 3 }, { light: glow('#fff0e0', 8, 0.5) }),
  setPiece('headframe', 'Headframe', 'A riveted winding tower over the old shaft, two sheave wheels at the top and a cage at the bottom. The rope runs down into the dark and stays tight.', 'headframe', { width: 3, height: 3 }, { light: glow('#ffb347', 5, 0.35) }),
  setPiece('weigh-scale', 'Weighbridge', 'A steel weighing plate and a hut with a great round dial. Every cart of salt crossed it, and every cart was written down. The needle has not gone back to zero.', 'weighScale', { width: 4, height: 3 }, { light: glow('#ffd27f', 4, 0.35) }),
  setPiece('brazier-hearth', 'Brazier', 'An iron fire basket on a ring of stones, kept lit day and night. Everybody who comes in from the dark stands at it for a minute before they say anything.', 'brazierHearth', { width: 2, height: 2 }, { light: glow('#ff9a4a', 6, 0.6) }),
  setPiece('apothecary-rotunda', 'Apothecary Rotunda', 'A round counter of dark oak around a tower of glass jars under a brass dome. Every jar is labelled in the same careful hand. Some of the labels are in no language.', 'apothecaryRotunda', { width: 5, height: 5 }, { light: glow('#ffd89a', 8, 0.5) }),
  setPiece('nurses-station', 'Nurses’ Station', 'A cream-painted station with a board of patient charts behind it. The charts are kept up to date. There are no patients.', 'nursesStation', { width: 4, height: 3 }, { light: glow('#fff4d8', 5, 0.45) }),
  setPiece('great-dish', 'Great Dish', 'The Array’s main dish, tilted at a part of the sky nobody has seen from here. It is still receiving. The red lamp at the feed horn blinks in time with something.', 'greatDish', { width: 5, height: 5 }, { light: glow('#ff4a3a', 4, 0.3) }),
  setPiece('containment-tank', 'Containment Tank', 'A cylinder of green fluid with a shape curled up inside it. The label on the base has been scratched off, and the scratches are on the inside of the glass.', 'containmentTank', { width: 3, height: 3 }, { light: glow('#7cf29a', 6, 0.5) }),
  setPiece('pneumatic-tree', 'Pneumatic Tree', 'A brass manifold where every tube in the post room meets. Capsules still rise up the trunk and branch away to the ceiling. None of them come down.', 'pneumaticTree', { width: 3, height: 3 }, { light: glow('#7cf29a', 3, 0.25) }),
  setPiece('index-carousel', 'Index Carousel', 'A turning drum of index drawers, a card for every file in the Records Division. It turns by itself, slowly, as if somebody were looking something up.', 'indexCarousel', { width: 3, height: 3 }, { light: glow('#ffe2a8', 5, 0.45) }),
  setPiece('inverted-monument', 'The Founders’ Monument, Inverted', 'The Founders’ Monument, standing on its head with its plinth hanging over it. The plaque reads correctly from here, which means it reads backwards from everywhere else.', 'invertedMonument', { width: 2, height: 2 }, { light: glow('#d8e8ff', 4, 0.3) }),
  setPiece('decon-arch', 'Decontamination Arch', 'A scanning arch every intake walks through on arrival. The light passes down your body once. It always finds something, and it never says what.', 'deconArch', { width: 3, height: 1 }, { walkUnder: true, light: glow('#4fd8ff', 4, 0.45) }),
  setPiece('reactor-ring', 'Reactor Ring', 'The primary reactor: a ring of conduit around a core column banded with light. The bands are meant to be blue.', 'reactorRing', { width: 5, height: 5 }, { light: glow('#ff8a3a', 9, 0.65) }),
  setPiece('mortuary-bier', 'Bier', 'A stone bier with a shrouded shape on it, candles burning at its four corners. The shroud has been tucked in carefully, and recently.', 'mortuaryBier', { width: 3, height: 2 }, { light: glow('#ffc35a', 5, 0.4) }),
  setPiece('depth-gauge', 'Depth Gauge', 'A brass pressure gauge on a pipe as thick as a forearm, reading how far down Deepwatch is. The needle sits in the red and twitches.', 'depthGauge', { width: 2, height: 2 }),
  setPiece('salt-cone', 'Salt Cone', 'A heap of raked salt taller than the galleries around it, with a ladder up one side and a lamp at the summit. It is the only thing down here that grows on purpose.', 'saltCone', { width: 3, height: 3 }, { light: glow('#ffd27f', 4, 0.35) }),
  setPiece('container-tower', 'Stack Tower', 'Four containers stacked crosswise into a tower, with a beacon on top so the drivers could find the stacks in a blackout. Somebody has painted a tally of shifts up the ladder side. It stops halfway.', 'containerTower', { width: 3, height: 3 }, { light: glow('#ffb347', 6, 0.4) }),
  setPiece('cryo-core', 'Cryo Core', 'The column that keeps the vault cold: a glass shaft of coolant lit blue from inside, frost climbing the feed pipes. The pods around it draw on it in turn. Lately it has been drawing back.', 'cryoCore', { width: 3, height: 3 }, { light: glow('#4fd8ff', 8, 0.55) }),
  setPiece('call-board', 'Ward Call Board', 'An oak board with a lamp for every bed in the Vesper Wing and a brass bell over it. The porters still answer the lamps. Some of the beds they answer were taken out years ago.', 'callBoard', { width: 3, height: 2 }, { light: glow('#ffe08a', 6, 0.5) }),
  setPiece('bell-jar-tree', 'Bell-Jar Orchard', 'A single fruit tree under a glass dome ribbed in brass, kept as seed stock in case everything else failed. Everything else did not fail. The tree fruits anyway, out of season, and nobody eats it.', 'bellJarTree', { width: 3, height: 3 }, { light: glow('#c8f2a0', 6, 0.4) }),
  setPiece('slag-ladle', 'Slag Ladle', 'A riveted ladle on its trunnions, still full of slag that has never quite cooled. Crews coming off the Furnace warm their hands at it, from a respectful distance.', 'slagLadle', { width: 3, height: 3 }, { light: glow('#ff8a3a', 7, 0.6) }),
  setPiece('beacon-red', 'Red Survey Beacon', 'A weighted beacon chained to the causeway, one of four set at the turns so survey crews could read their place on the ring by colour. Red marks the north-west turn.', 'beaconRed', { width: 2, height: 2 }, { light: glow('#ff4a3a', 7, 0.55) }),
  setPiece('beacon-green', 'Green Survey Beacon', 'A weighted beacon chained to the causeway, one of four set at the turns so survey crews could read their place on the ring by colour. Green marks the north-east turn.', 'beaconGreen', { width: 2, height: 2 }, { light: glow('#5cf27a', 7, 0.55) }),
  setPiece('beacon-blue', 'Blue Survey Beacon', 'A weighted beacon chained to the causeway, one of four set at the turns so survey crews could read their place on the ring by colour. Blue marks the south-west turn.', 'beaconBlue', { width: 2, height: 2 }, { light: glow('#4fd8ff', 7, 0.55) }),
  setPiece('beacon-amber', 'Amber Survey Beacon', 'A weighted beacon chained to the causeway, one of four set at the turns so survey crews could read their place on the ring by colour. Amber marks the south-east turn.', 'beaconAmber', { width: 2, height: 2 }, { light: glow('#ffb347', 7, 0.55) }),
];

export const SET_PIECE_OBJECTS: readonly WorldObjectDefinition[] = [
  ...LANDMARK_OBJECTS,
  setPiece('fountain-basin', 'Fountain', 'A stone basin with a single jet, filtered, chilled and dosed to a pH nobody would sign off on. The coins at the bottom are all from the same week.', 'fountainBasin', { width: 3, height: 3 }, { light: glow('#7fd8ff', 4, 0.35) }),
  setPiece('fountain-grand', 'Meridian Fountain', 'Three tiers of terrazzo and brass around a column of lit water. It was commissioned to calm new intakes, and it was the last thing in the Atrium to be switched off during the breach.', 'fountainGrand', { width: 5, height: 5 }, { light: glow('#7fd8ff', 6, 0.45) }),
  setPiece('monument-statue', 'Founders’ Monument', 'A bronze figure holding a sealed canister aloft, on a plinth of pale stone. The plaque names three founders. A fourth name has been ground off, neatly.', 'monumentStatue', { width: 2, height: 2 }),
  setPiece('bench-curve', 'Curved Bench', 'A long curved bench in brushed steel and oak slats, angled so that everyone sitting on it faces the middle of the room, and nobody faces the doors.', 'benchCurve', { width: 3, height: 1 }),
  setPiece('banner-mast', 'Banner Mast', 'A brass mast flying the Meridian roundel. There is no wind in the Atrium. It moves anyway.', 'bannerMast', { width: 1, height: 1 }),
  setPiece('glass-kiosk', 'Glass Kiosk', 'A glass-walled concession kiosk selling ration bars, sealed water and paperbacks with the last chapters removed by the censor.', 'glassKiosk', { width: 3, height: 2 }, { light: glow('#ffd27f', 3, 0.3) }),
  setPiece('directory-pylon', 'Directory Pylon', 'A lit directory of every wing, sector and service in Meridian. Three entries are greyed out and cannot be selected.', 'directoryPylon', { width: 1, height: 1 }, { light: glow('#4fd8ff', 2, 0.3) }),
  setPiece('reception-desk', 'Reception Desk', 'A long desk of pale stone with a brass rail. The sign-in book is open at today’s date, and every line is already filled in.', 'receptionDesk', { width: 4, height: 2 }),
  setPiece('map-table', 'Map Table', 'A glass-topped table projecting a slow, rotating plan of the facility. The lower levels are drawn from memory.', 'mapTable', { width: 3, height: 2 }, { light: glow('#9fd8ff', 2, 0.25) }),
  setPiece('triage-station', 'Triage Station', 'A screened triage bay with a scanner arch and a fold-down cot. The intake form asks how many of you there are.', 'triageStation', { width: 3, height: 2 }, { light: glow('#d8fff0', 3, 0.3) }),
  setPiece('transit-shelter', 'Transit Shelter', 'A glass canopy on four brass posts, for waiting under. The service it was built for has not run in years, and nobody has taken the shelter down.', 'transitShelter', { width: 3, height: 2 }, { walkUnder: true }),
  setPiece('timetable-board', 'Timetable Board', 'A split-flap board of departures. Every service reads ON TIME. The clock above it does not move.', 'timetableBoard', { width: 3, height: 1 }, { light: glow('#ffb347', 2, 0.3) }),
  setPiece('departure-board', 'Departure Board', 'A wall-hung board of amber departures. The status column is the only part that changes, and only between two words.', 'departureBoard', { width: 3, height: 1 }, { light: glow('#ffb347', 2, 0.3) }),
  setPiece('buffer-stop', 'Buffer Stop', 'A sprung hazard-striped block at the end of the line. Whatever the track used to carry, it was expected to stop here.', 'bufferStop', { width: 2, height: 1 }, { light: glow('#ff4a3a', 1.5, 0.3) }),
  setPiece('platform-gate', 'Platform Gate', 'A glass gate that slides across the platform edge when a car is in. It has been in the closed position since the last service.', 'platformGate', { width: 2, height: 1 }, { light: glow('#7cf29a', 1.5, 0.25) }),
  setPiece('ticket-barrier', 'Ticket Barrier', 'A waist-high turnstile with a card reader. It accepts any card, and logs the name on it twice.', 'ticketBarrier', { width: 1, height: 1 }),
  setPiece('guard-booth', 'Guard Booth', 'An armoured booth with a slot window and a red lamp. The duty roster on the glass ends abruptly on a Tuesday.', 'guardBooth', { width: 2, height: 2 }, { light: glow('#ff8a5a', 2, 0.3) }),
  setPiece('hydraulic-press', 'Hydraulic Press', 'A three-column press for flattening condemned equipment. The bed has a dent shaped like something that was not equipment.', 'hydraulicPress', { width: 3, height: 3 }),
];
