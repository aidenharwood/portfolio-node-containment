import type { AssemblyId, InstanceId, WorldObjectId } from '../ids.ts';
import { expandAssembly, type AssemblyDefinition, type AssemblyPiece, type AssemblyPlacement } from '../world/assemblies.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../world/entities.ts';
import type { Facing, TilePoint } from '../world/geometry.ts';

export const INSTALLATION_CORE = 'C';

interface InstallationPart {
  readonly suffix: string;
  readonly model: WorldObjectModel;
  readonly floor?: boolean;
}

export interface InstallationKind {
  readonly coreIds: readonly WorldObjectId[];
  readonly coreModel?: WorldObjectModel;
  readonly layout: readonly string[];
  readonly parts: Readonly<Record<string, InstallationPart>>;
}

const APRON: InstallationPart = { suffix: 'apron', model: 'stationApron', floor: true };

const station = (coreId: WorldObjectId, left: WorldObjectModel, right: WorldObjectModel): InstallationKind => ({
  coreIds: [coreId],
  layout: ['lCr', 'aaa'],
  parts: { l: { suffix: 'intake', model: left }, r: { suffix: 'output', model: right }, a: APRON },
});

export const INSTALLATION_KINDS: readonly InstallationKind[] = [
  station('refinery', 'refineryHopper', 'refineryPress'),
  station('fabricator', 'fabricatorFeeder', 'fabricatorBench'),
  station('synthesiser', 'synthReagents', 'synthColdStore'),
  {
    coreIds: ['atrium-service-lift', 'undercroft-service-lift', 'calder-lift-down', 'calder-lift-up', 'vesper-lift-down', 'vesper-lift-up'],
    layout: ['pCp', 'ldr'],
    parts: {
      p: { suffix: 'pylon', model: 'liftPylon' },
      l: { suffix: 'deck-left', model: 'liftDeckLeft' },
      d: { suffix: 'deck', model: 'liftDeck' },
      r: { suffix: 'deck-right', model: 'liftDeckRight' },
    },
  },
  {
    coreIds: ['atrium-deep-line', 'deepwatch-deep-line'],
    layout: ['lCr', 'aaa'],
    parts: { l: { suffix: 'frame-left', model: 'wallLiftFrameLeft' }, r: { suffix: 'frame-right', model: 'wallLiftFrameRight' }, a: APRON },
  },
  {
    coreIds: ['verdance-anomaly', 'verdant-fold-exit', 'return-chute', 'office-return-chute'],
    layout: ['lCr', 'aaa'],
    parts: {
      l: { suffix: 'shards-left', model: 'riftShardsLeft' },
      r: { suffix: 'shards-right', model: 'riftShardsRight' },
      a: { suffix: 'scar', model: 'riftApron', floor: true },
    },
  },
  {
    coreIds: [
      'sealed-bulkhead',
      'sector-three-seal',
      'sector-three-return',
      'sector-three-deepwatch-door',
      'deepwatch-threshold-door',
      'cryovault-door',
      'signal-array-door',
      'archive-door',
      'sealed-reading-door',
      'furnace-door',
      'reactor-door',
      'calder-gate',
      'nave-door',
      'vesper-gate',
      'surgery-door',
    ],
    coreModel: 'bulkheadLeafLeft',
    layout: ['Cr'],
    parts: { r: { suffix: 'leaf-right', model: 'bulkheadLeafRight' } },
  },
  {
    coreIds: ['the-knock', 'far-side-return'],
    layout: ['lCr'],
    parts: { l: { suffix: 'jamb-left', model: 'knockFrameLeft' }, r: { suffix: 'jamb-right', model: 'knockFrameRight' } },
  },
];

const KIND_OF = new Map<WorldObjectId, InstallationKind>(INSTALLATION_KINDS.flatMap((kind) => kind.coreIds.map((coreId) => [coreId, kind] as const)));

const partId = (coreId: WorldObjectId, part: InstallationPart): WorldObjectId => `${coreId}-${part.suffix}`;

function assemblyOf(coreId: WorldObjectId, kind: InstallationKind, name: string): AssemblyDefinition {
  const pieces: Record<string, AssemblyPiece> = { [INSTALLATION_CORE]: { objectId: coreId } };
  for (const [symbol, part] of Object.entries(kind.parts)) pieces[symbol] = { objectId: partId(coreId, part) };
  return { id: coreId, name, pieces, layout: kind.layout };
}

function partObject(core: WorldObjectDefinition, part: InstallationPart): WorldObjectDefinition {
  const id = partId(core.id, part);
  if (part.floor) return { id, name: core.name, examine: core.examine, model: part.model, blocksMovement: false, interactions: [] };
  return {
    id,
    name: core.name,
    examine: core.examine,
    model: part.model,
    blocksMovement: true,
    countsAs: core.id,
    ...(core.door ? { door: core.door } : {}),
    interactions: core.interactions,
  };
}

export function buildInstallations(objects: readonly WorldObjectDefinition[]): { readonly objects: WorldObjectDefinition[]; readonly assemblies: AssemblyDefinition[] } {
  const built: WorldObjectDefinition[] = [];
  const assemblies: AssemblyDefinition[] = [];
  for (const object of objects) {
    const kind = KIND_OF.get(object.id);
    if (!kind) {
      built.push(object);
      continue;
    }
    const core = kind.coreModel ? { ...object, model: kind.coreModel } : object;
    built.push(core, ...Object.values(kind.parts).map((part) => partObject(core, part)));
    assemblies.push(assemblyOf(core.id, kind, core.name));
  }
  const missing = [...KIND_OF.keys()].filter((coreId) => !objects.some((object) => object.id === coreId));
  if (missing.length > 0) throw new Error(`Installations name unknown objects: ${missing.join(', ')}.`);
  return { objects: built, assemblies };
}

export function install(instanceId: InstanceId, coreId: WorldObjectId & AssemblyId, core: TilePoint, facing: Facing = 'south'): AssemblyPlacement {
  const kind = KIND_OF.get(coreId);
  if (!kind) throw new Error(`"${coreId}" is not an installation.`);
  const probe = expandAssembly(assemblyOf(coreId, kind, coreId), { instanceId, assemblyId: coreId, position: { x: 0, y: 0 }, facing });
  const offset = probe.find((piece) => piece.objectId === coreId)?.position ?? { x: 0, y: 0 };
  return { instanceId, assemblyId: coreId, position: { x: core.x - offset.x, y: core.y - offset.y }, facing };
}

export function installationLayoutOf(assemblyId: AssemblyId): AssemblyDefinition | undefined {
  const kind = KIND_OF.get(assemblyId);
  return kind ? assemblyOf(assemblyId, kind, assemblyId) : undefined;
}
