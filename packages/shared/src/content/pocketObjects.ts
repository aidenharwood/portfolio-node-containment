import type { ObjectLight, WorldObjectDefinition } from '../world/entities.ts';
import { HYDROPONICS_ANCHORS } from './districts/hydroponics.ts';

const ANOMALY_LIGHT: ObjectLight = { radius: 3.5, color: '#b57cff', intensity: 0.85, flicker: true };

export const POCKET_OBJECTS: readonly WorldObjectDefinition[] = [
  {
    id: 'verdance-anomaly',
    name: 'Fold in the Air',
    examine: 'A crease hangs over the Heart Bed, as if the room had been folded and not quite smoothed out. It smells of rain on soil that has never seen rain.',
    model: 'anomaly',
    blocksMovement: true,
    light: ANOMALY_LIGHT,
    interactions: [
      {
        verb: 'Step through',
        conditions: [{ type: 'questCompleted', questId: 'overgrowth' }],
        failureText: 'The crease flinches away from your hand. Whatever grows on the other side is still fighting the Heart Bed.',
        effects: [{ type: 'teleport', districtId: 'verdant-fold', position: { x: 9, y: 11 } }],
      },
    ],
  },
  {
    id: 'verdant-fold-exit',
    name: 'Seam to Hydroponics',
    examine: 'The way back. Through it you can see the Heart Bed upside down, and hear the irrigation pumps the right way up.',
    model: 'anomaly',
    blocksMovement: true,
    light: ANOMALY_LIGHT,
    interactions: [{ verb: 'Step through', effects: [{ type: 'teleport', districtId: 'hydroponics', position: HYDROPONICS_ANCHORS.foldReturn }] }],
  },
  {
    id: 'fold-heartwood',
    name: 'Heartwood',
    examine: 'The strangler vine, as it would have grown if nobody had ever been afraid of it. It is patient. It is listening back.',
    model: 'stranglerVine',
    modelScale: 1.6,
    blocksMovement: true,
    light: { radius: 3, color: '#7cf29a', intensity: 0.6 },
    interactions: [
      {
        verb: 'Listen',
        oncePerCharacter: true,
        alreadyUsedText: 'The heartwood has said what it meant to. The leaves still turn to follow you.',
        effects: [
          { type: 'grantExperience', skill: 'research', amount: 220 },
          { type: 'notify', text: 'Under the rustle there is a slow pulse, the same rhythm as the Heart Bed. The vine was never invading Hydroponics. It was trying to get back here.' },
        ],
      },
    ],
  },
];
