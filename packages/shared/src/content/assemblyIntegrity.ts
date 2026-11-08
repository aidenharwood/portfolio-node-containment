import { expandAssembly, findAssemblyDefinitionIssues } from '../world/assemblies.ts';
import type { ObjectPlacement } from '../world/district.ts';
import type { GameContent } from './gameContent.ts';

export function findAssemblyIssues(content: GameContent): string[] {
  const issues: string[] = [];
  for (const assembly of content.assemblies.values()) {
    issues.push(...findAssemblyDefinitionIssues(assembly, (objectId) => content.worldObjects.has(objectId)));
  }
  for (const district of content.districts.values()) {
    for (const placement of district.assemblies ?? []) {
      const where = `zone ${district.id}: assembly "${placement.instanceId}"`;
      const assembly = content.assemblies.get(placement.assemblyId);
      if (!assembly) {
        issues.push(`${where} uses unknown assembly "${placement.assemblyId}"`);
        continue;
      }
      if (placement.span !== undefined && assembly.stretchRow === undefined) issues.push(`${where} sets a span but "${assembly.id}" does not stretch`);
      if (placement.span !== undefined && (!Number.isInteger(placement.span) || placement.span < 1)) issues.push(`${where} needs a whole span of at least 1`);
    }
  }
  return issues;
}

export function districtObjectsOf(content: GameContent, districtId: string): ObjectPlacement[] {
  const district = content.districts.get(districtId);
  if (!district) return [];
  return [
    ...district.objects,
    ...(district.assemblies ?? []).flatMap((placement) => {
      const assembly = content.assemblies.get(placement.assemblyId);
      return assembly ? expandAssembly(assembly, placement) : [];
    }),
  ];
}
