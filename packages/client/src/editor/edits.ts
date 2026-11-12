import {
  buildDistrict,
  drawBlueprint,
  GAME_CONTENT,
  MAP_LEGEND,
  positionAt,
  resolvePosition,
  TILE_KINDS,
  tileKey,
  type Blueprint,
  type BlueprintStep,
  type DistrictLayout,
  type Facing,
  type LayoutPosition,
  type TileKindId,
  type TilePoint,
  type TileRect,
} from '@containment/shared';

export type Collection = 'objects' | 'assemblies' | 'npcs' | 'creatures' | 'lights' | 'decals' | 'setPieces';
export type EntryRef = { readonly collection: Collection; readonly index: number } | { readonly collection: 'anchors'; readonly name: string };
export type EditResult = { readonly ok: true; readonly layout: DistrictLayout } | { readonly ok: false; readonly reason: string };
export type RoomDressingEntry = DistrictLayout['dressing'][string];

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type AnyEntry = Mutable<Record<string, unknown>> & { at?: LayoutPosition; id?: string; facing?: Facing };

const COLLECTIONS_WITH_IDS: ReadonlySet<Collection> = new Set(['objects', 'assemblies', 'npcs', 'creatures', 'setPieces']);
const FACINGS_WITH_TURNS: ReadonlySet<Collection> = new Set(['objects', 'assemblies', 'setPieces']);
const NEXT_FACING: Readonly<Record<Facing, Facing>> = { south: 'west', west: 'north', north: 'east', east: 'south' };
const EDITABLE_FIELDS: Readonly<Record<Collection, readonly string[]>> = {
  objects: ['object', 'facing'],
  assemblies: ['assembly', 'facing', 'span'],
  npcs: ['npc'],
  creatures: ['creature'],
  lights: ['radius', 'color', 'intensity'],
  decals: ['kind', 'pattern', 'tint', 'width', 'height'],
  setPieces: ['prefab', 'facing', 'id'],
};

const refuse = (reason: string): EditResult => ({ ok: false, reason });

const checked = (layout: DistrictLayout): EditResult => {
  try {
    buildDistrict(layout);
    return { ok: true, layout };
  } catch (error) {
    return refuse((error as Error).message);
  }
};

const copy = (layout: DistrictLayout): Mutable<DistrictLayout> & Record<string, unknown> => structuredClone(layout) as Mutable<DistrictLayout> & Record<string, unknown>;

const planOf = (layout: DistrictLayout): Blueprint => drawBlueprint(layout.size, layout.steps, layout.tiles);

const listOf = (layout: Record<string, unknown>, collection: Collection): AnyEntry[] => layout[collection] as AnyEntry[];

const entryOf = (layout: Record<string, unknown>, ref: EntryRef): AnyEntry | undefined =>
  ref.collection === 'anchors' ? undefined : listOf(layout, ref.collection)[ref.index];

const labelOf = (entry: AnyEntry, collection: string, index: number): string => entry.id ?? `${collection}[${index}]`;

const inside = (layout: DistrictLayout, tile: TilePoint): boolean => tile.x >= 0 && tile.y >= 0 && tile.x < layout.size.width && tile.y < layout.size.height;

function placeable(layout: DistrictLayout, plan: Blueprint, collection: Collection | 'anchors', entry: AnyEntry | undefined, tile: TilePoint): string | null {
  if (!inside(layout, tile)) return `${tile.x},${tile.y} is outside the district`;
  if (collection === 'lights' || collection === 'decals' || collection === 'anchors') return null;
  const kind = tileKindAt(plan, tile);
  if (TILE_KINDS[kind].walkable) return null;
  const objectId = typeof entry?.object === 'string' ? entry.object : undefined;
  const deck = objectId !== undefined && GAME_CONTENT.worldObjects.get(objectId)?.deck === true;
  if (deck && TILE_KINDS[kind].structure !== 'wall' && kind !== 'void') return null;
  return `${tile.x},${tile.y} is ${TILE_KINDS[kind].structure === 'wall' ? 'a wall' : kind}, not floor`;
}

const tileKindAt = (plan: Blueprint, tile: TilePoint): TileKindId => MAP_LEGEND[plan.map[tile.y]?.[tile.x] ?? ' '] ?? 'void';

export function freshId(layout: DistrictLayout, kind: string): string {
  const taken = new Set<string>();
  for (const collection of COLLECTIONS_WITH_IDS) for (const entry of listOf(layout as unknown as Record<string, unknown>, collection)) if (entry.id) taken.add(entry.id);
  let n = 1;
  while (taken.has(`${layout.id}-${kind}-${n}`)) n += 1;
  return `${layout.id}-${kind}-${n}`;
}

export function moveEntry(layout: DistrictLayout, ref: EntryRef, to: TilePoint): EditResult {
  const next = copy(layout);
  const plan = planOf(layout);
  const entry = entryOf(next, ref);
  if (ref.collection !== 'anchors' && !entry) return refuse('Nothing is selected there.');
  const problem = placeable(layout, plan, ref.collection, entry, to);
  if (problem) return refuse(`Cannot move there: ${problem}.`);
  const at = positionAt(plan, to);
  if (ref.collection === 'setPieces' && !('room' in at)) return refuse('A set-piece must stand in a room.');
  if (ref.collection === 'anchors') {
    if (!(ref.name in next.anchors)) return refuse(`There is no anchor "${ref.name}".`);
    (next.anchors as Record<string, LayoutPosition>)[ref.name] = at;
  } else if (entry) entry.at = at;
  return checked(next);
}

export function rotateEntry(layout: DistrictLayout, ref: EntryRef): EditResult {
  if (ref.collection === 'anchors' || !FACINGS_WITH_TURNS.has(ref.collection)) return refuse('That has no facing.');
  const next = copy(layout);
  const entry = entryOf(next, ref);
  if (!entry) return refuse('Nothing is selected there.');
  entry.facing = NEXT_FACING[entry.facing ?? 'south'];
  return checked(next);
}

export function deleteEntry(layout: DistrictLayout, ref: EntryRef): EditResult {
  if (ref.collection === 'anchors') return refuse('Anchors are read by other content; move them instead.');
  const next = copy(layout);
  const list = listOf(next, ref.collection);
  if (!list[ref.index]) return refuse('Nothing is selected there.');
  list.splice(ref.index, 1);
  return checked(next);
}

export function duplicateEntry(layout: DistrictLayout, ref: EntryRef): EditResult {
  if (ref.collection === 'anchors') return refuse('Anchors cannot be duplicated.');
  const source = entryOf(layout as unknown as Record<string, unknown>, ref);
  if (!source?.at) return refuse('Nothing is selected there.');
  const from = resolvePosition(planOf(layout), source.at, 'selection');
  return addEntry(layout, ref.collection, withoutPlacement(source), { x: from.x + 1, y: from.y });
}

const withoutPlacement = (entry: AnyEntry): Record<string, unknown> => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'id' && key !== 'at'));

export function addEntry(layout: DistrictLayout, collection: Collection, entry: Record<string, unknown>, at: TilePoint): EditResult {
  const plan = planOf(layout);
  const problem = placeable(layout, plan, collection, entry as AnyEntry, at);
  if (problem) return refuse(`Cannot place there: ${problem}.`);
  const position = positionAt(plan, at);
  if (collection === 'setPieces' && !('room' in position)) return refuse('A set-piece must stand in a room.');
  const next = copy(layout);
  const added: AnyEntry = COLLECTIONS_WITH_IDS.has(collection) ? { id: freshId(layout, collection), ...entry, at: position } : { ...entry, at: position };
  listOf(next, collection).push(added);
  return checked(next);
}

export function setField(layout: DistrictLayout, ref: EntryRef, field: string, value: unknown): EditResult {
  if (ref.collection === 'anchors') return refuse('Anchors only have a position.');
  if (!EDITABLE_FIELDS[ref.collection].includes(field)) return refuse(`"${field}" cannot be edited here.`);
  const next = copy(layout);
  const entry = entryOf(next, ref);
  if (!entry) return refuse('Nothing is selected there.');
  if (value === undefined || value === '') delete entry[field];
  else entry[field] = value;
  return checked(next);
}

const roomStepIndex = (layout: DistrictLayout, room: string): number => layout.steps.findIndex((step) => step.kind === 'room' && step.id === room);

function roomPlacements(layout: DistrictLayout, room: string): { label: string; at: { dx: number; dy: number } }[] {
  const found: { label: string; at: { dx: number; dy: number } }[] = [];
  const record = layout as unknown as Record<string, unknown>;
  for (const collection of ['objects', 'assemblies', 'npcs', 'creatures', 'lights', 'decals', 'setPieces'] as const) {
    listOf(record, collection).forEach((entry, index) => {
      if (entry.at && 'room' in entry.at && entry.at.room === room) found.push({ label: labelOf(entry, collection, index), at: entry.at });
    });
  }
  for (const [name, at] of Object.entries(layout.anchors)) if ('room' in at && at.room === room) found.push({ label: `anchor ${name}`, at });
  return found;
}

export function moveRoom(layout: DistrictLayout, room: string, to: TilePoint): EditResult {
  const index = roomStepIndex(layout, room);
  if (index < 0) return refuse(`There is no room "${room}".`);
  const step = layout.steps[index] as Extract<BlueprintStep, { kind: 'room' }>;
  return resizeRoom(layout, room, { ...step.rect, x: to.x, y: to.y });
}

export function resizeRoom(layout: DistrictLayout, room: string, rect: TileRect): EditResult {
  const index = roomStepIndex(layout, room);
  if (index < 0) return refuse(`There is no room "${room}".`);
  if (rect.width < 3 || rect.height < 3) return refuse('A room must be at least 3x3.');
  const outside = roomPlacements(layout, room).filter(({ at }) => at.dx >= rect.width || at.dy >= rect.height).map(({ label }) => label);
  if (outside.length > 0) return refuse(`That would leave ${outside.join(', ')} outside "${room}".`);
  const next = copy(layout);
  (next.steps as BlueprintStep[])[index] = { ...(layout.steps[index] as Extract<BlueprintStep, { kind: 'room' }>), rect };
  return checked(next);
}

export function editStep(layout: DistrictLayout, index: number, patch: Record<string, unknown>): EditResult {
  const step = layout.steps[index];
  if (!step) return refuse(`There is no step ${index}.`);
  if ('kind' in patch && patch.kind !== step.kind) return refuse('A step cannot change kind.');
  const next = copy(layout);
  (next.steps as BlueprintStep[])[index] = { ...step, ...patch } as BlueprintStep;
  return checked(next);
}

export function addStep(layout: DistrictLayout, step: BlueprintStep): EditResult {
  const next = copy(layout);
  (next.steps as BlueprintStep[]).push(step);
  return checked(next);
}

export function deleteStep(layout: DistrictLayout, index: number): EditResult {
  const step = layout.steps[index];
  if (!step) return refuse(`There is no step ${index}.`);
  if (step.kind === 'room') {
    const room = step.id;
    const users = [
      ...layout.steps.flatMap((other, at) => (at !== index && (('room' in other && other.room === room) || (other.kind === 'link' && (other.from === room || other.to === room))) ? [`step ${at} (${other.kind})`] : [])),
      ...roomPlacements(layout, room).map(({ label }) => label),
      ...layout.areas.flatMap((area) => ('room' in area && area.room === room ? [`area ${area.name}`] : [])),
      ...(room in layout.dressing ? ['its dressing'] : []),
    ];
    if (users.length > 0) return refuse(`Room "${room}" is still used by ${users.join(', ')}.`);
  }
  const next = copy(layout);
  (next.steps as BlueprintStep[]).splice(index, 1);
  return checked(next);
}

export function paintTiles(layout: DistrictLayout, tiles: readonly TilePoint[], tile: TileKindId): EditResult {
  const plan = planOf({ ...layout, tiles: [] });
  const doorways = new Set([...Object.values(plan.exits).flatMap((exit) => exit.tiles), ...Object.values(plan.links).flat()].map(tileKey));
  const wanted = tiles.filter((point) => inside(layout, point) && !doorways.has(tileKey(point)));
  if (wanted.length === 0) return refuse('Nothing there can be painted; exits and links are changed by their steps.');
  const keys = new Set(wanted.map(tileKey));
  const next = copy(layout);
  next.tiles = [...layout.tiles.filter((painted) => !keys.has(tileKey(painted))), ...wanted.map((point) => ({ x: point.x, y: point.y, tile }))];
  return checked(next);
}

export function eraseTiles(layout: DistrictLayout, tiles: readonly TilePoint[]): EditResult {
  const keys = new Set(tiles.map(tileKey));
  const next = copy(layout);
  next.tiles = layout.tiles.filter((painted) => !keys.has(tileKey(painted)));
  return checked(next);
}

export function setDressing(layout: DistrictLayout, room: string, dressing: RoomDressingEntry | null): EditResult {
  if (roomStepIndex(layout, room) < 0) return refuse(`There is no room "${room}".`);
  const next = copy(layout);
  const record = next.dressing as Record<string, RoomDressingEntry>;
  if (dressing === null) delete record[room];
  else record[room] = dressing;
  return checked(next);
}
