import type { AssemblyId, WorldObjectId } from '../ids.ts';
import type { AssemblyDefinition, AssemblyPiece } from '../world/assemblies.ts';
import type { WorldObjectDefinition, WorldObjectModel } from '../world/entities.ts';

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

export const INSTALLATION_KINDS: readonly InstallationKind[] = [];

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

export function installationLayoutOf(assemblyId: AssemblyId): AssemblyDefinition | undefined {
  const kind = KIND_OF.get(assemblyId);
  return kind ? assemblyOf(assemblyId, kind, assemblyId) : undefined;
}
