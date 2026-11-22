import type { WorldObjectDefinition } from '../../world/entities.ts';
import { DRESSING_THEMES } from '../prefabs/types.ts';
import { spanAnchor } from './districts.ts';
import { liftObject } from './objects.ts';

export const CLEARANCE_INTAKE = 'clearance-kestrel-intake';
export const CLEARANCE_GALLOWGLASS = 'clearance-gallowglass';
export const CLEARANCE_NULL = 'clearance-null';

export const SPAN_LIFTS: readonly WorldObjectDefinition[] = [
  liftObject({ id: 'kestrel-lift-down', verb: 'Descend', where: 'Kestrel Intake, B1', site: 'Site Kestrel', districtId: 'kestrel-intake', position: spanAnchor('kestrel-intake', 'arrival'), clearance: CLEARANCE_INTAKE }),
  liftObject({ id: 'kestrel-lift-up', verb: 'Ascend', where: 'the Kestrel headhouse', site: 'Site Kestrel', districtId: 'site-kestrel', position: spanAnchor('site-kestrel', 'lift-arrival') }),
  liftObject({ id: 'gallowglass-lift-down', verb: 'Descend', where: 'the Gallowglass undercity', site: 'Site Gallowglass', districtId: 'gallowglass-undercity', position: spanAnchor('gallowglass-undercity', 'arrival'), clearance: CLEARANCE_GALLOWGLASS }),
  liftObject({ id: 'gallowglass-lift-up', verb: 'Ascend', where: 'the Gallowglass headhouse', site: 'Site Gallowglass', districtId: 'site-gallowglass', position: spanAnchor('site-gallowglass', 'lift-arrival') }),
  liftObject({ id: 'null-lift-down', verb: 'Descend', where: 'Null Below', site: 'Site Null', districtId: 'null-below', position: spanAnchor('null-below', 'arrival'), clearance: CLEARANCE_NULL }),
  liftObject({ id: 'null-lift-up', verb: 'Ascend', where: 'the Null headhouse', site: 'Site Null', districtId: 'site-null', position: spanAnchor('site-null', 'lift-arrival') }),
];

const relic = (id: string, name: string, examine: string, model: WorldObjectDefinition['model'], verb: string, text: string): WorldObjectDefinition => ({
  id,
  name,
  examine,
  model,
  blocksMovement: true,
  furnishing: { mount: 'free', homes: DRESSING_THEMES },
  interactions: [{ verb, effects: [{ type: 'notify', text }] }],
});

export const SPAN_RELICS: readonly WorldObjectDefinition[] = [
  relic('the-roster', 'The Roster', 'KST-000. A grey steel filing cabinet behind a pane of hard light. A drawer is open. The top file has your name on it, and a photograph taken tomorrow.', 'secureCell', 'Read the open file', 'The file is yours. Intake date: today. Previous intake: two years ago. Status: REISSUED.'),
  relic('brightly-reel', 'Brightly Reel', 'A reel of advert film, still warm, still running with no projector.', 'secureCell', 'Watch', 'Mr Brightly smiles out of the reel and says your name, correctly.'),
  relic('null-console', 'Review Console', 'A Directorate console built into precursor glass. The screen lists every person on the Span under the heading BREACHES.', 'secureCell', 'Read', 'You are on the list. You were added by Site Kestrel, by Registrar Lune, on the day the Meridian came down.'),
];
