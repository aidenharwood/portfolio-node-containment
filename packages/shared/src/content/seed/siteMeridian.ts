import { CANAL_BASIN } from '../districts/lowWard.ts';
import { MERIDIAN_INTAKE, MERIDIAN_INTAKE_ANCHORS, MERIDIAN_SECURE, MERIDIAN_SECURE_ANCHORS, MERIDIAN_VAULT, MERIDIAN_VAULT_ANCHORS } from '../districts/siteMeridian.ts';
import type { TilePoint } from '../../world/geometry.ts';
import type { WorldObjectDefinition } from '../../world/entities.ts';

const headhouseArrival = CANAL_BASIN.anchors?.['lift-arrival'] as TilePoint;

const lift = (id: string, verb: 'Descend' | 'Ascend', where: string, districtId: string, position: TilePoint): WorldObjectDefinition => ({
  id,
  name: 'Lift',
  examine: `The Site Meridian lift. ${verb === 'Descend' ? 'Down' : 'Up'} to ${where}.`,
  model: 'liftDoor',
  blocksMovement: true,
  furnishing: { mount: 'wall', homes: ['transit', 'containment', 'office'] },
  interactions: [{ verb, effects: [{ type: 'teleport', districtId, position }] }],
});

export const SITE_MERIDIAN_LIFTS: readonly WorldObjectDefinition[] = [
  lift('meridian-lift', 'Descend', 'B1, Intake', MERIDIAN_INTAKE.id, MERIDIAN_INTAKE_ANCHORS.arrival),
  lift('intake-lift-up', 'Ascend', 'the headhouse', CANAL_BASIN.id, headhouseArrival),
  lift('intake-lift-down', 'Descend', 'B2, the Secure Wing', MERIDIAN_SECURE.id, MERIDIAN_SECURE_ANCHORS.arrival),
  lift('secure-lift-up', 'Ascend', 'B1, Intake', MERIDIAN_INTAKE.id, MERIDIAN_INTAKE_ANCHORS['lower-arrival']),
  lift('secure-lift-down', 'Descend', 'B3, the Vault', MERIDIAN_VAULT.id, MERIDIAN_VAULT_ANCHORS.arrival),
  lift('vault-lift-up', 'Ascend', 'B2, the Secure Wing', MERIDIAN_SECURE.id, MERIDIAN_SECURE_ANCHORS['vault-arrival']),
];
