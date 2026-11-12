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

export const SET_PIECE_OBJECTS: readonly WorldObjectDefinition[] = [
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
  setPiece('ticket-barrier', 'Ticket Barrier', 'A waist-high turnstile with a card reader. It accepts any card, and logs the name on it twice.', 'ticketBarrier', { width: 1, height: 1 }),
  setPiece('guard-booth', 'Guard Booth', 'An armoured booth with a slot window and a red lamp. The duty roster on the glass ends abruptly on a Tuesday.', 'guardBooth', { width: 2, height: 2 }, { light: glow('#ff8a5a', 2, 0.3) }),
  setPiece('hydraulic-press', 'Hydraulic Press', 'A three-column press for flattening condemned equipment. The bed has a dent shaped like something that was not equipment.', 'hydraulicPress', { width: 3, height: 3 }),
];
