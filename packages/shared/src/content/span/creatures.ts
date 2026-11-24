import { roundExperience } from '../../character/skills.ts';
import type { CreatureDefinition } from '../../combat/creatures.ts';
import type { EncounterDefinition } from '../../combat/encounters.ts';
import { beast, killExperience, standardIntegrity, type Beast } from '../catalog/creatureKit.ts';

const passive = (definition: CreatureDefinition): CreatureDefinition => definition;

const rimward = (definition: CreatureDefinition, factor: number): CreatureDefinition => ({ ...definition, experience: roundExperience(definition.experience * factor) });

export const ENCOUNTER_EXPERIENCE_FACTOR = 2.5;

export const ELITE_INTEGRITY_FACTOR = 2.5;

export const encounterExperience = (level: number, integrity: number): number => roundExperience(killExperience(level, integrity) * ENCOUNTER_EXPERIENCE_FACTOR);

const elite = (spec: Beast, respawnTicks: number, encounter: EncounterDefinition): CreatureDefinition => {
  const integrity = Math.round(standardIntegrity(spec.level) * ELITE_INTEGRITY_FACTOR);
  return { ...beast({ ...spec, integrity }), experience: encounterExperience(spec.level, integrity), respawnTicks, encounter };
};

export const SPAN_CREATURES: readonly CreatureDefinition[] = [
  passive({
    id: 'training-drone',
    name: 'Training Drone',
    examine: 'A Directorate practice drone in Kestrel white, light on its skids. It skips away from darts and shrugs off a focus, and folds when you close in. It logs every blow for your file.',
    model: 'trainingDrone',
    level: 1,
    integrity: 6,
    defence: 0,
    attack: { style: 'melee', accuracy: 0, maxHit: 1, range: 1, speedTicks: 6 },
    guard: 'skirmisher',
    aggroRadius: 0,
    leashRadius: 4,
    wanderRadius: 1,
    respawnTicks: 10,
    experience: killExperience(1, 6),
    loot: [],
  }),
  passive({
    id: 'echo-decoy',
    name: 'Echo Decoy',
    examine: 'A hard-light psion sim that hums just under hearing. A focus slides off it like rain off glass. A coil dart does not.',
    model: 'vaultEcho',
    level: 1,
    integrity: 6,
    defence: 1,
    attack: { style: 'psionic', accuracy: 0, maxHit: 1, range: 2, speedTicks: 6, projectile: 'pulse' },
    guard: 'warden',
    aggroRadius: 0,
    leashRadius: 4,
    wanderRadius: 1,
    respawnTicks: 10,
    experience: killExperience(1, 6),
    loot: [],
  }),
  passive({
    id: 'plated-drone',
    name: 'Plated Drone',
    examine: 'A training drone bolted into a shell of surplus plate. Batons ring off it and darts skip. Brandt keeps it to teach recruits what a focus is for.',
    model: 'trainingDrone',
    level: 1,
    integrity: 6,
    defence: 1,
    attack: { style: 'melee', accuracy: 0, maxHit: 1, range: 1, speedTicks: 6 },
    guard: 'bulwark',
    aggroRadius: 0,
    leashRadius: 4,
    wanderRadius: 1,
    respawnTicks: 10,
    experience: killExperience(1, 6),
    loot: [],
  }),
  passive({
    id: 'sim-wisp',
    name: 'Sim-wisp',
    designation: 'KST-112',
    examine: 'A harmless light that lives in packing crates. Kestrel breeds them so recruits have something safe to contain.',
    model: 'crateWisp',
    level: 1,
    integrity: 5,
    defence: 0,
    attack: { style: 'psionic', accuracy: 0, maxHit: 1, range: 2, speedTicks: 6 },
    aggroRadius: 0,
    leashRadius: 4,
    wanderRadius: 2,
    respawnTicks: 12,
    experience: killExperience(1, 5),
    loot: [{ itemId: 'trace-dust', count: 1, chance: 0.5 }],
    containment: { containmentClass: 'safe', procedures: 'Wear it down gently. Seal it in any crate. It likes warm light and will follow a flashlight home.', loot: [{ itemId: 'trace-dust', count: 2, chance: 1 }] },
  }),
  beast({ id: 'lawn-rat', name: 'Lawn Rat', examine: 'A fat rat that lives under the Commons lawns. It has never been hungry and it is not afraid of you.', model: 'canalRat', level: 2, wander: 3, loot: [{ itemId: 'rag-bundle', count: 1, chance: 0.4 }, { itemId: 'scrap-metal', count: 1, chance: 0.2 }, { itemId: 'ratcatchers-gloves', count: 1, chance: 0.01 }] }),
  beast({ id: 'courtyard-gull', name: 'Courtyard Gull', examine: 'A gull that has never seen a sea. It thinks the lake is one and it thinks you are lunch.', model: 'pigeon', level: 1, wander: 3, loot: [{ itemId: 'rag-bundle', count: 1, chance: 0.3 }, { itemId: 'feather-cap', count: 1, chance: 0.01 }] }),
  beast({ id: 'feral-hound', name: 'Feral Hound', examine: 'A colony dog gone back to the wild. The pack hunts along the Seam.', model: 'strayDog', level: 5, guard: 'skirmisher', loot: [{ itemId: 'rag-bundle', count: 1, chance: 0.5 }, { itemId: 'scrap-metal', count: 1, chance: 0.3 }, { itemId: 'allotment-greens', count: 1, chance: 0.2 }, { itemId: 'strays-collar', count: 1, chance: 0.01 }] }),
  beast({ id: 'drill-sentry', name: 'Drill Sentry', designation: 'KST-310', examine: 'A live-fire training turret that walked off the Kestrel range on its own legs. It still shouts the drill between shots.', model: 'trainingDrone', level: 3, style: 'ranged', range: 4, projectile: 'dart', wander: 2, loot: [{ itemId: 'scrap-metal', count: 1, chance: 0.5 }, { itemId: 'copper-wire', count: 1, chance: 0.25 }, { itemId: 'trace-dust', count: 1, chance: 0.2 }] }),
  beast({ id: 'seam-boar', name: 'Seam Boar', examine: 'A colony pig gone feral along the Seam. Its tusks are bent rebar and it has a grudge against fences.', model: 'strayDog', level: 4, guard: 'skirmisher', loot: [{ itemId: 'allotment-greens', count: 1, chance: 0.5 }, { itemId: 'rag-bundle', count: 1, chance: 0.3 }, { itemId: 'scrap-metal', count: 1, chance: 0.2 }] }),
  beast({ id: 'grounds-mite', name: 'Grounds Mite', designation: 'KST-208', examine: 'A fist-sized mite that eats light. Kestrel keeps a colony for recruits to practise on, and the colony keeps getting out.', model: 'gutterMite', level: 6, aggressive: true, loot: [{ itemId: 'trace-dust', count: 1, chance: 0.3 }, { itemId: 'culvert-trace', count: 1, chance: 0.2 }, { itemId: 'basin-eel', count: 1, chance: 0.15 }], containment: { containmentClass: 'safe', procedures: 'Starve it of light, then seal it in an opaque cell.', loot: [{ itemId: 'culvert-trace', count: 2, chance: 1 }] } }),
  beast({ id: 'furrow-eel', name: 'Furrow Eel', examine: 'A land eel that swims through irrigated soil and spits it at whatever is standing on its field.', model: 'siltEel', level: 9, style: 'ranged', range: 4, projectile: 'dart', aggressive: true, loot: [{ itemId: 'basin-eel', count: 1, chance: 0.6 }, { itemId: 'silt-iron', count: 1, chance: 0.2 }, { itemId: 'eelskin-hood', count: 1, chance: 0.01 }] }),
  beast({ id: 'ditch-leech', name: 'Ditch Leech', designation: 'ORC-052', examine: 'A leech as long as your arm that lives in the irrigation ditches. It drinks the Orchard seed out of the water, and then out of you.', model: 'siltEel', level: 10, aggressive: true, loot: [{ itemId: 'basin-eel', count: 1, chance: 0.5 }, { itemId: 'silt-iron', count: 1, chance: 0.3 }, { itemId: 'culvert-trace', count: 1, chance: 0.15 }], containment: { containmentClass: 'safe', requiredLevel: 8, procedures: 'Salt the ditch around it, then lift it out in a sealed jar. Do not let it touch skin.', loot: [{ itemId: 'culvert-trace', count: 2, chance: 1 }] } }),
  beast({ id: 'crop-magpie', name: 'Crop Magpie', examine: 'A magpie with a nest of stolen seed packets and tags. It throws the tags.', model: 'scrapMagpie', level: 8, style: 'ranged', range: 4, projectile: 'dart', loot: [{ itemId: 'trace-dust', count: 1, chance: 0.4 }, { itemId: 'scrap-metal', count: 1, chance: 0.3 }, { itemId: 'reed-bundle', count: 1, chance: 0.2 }] }),
  beast({ id: 'seed-mite', name: 'Seed Mite', designation: 'ORC-031', examine: 'A mite grown from an Orchard seed. It sprouts where it bites.', model: 'gutterMite', level: 12, aggressive: true, loot: [{ itemId: 'culvert-trace', count: 1, chance: 0.3 }, { itemId: 'silt-iron', count: 1, chance: 0.2 }, { itemId: 'reed-bundle', count: 1, chance: 0.2 }] }),
  beast({ id: 'scarecoat', name: 'Scarecoat', designation: 'ORC-007', examine: 'A field coat on a cross of sticks that walks the rows at night. Nobody is wearing it, and it would like you to.', model: 'lineMimic', level: 13, style: 'psionic', range: 3, projectile: 'pulse', guard: 'warden', loot: [{ itemId: 'rag-bundle', count: 1, chance: 0.8 }, { itemId: 'culvert-trace', count: 1, chance: 0.3 }], containment: { containmentClass: 'euclid', requiredLevel: 10, procedures: 'Wear it down, then seal it in a garment bag. Do not put it on.', loot: [{ itemId: 'culvert-trace', count: 3, chance: 1 }] } }),
  beast({ id: 'thornback', name: 'Thornback', examine: 'A hound that slept in an Orchard bed and woke up with a hide of thorns.', model: 'strayDog', level: 17, aggressive: true, guard: 'bulwark', loot: [{ itemId: 'silt-iron', count: 1, chance: 0.3 }, { itemId: 'copper-wire', count: 1, chance: 0.2 }, { itemId: 'reed-bundle', count: 1, chance: 0.3 }, { itemId: 'thornback-hide', count: 1, chance: 0.01 }] }),
  beast({ id: 'windpump-wight', name: 'Windpump Wight', designation: 'ORC-019', examine: 'A tall figure of sacking and vane blades that turns to face the wind, and then you. The terrace pumps have not run since it moved in.', model: 'lineMimic', level: 18, style: 'psionic', range: 3, projectile: 'pulse', aggressive: false, guard: 'warden', loot: [{ itemId: 'reed-bundle', count: 1, chance: 0.4 }, { itemId: 'culvert-trace', count: 1, chance: 0.4 }, { itemId: 'ballistic-cloth', count: 1, chance: 0.08 }], containment: { containmentClass: 'euclid', requiredLevel: 16, procedures: 'Wait for still air. Weaken it while it cannot turn, then seal it in a windless cell.', loot: [{ itemId: 'culvert-trace', count: 4, chance: 1 }] } }),
  beast({ id: 'barn-crawler', name: 'Barn Crawler', examine: 'A tractor bonnet on six harrow-tine legs. It nests in the tithe barns and eats anything left out overnight, including the barn.', model: 'scrapCrawler', level: 19, aggressive: true, guard: 'bulwark', loot: [{ itemId: 'scrap-metal', count: 1, chance: 0.6 }, { itemId: 'silt-iron', count: 1, chance: 0.4 }, { itemId: 'copper-wire', count: 1, chance: 0.3 }, { itemId: 'brass-fittings', count: 1, chance: 0.15 }] }),
  {
    ...beast({ id: 'orchard-keeper', name: 'The Orchard Keeper', designation: 'ORC-001', examine: 'The thing Site Orchard was built to hold: tall, wet with sap, with a lamp where its hand should be. It tends the rows. It has decided you are a weed.', model: 'lamplighter', level: 19, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, wander: 2, loot: [{ itemId: 'culvert-trace', count: 3, chance: 1 }, { itemId: 'reed-bundle', count: 3, chance: 1 }, { itemId: 'ferro-plating', count: 1, chance: 0.5 }, { itemId: 'lamplighter-lantern', count: 1, chance: 0.1 }, { itemId: 'keeper-roots', count: 1, chance: 0.04 }], containment: { containmentClass: 'euclid', requiredLevel: 15, procedures: 'Weaken it in the open, away from the rows. Seal it in a dry cell. Do not water it.', loot: [{ itemId: 'culvert-trace', count: 4, chance: 1 }] } }),
    integrity: 115,
    experience: encounterExperience(19, 115),
    respawnTicks: 300,
    encounter: {
      mechanics: [
        { kind: 'telegraph', id: 'root-snare', shape: 'circleOnTarget', reach: 1, windupTicks: 5, cooldownTicks: 18, style: 'psionic', accuracy: 16, maxHit: 11 },
        { kind: 'summon', id: 'seedfall', creatureId: 'seed-mite', count: 2, everyTicks: 40, maxAlive: 3 },
      ],
      phases: [{ belowIntegrity: 0.5, announce: 'The Keeper plants its lamp. The rows begin to move.', enables: ['seedfall'] }],
    },
  },
  beast({ id: 'neon-moth', name: 'Neon Moth', designation: 'GLG-044', examine: 'A plate-sized moth with a lit sign for a body. It drinks advertising. Halcyon breeds a thousand a night.', model: 'mothLantern', level: 21, style: 'ranged', range: 4, projectile: 'dart', guard: 'warden', loot: [{ itemId: 'amber-trace', count: 1, chance: 0.4 }, { itemId: 'lab-culture', count: 1, chance: 0.3 }, { itemId: 'moth-wing-cloak', count: 1, chance: 0.01 }], containment: { containmentClass: 'safe', procedures: 'Lure it away from signage. Seal it in a dark jar.', loot: [{ itemId: 'amber-trace', count: 2, chance: 1 }] } }),
  beast({ id: 'alley-crawler', name: 'Alley Crawler', examine: 'A car door on six exhaust legs. The undercity grows them out of whatever gets left in the alleys.', model: 'scrapCrawler', level: 22, aggressive: true, loot: [{ itemId: 'scrap-metal', count: 1, chance: 0.8 }, { itemId: 'heavy-scrap', count: 1, chance: 0.3 }, { itemId: 'brass-fittings', count: 1, chance: 0.2 }, { itemId: 'crawler-shell', count: 1, chance: 0.01 }] }),
  beast({ id: 'holo-shill', name: 'Holo-shill', designation: 'GLG-061', examine: 'A projected salesman that slipped its emitter. It follows you down the street with an offer, and the offer hurts.', model: 'vaultEcho', level: 24, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, loot: [{ itemId: 'lab-culture', count: 1, chance: 0.4 }, { itemId: 'amber-trace', count: 1, chance: 0.3 }, { itemId: 'brass-fittings', count: 1, chance: 0.2 }] }),
  beast({ id: 'ad-wraith', name: 'Ad-wraith', designation: 'GLG-019', examine: 'A faded person-shaped advert that walked out of a billboard. It is still trying to sell you something.', model: 'vaultEcho', level: 26, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, loot: [{ itemId: 'amber-trace', count: 1, chance: 0.5 }, { itemId: 'lab-culture', count: 1, chance: 0.2 }, { itemId: 'brass-fittings', count: 1, chance: 0.2 }, { itemId: 'adwraith-veil', count: 1, chance: 0.01 }] }),
  beast({ id: 'vent-moth', name: 'Vent Moth', designation: 'GLG-047', examine: 'A neon moth that took to the arcology vents and grew fat on the warm air. Its wings shed hot grit.', model: 'mothLantern', level: 25, style: 'ranged', range: 4, projectile: 'dart', aggressive: true, guard: 'warden', loot: [{ itemId: 'amber-trace', count: 1, chance: 0.5 }, { itemId: 'lab-culture', count: 1, chance: 0.3 }, { itemId: 'synth-weave', count: 1, chance: 0.05 }], containment: { containmentClass: 'safe', requiredLevel: 20, procedures: 'Shut the vent behind it. Let it cool, then jar it while it is sluggish.', loot: [{ itemId: 'amber-trace', count: 3, chance: 1 }] } }),
  beast({ id: 'glass-hound', name: 'Glass Hound', designation: 'GLG-002', examine: 'A dog made of glass with an amber light where its heart should be. The Gallowglass breach let the whole kennel out.', model: 'glassHound', level: 28, style: 'psionic', range: 3, projectile: 'pulse', aggressive: true, guard: 'skirmisher', loot: [{ itemId: 'amber-trace', count: 1, chance: 0.5 }, { itemId: 'plasteel-plating', count: 1, chance: 0.15 }, { itemId: 'glass-eye', count: 1, chance: 0.01 }], containment: { containmentClass: 'euclid', requiredLevel: 15, procedures: 'Exhaust it. Seal it in a padded crate; it shatters if it panics.', loot: [{ itemId: 'amber-trace', count: 3, chance: 1 }, { itemId: 'glass-eye', count: 1, chance: 0.02 }] } }),
  {
    ...beast({ id: 'mr-brightly', name: 'Mr Brightly', designation: 'GLG-001', examine: 'Two pale smiling figures sharing one suit, the face of every Aurelian Combine advert for thirty years. Gallowglass held it. Now it holds Gallowglass.', model: 'redTwin', level: 29, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, wander: 2, loot: [{ itemId: 'amber-trace', count: 2, chance: 1 }, { itemId: 'brass-fittings', count: 2, chance: 1 }, { itemId: 'plasteel-plating', count: 1, chance: 0.5 }, { itemId: 'brightly-grin', count: 1, chance: 0.1 }, { itemId: 'spokesman-suit', count: 1, chance: 0.04 }], containment: { containmentClass: 'keter', requiredLevel: 25, procedures: 'Cut every screen in the room first. Weaken both halves together, then seal the suit.', loot: [{ itemId: 'amber-trace', count: 5, chance: 1 }] } }),
    integrity: 160,
    experience: encounterExperience(29, 160),
    respawnTicks: 360,
    encounter: {
      mechanics: [
        { kind: 'telegraph', id: 'jingle', shape: 'cone', reach: 4, windupTicks: 4, cooldownTicks: 16, style: 'psionic', accuracy: 20, maxHit: 12 },
        { kind: 'hazard', id: 'static', hazard: 'static', seedTiles: 3, spreadEveryTicks: 8, damagePerTick: 2, maxTiles: 24 },
        { kind: 'summon', id: 'focus-group', creatureId: 'ad-wraith', count: 2, maxAlive: 2 },
      ],
      phases: [{ belowIntegrity: 0.6, announce: 'Mr Brightly smiles wider. Every screen in the undercity changes to his face.', enables: ['static'] }, { belowIntegrity: 0.3, announce: 'Mr Brightly calls a focus group.', enables: ['focus-group'] }],
    },
  },
  beast({ id: 'rustling', name: 'Rustling', designation: 'TAL-060', examine: 'A walking heap of hull scrap that throws bits of itself. The Wreckfield is full of them, and the scavengers say they used to be the ship.', model: 'rustling', level: 31, style: 'ranged', range: 4, projectile: 'pellets', aggressive: true, guard: 'bulwark', loot: [{ itemId: 'scrap-plating', count: 1, chance: 0.6 }, { itemId: 'hull-plate', count: 1, chance: 0.3 }, { itemId: 'bearing-steel', count: 1, chance: 0.15 }, { itemId: 'rustling-core', count: 1, chance: 0.01 }], containment: { containmentClass: 'euclid', requiredLevel: 25, procedures: 'Knock it down to its core and seal the core. The scrap may be left where it falls.', loot: [{ itemId: 'hull-plate', count: 2, chance: 1 }, { itemId: 'rustling-core', count: 1, chance: 0.02 }] } }),
  beast({ id: 'ballast-crab', name: 'Ballast Crab', examine: 'A hull knocker’s smaller cousin that lives in the flooded ballast tanks. It walks sideways out of them, very fast, with a lot of the tank still attached.', model: 'hullKnocker', level: 30, aggressive: true, guard: 'skirmisher', loot: [{ itemId: 'hull-plate', count: 1, chance: 0.4 }, { itemId: 'tide-weed', count: 1, chance: 0.3 }, { itemId: 'bearing-steel', count: 1, chance: 0.2 }] }),
  beast({ id: 'hull-knocker', name: 'Hull Knocker', examine: 'A car-sized crab plated in the Meridian’s own hull. It knocks on the wreck all night, from the inside.', model: 'hullKnocker', level: 33, aggressive: true, guard: 'bulwark', loot: [{ itemId: 'hull-plate', count: 1, chance: 0.5 }, { itemId: 'heavy-scrap', count: 1, chance: 0.4 }, { itemId: 'duralloy-plating', count: 1, chance: 0.08 }, { itemId: 'knocker-fist', count: 1, chance: 0.01 }] }),
  beast({ id: 'misprint', name: 'Misprint', designation: 'KST-000-M', examine: 'A Directorate field uniform standing up on its own, collar buttoned over nothing. The name tape is yours.', model: 'lineMimic', level: 35, style: 'melee', aggressive: true, loot: [{ itemId: 'rag-bundle', count: 1, chance: 0.5 }, { itemId: 'hull-trace', count: 1, chance: 0.2 }, { itemId: 'misprint-tape', count: 1, chance: 0.01 }] }),
  beast({ id: 'bilge-wraith', name: 'Bilge Wraith', designation: 'TAL-033', examine: 'A figure of weed and bilge water that walks out of the Meridian’s flooded decks. It was crew once.', model: 'tideWraith', level: 37, style: 'ranged', range: 5, projectile: 'bolt', aggressive: true, guard: 'warden', loot: [{ itemId: 'tide-weed', count: 1, chance: 0.6 }, { itemId: 'hull-trace', count: 1, chance: 0.4 }, { itemId: 'wraith-shroud', count: 1, chance: 0.01 }], containment: { containmentClass: 'euclid', requiredLevel: 25, procedures: 'Drive it out of standing water before you weaken it. Seal it dry.', loot: [{ itemId: 'hull-trace', count: 3, chance: 1 }, { itemId: 'wraith-shroud', count: 1, chance: 0.02 }] } }),
  {
    ...beast({ id: 'the-cohort', name: 'The Cohort', designation: 'TAL-001', examine: 'Thirty-one Directorate operatives fused into one shape the size of a door, still in step, still saluting. Intake Cohort 41. Your cohort.', model: 'cellBreaker', level: 39, aggressive: true, guard: 'bulwark', wander: 2, loot: [{ itemId: 'hull-rivets', count: 2, chance: 1 }, { itemId: 'tide-weed', count: 2, chance: 1 }, { itemId: 'duralloy-plating', count: 1, chance: 0.4 }, { itemId: 'cohort-colours', count: 1, chance: 0.1 }, { itemId: 'parade-gauntlets', count: 1, chance: 0.04 }] }),
    size: 2,
    integrity: 220,
    experience: encounterExperience(39, 220),
    respawnTicks: 420,
    encounter: {
      mechanics: [
        { kind: 'telegraph', id: 'parade-slam', shape: 'body', reach: 1, windupTicks: 5, cooldownTicks: 14, style: 'melee', accuracy: 30, maxHit: 16 },
        { kind: 'telegraph', id: 'march', shape: 'line', reach: 6, windupTicks: 4, cooldownTicks: 20, style: 'melee', accuracy: 30, maxHit: 14 },
        { kind: 'summon', id: 'roll-call', creatureId: 'misprint', count: 2, everyTicks: 50, maxAlive: 4 },
        { kind: 'enrage', id: 'double-time', afterTicks: 200, speedFactor: 1.5 },
      ],
      phases: [
        { belowIntegrity: 0.5, announce: 'The Cohort calls the roll. Uniforms answer.', enables: ['roll-call'] },
        { belowIntegrity: 0.25, announce: 'The Cohort breaks ranks and comes at you as a skirmish line.', guard: 'skirmisher', enables: [] },
      ],
    },
  },
  beast({ id: 'prism-hound', name: 'Prism Hound', examine: 'A glass hound grown wild on the Steppe. The light through it comes out the wrong colour.', model: 'glassHound', level: 41, style: 'psionic', range: 3, projectile: 'pulse', aggressive: true, guard: 'skirmisher', loot: [{ itemId: 'red-trace', count: 1, chance: 0.5 }, { itemId: 'red-moss', count: 1, chance: 0.2 }, { itemId: 'prism-collar', count: 1, chance: 0.01 }] }),
  beast({ id: 'glass-stalker', name: 'Glass Stalker', examine: 'A tall thing on scaffold-pole legs that walks the pylon lines. It stops when you look at it.', model: 'cordonStalker', level: 42, style: 'ranged', range: 5, projectile: 'tracer', aggressive: true, guard: 'skirmisher', loot: [{ itemId: 'red-trace', count: 1, chance: 0.4 }, { itemId: 'directorate-salvage', count: 1, chance: 0.3 }, { itemId: 'stalker-treads', count: 1, chance: 0.01 }], containment: { containmentClass: 'euclid', requiredLevel: 38, procedures: 'Keep your eyes on it the whole time. It cannot move while watched, so one operative stares while another seals it.', loot: [{ itemId: 'red-trace', count: 3, chance: 1 }, { itemId: 'stalker-treads', count: 1, chance: 0.02 }] } }),
  beast({ id: 'shard-wisp', name: 'Shard Wisp', designation: 'VSP-044', examine: 'A wisp that fell into the steppe glass and came out in pieces. Each piece still thinks it is the whole.', model: 'crateWisp', level: 44, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, loot: [{ itemId: 'red-trace', count: 1, chance: 0.5 }, { itemId: 'red-moss', count: 1, chance: 0.3 }, { itemId: 'cell-mesh', count: 1, chance: 0.05 }], containment: { containmentClass: 'euclid', requiredLevel: 40, procedures: 'Gather every shard into one jar before you seal it. A shard left behind grows back into a wisp.', loot: [{ itemId: 'red-trace', count: 4, chance: 1 }] } }),
  beast({ id: 'red-twin', name: 'Red Twin', designation: 'VSP-012', examine: 'Two pale figures joined at the shoulder, humming the Choir’s hymn half a beat apart.', model: 'redTwin', level: 46, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, loot: [{ itemId: 'red-trace', count: 1, chance: 0.5 }, { itemId: 'directorate-salvage', count: 1, chance: 0.3 }, { itemId: 'twin-mask', count: 1, chance: 0.01 }], containment: { containmentClass: 'keter', requiredLevel: 35, procedures: 'Separate them by sound: sing over the hymn. Seal each half in its own cell.', loot: [{ itemId: 'red-trace', count: 3, chance: 1 }, { itemId: 'twin-mask', count: 1, chance: 0.02 }] } }),
  beast({ id: 'choir-echo', name: 'Choir Echo', examine: 'A faded singer from Site Vesper’s last shift, still holding the note they were holding when it went quiet.', model: 'vaultEcho', level: 47, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, guard: 'warden', loot: [{ itemId: 'red-trace', count: 1, chance: 0.4 }, { itemId: 'directorate-salvage', count: 1, chance: 0.3 }, { itemId: 'echo-band', count: 1, chance: 0.01 }] }),
  {
    ...beast({ id: 'the-precentor', name: 'The Precentor', designation: 'VSP-001', examine: 'The Choir’s first singer, grown tall and thin in the dark of the Vesper nave, holding a lamp that sings. It leads the hymn that put Vesper to sleep.', model: 'lamplighter', level: 49, style: 'psionic', range: 5, projectile: 'pulse', aggressive: true, wander: 2, loot: [{ itemId: 'red-trace', count: 2, chance: 1 }, { itemId: 'red-moss', count: 2, chance: 1 }, { itemId: 'cell-mesh', count: 1, chance: 0.5 }, { itemId: 'precentor-lamp', count: 1, chance: 0.1 }, { itemId: 'cantor-cowl', count: 1, chance: 0.04 }], containment: { containmentClass: 'keter', requiredLevel: 45, procedures: 'Break the hymn: no two operatives may strike in time. Seal it in silence.', loot: [{ itemId: 'red-trace', count: 6, chance: 1 }] } }),
    size: 2,
    integrity: 260,
    experience: encounterExperience(49, 260),
    respawnTicks: 480,
    encounter: {
      mechanics: [
        { kind: 'telegraph', id: 'cantus', shape: 'ring', reach: 2, windupTicks: 5, cooldownTicks: 16, style: 'psionic', accuracy: 36, maxHit: 18 },
        { kind: 'telegraph', id: 'descant', shape: 'circleOnTarget', reach: 1, windupTicks: 4, cooldownTicks: 12, style: 'psionic', accuracy: 36, maxHit: 15 },
        { kind: 'summon', id: 'chorus', creatureId: 'choir-echo', count: 2, everyTicks: 60, maxAlive: 3 },
      ],
      phases: [
        { belowIntegrity: 0.5, announce: 'The Precentor raises the lamp. The chorus answers from the dark.', enables: ['chorus'] },
        { belowIntegrity: 0.33, announce: 'The Precentor stops singing and throws the note instead.', attack: { style: 'ranged', accuracy: 58, maxHit: 13, range: 5, speedTicks: 4, projectile: 'bolt' }, enables: [] },
      ],
    },
  },
  rimward(beast({ id: 'null-echo', defence: 66, accuracy: 72, name: 'Null Echo', examine: 'A faded silhouette of someone who worked in Site Null. It walks the outside of the cells, checking on you.', model: 'vaultEcho', level: 52, style: 'psionic', range: 4, projectile: 'pulse', aggressive: true, guard: 'warden', loot: [{ itemId: 'vault-residue', count: 1, chance: 0.5 }, { itemId: 'vault-trace', count: 1, chance: 0.3 }] }), 1.35),
  rimward(beast({ id: 'cell-breaker', defence: 66, accuracy: 72, name: 'Cell-breaker', examine: 'A door with shoulders. It used to hold something in. Now it holds people out.', model: 'cellBreaker', level: 53, aggressive: true, guard: 'bulwark', loot: [{ itemId: 'directorate-salvage', count: 1, chance: 0.6 }, { itemId: 'vault-residue', count: 1, chance: 0.2 }, { itemId: 'sinter-plating', count: 1, chance: 0.1 }, { itemId: 'breaker-plate', count: 1, chance: 0.01 }] }), 1.35),
  rimward(beast({ id: 'coolant-wraith', defence: 66, accuracy: 72, name: 'Coolant Wraith', designation: 'NUL-054', examine: 'A figure of blue coolant that stands up out of the Spindle’s cooling channels. It is very cold and it has opinions about leaks.', model: 'tideWraith', level: 54, style: 'ranged', range: 5, projectile: 'bolt', aggressive: true, guard: 'warden', loot: [{ itemId: 'vault-residue', count: 1, chance: 0.5 }, { itemId: 'vault-bloom', count: 1, chance: 0.2 }, { itemId: 'tide-polymer', count: 1, chance: 0.1 }], containment: { containmentClass: 'keter', requiredLevel: 48, procedures: 'Drain the channel it rose from. Weaken it before it finds another, then seal it in a dry cryo cell.', loot: [{ itemId: 'vault-residue', count: 4, chance: 1 }] } }), 1.35),
  rimward(beast({ id: 'null-stalker', defence: 66, accuracy: 72, name: 'Null Stalker', examine: 'A stalker in Directorate white, walking its rounds of the Spindle with a clipboard where its head should be.', model: 'cordonStalker', level: 56, style: 'ranged', range: 5, projectile: 'tracer', aggressive: true, guard: 'skirmisher', loot: [{ itemId: 'vault-residue', count: 1, chance: 0.4 }, { itemId: 'vault-trace', count: 1, chance: 0.3 }, { itemId: 'vault-bloom', count: 1, chance: 0.2 }, { itemId: 'null-clipboard', count: 1, chance: 0.01 }], containment: { containmentClass: 'keter', requiredLevel: 52, procedures: 'Sign its clipboard. While it files the form, seal it in a cell with no door.', loot: [{ itemId: 'vault-trace', count: 4, chance: 1 }, { itemId: 'null-clipboard', count: 1, chance: 0.02 }] } }), 1.35),
  rimward(beast({ id: 'clerk-of-null', defence: 68, accuracy: 74, name: 'Clerk of Null', designation: 'NUL-057', examine: 'A Directorate uniform with a rubber stamp for a hand, walking a corridor that is not there. Everything it stamps is filed under breach.', model: 'lineMimic', level: 57, style: 'psionic', range: 4, projectile: 'pulse', aggressive: false, guard: 'warden', loot: [{ itemId: 'vault-trace', count: 1, chance: 0.4 }, { itemId: 'directorate-salvage', count: 1, chance: 0.4 }, { itemId: 'sinter-plating', count: 1, chance: 0.1 }], containment: { containmentClass: 'euclid', requiredLevel: 52, procedures: 'Hand it a form in triplicate. Seal it while it reads.', loot: [{ itemId: 'vault-trace', count: 3, chance: 1 }] } }), 1.35),
  {
    ...beast({ id: 'warden-of-null', name: 'The Warden of Null', designation: 'NUL-000', examine: 'A figure plated in dark precursor glass, holding a key the size of your arm. It is the Span’s own containment officer, and it has filed you under breach.', model: 'warden', level: 58, style: 'psionic', range: 5, projectile: 'pulse', aggressive: true, wander: 1, loot: [{ itemId: 'vault-residue', count: 2, chance: 1 }, { itemId: 'vault-trace', count: 2, chance: 1 }, { itemId: 'wardens-key', count: 1, chance: 0.05 }, { itemId: 'review-ledger', count: 1, chance: 0.1 }], containment: { containmentClass: 'keter', requiredLevel: 50, procedures: 'There are no procedures. It wrote them.', loot: [{ itemId: 'vault-trace', count: 6, chance: 1 }] } }),
    size: 2,
    integrity: 320,
    experience: encounterExperience(58, 320),
    respawnTicks: 600,
    encounter: {
      mechanics: [
        { kind: 'telegraph', id: 'lockdown', shape: 'ring', reach: 2, windupTicks: 5, cooldownTicks: 16, style: 'psionic', accuracy: 44, maxHit: 26 },
        { kind: 'telegraph', id: 'sentence', shape: 'line', reach: 7, windupTicks: 4, cooldownTicks: 14, style: 'psionic', accuracy: 44, maxHit: 24 },
        { kind: 'hazard', id: 'coolant-flood', hazard: 'coolant', seedTiles: 4, spreadEveryTicks: 6, damagePerTick: 4, maxTiles: 30 },
        { kind: 'summon', id: 'staff', creatureId: 'null-echo', count: 2, everyTicks: 60, maxAlive: 3 },
        { kind: 'enrage', id: 'final-review', afterTicks: 240, speedFactor: 1.5 },
      ],
      phases: [
        { belowIntegrity: 0.66, announce: 'The Warden of Null floods the cell block.', enables: ['coolant-flood'] },
        { belowIntegrity: 0.33, announce: 'The Warden calls its staff to the review.', enables: ['staff'] },
      ],
    },
  },
  elite({ id: 'drill-master', name: 'The Drill Master', designation: 'KST-300', examine: 'The prototype every training drone was copied from. It has run the same exercise in Roster Holding since the night the cohort went missing, and it is still waiting for them to fall in.', model: 'trainingDrone', level: 7, style: 'ranged', range: 4, projectile: 'dart', wander: 1, loot: [{ itemId: 'scrap-metal', count: 4, chance: 1 }, { itemId: 'copper-wire', count: 3, chance: 1 }, { itemId: 'trace-dust', count: 3, chance: 1 }, { itemId: 'drill-masters-cap', count: 1, chance: 0.02 }] }, 1500, {
    mechanics: [
      { kind: 'telegraph', id: 'live-fire', shape: 'line', reach: 4, windupTicks: 3, cooldownTicks: 14, style: 'ranged', accuracy: 6, maxHit: 6 },
      { kind: 'summon', id: 'muster', creatureId: 'drill-sentry', count: 2, everyTicks: 40, maxAlive: 2 },
    ],
    phases: [{ belowIntegrity: 0.5, announce: 'The Drill Master calls the range to order. Sentries fall in.', enables: ['muster'] }],
  }),
  elite({ id: 'thornback-matriarch', name: 'Thornback Matriarch', designation: 'ORC-017', examine: 'The first thornback, grown huge in the dark of the seed vault. Every thornback on the terraces is one of her litters.', model: 'strayDog', level: 19, aggressive: true, guard: 'bulwark', wander: 1, loot: [{ itemId: 'silt-iron', count: 3, chance: 1 }, { itemId: 'reed-bundle', count: 3, chance: 1 }, { itemId: 'ferro-plating', count: 2, chance: 1 }, { itemId: 'thornhide-mantle', count: 1, chance: 0.02 }] }, 1800, {
    mechanics: [
      { kind: 'telegraph', id: 'thorn-burst', shape: 'body', reach: 1, windupTicks: 4, cooldownTicks: 16, style: 'melee', accuracy: 15, maxHit: 14 },
      { kind: 'summon', id: 'litter', creatureId: 'thornback', count: 2, everyTicks: 50, maxAlive: 2 },
    ],
    phases: [{ belowIntegrity: 0.5, announce: 'The Matriarch howls. Her litter answers from the rows.', enables: ['litter'] }],
  }),
  elite({ id: 'chrome-crawler', name: 'The Chrome Crawler', designation: 'GLG-022', examine: 'An alley crawler grown out of a Combine limousine, chrome and all. It leaks burning fuel when it is angry, which is always.', model: 'scrapCrawler', level: 29, aggressive: true, guard: 'skirmisher', wander: 1, loot: [{ itemId: 'heavy-scrap', count: 3, chance: 1 }, { itemId: 'brass-fittings', count: 3, chance: 1 }, { itemId: 'plasteel-plating', count: 1, chance: 1 }, { itemId: 'chrome-greaves', count: 1, chance: 0.02 }] }, 2000, {
    mechanics: [
      { kind: 'telegraph', id: 'exhaust', shape: 'cone', reach: 3, windupTicks: 3, cooldownTicks: 14, style: 'melee', accuracy: 22, maxHit: 16 },
      { kind: 'hazard', id: 'burning-fuel', hazard: 'fire', seedTiles: 2, spreadEveryTicks: 8, damagePerTick: 2, maxTiles: 16 },
    ],
    phases: [
      { belowIntegrity: 0.5, announce: 'The Chrome Crawler ruptures its tank. The floor catches.', enables: ['burning-fuel'] },
      { belowIntegrity: 0.25, announce: 'The Chrome Crawler slams its doors shut and braces.', guard: 'bulwark', enables: [] },
    ],
  }),
  elite({ id: 'the-bosun', name: 'The Bosun', designation: 'TAL-038', examine: 'The rustling that was the Meridian’s bosun. It still pipes the crew to stations, and the scrap still comes.', model: 'rustling', level: 38, style: 'ranged', range: 4, projectile: 'pellets', aggressive: true, guard: 'bulwark', wander: 1, loot: [{ itemId: 'hull-plate', count: 3, chance: 1 }, { itemId: 'hull-rivets', count: 2, chance: 1 }, { itemId: 'duralloy-plating', count: 1, chance: 1 }, { itemId: 'bosuns-call', count: 1, chance: 0.02 }] }, 2400, {
    mechanics: [
      { kind: 'telegraph', id: 'broadside', shape: 'line', reach: 5, windupTicks: 3, cooldownTicks: 14, style: 'ranged', accuracy: 29, maxHit: 20 },
      { kind: 'hazard', id: 'brine', hazard: 'salt', seedTiles: 3, spreadEveryTicks: 8, damagePerTick: 3, maxTiles: 18 },
      { kind: 'summon', id: 'all-hands', creatureId: 'ballast-crab', count: 2, everyTicks: 50, maxAlive: 2 },
    ],
    phases: [
      { belowIntegrity: 0.66, announce: 'The Bosun opens the bilge. Brine floods the cell.', enables: ['brine'] },
      { belowIntegrity: 0.33, announce: 'The Bosun pipes all hands and sheds its plating.', guard: 'skirmisher', enables: ['all-hands'] },
    ],
  }),
  elite({ id: 'prism-alpha', name: 'Prism Alpha', designation: 'VSP-041', examine: 'The hound the Vesper choir kept as a lamp. Light through it splits into a pack.', model: 'glassHound', level: 48, style: 'psionic', range: 3, projectile: 'pulse', aggressive: true, guard: 'skirmisher', wander: 1, loot: [{ itemId: 'red-trace', count: 3, chance: 1 }, { itemId: 'cell-mesh', count: 2, chance: 1 }, { itemId: 'red-mesh', count: 1, chance: 1 }, { itemId: 'prism-lens', count: 1, chance: 0.02 }] }, 2600, {
    mechanics: [
      { kind: 'telegraph', id: 'refraction', shape: 'cone', reach: 4, windupTicks: 3, cooldownTicks: 14, style: 'psionic', accuracy: 36, maxHit: 22 },
      { kind: 'summon', id: 'pack', creatureId: 'prism-hound', count: 2, everyTicks: 50, maxAlive: 2 },
    ],
    phases: [
      { belowIntegrity: 0.6, announce: 'Prism Alpha splits the light. The pack comes out of it.', enables: ['pack'] },
      { belowIntegrity: 0.3, announce: 'Prism Alpha focuses its light into a tracer.', attack: { style: 'ranged', accuracy: 60, maxHit: 13, range: 5, speedTicks: 4, projectile: 'tracer' }, enables: [] },
    ],
  }),
  elite({ id: 'null-auditor', name: 'The Null Auditor', designation: 'NUL-057-A', examine: 'A stalker in Directorate white with a ledger for a head, auditing The Outside. Its findings are always against you.', model: 'cordonStalker', level: 57, defence: 68, accuracy: 74, style: 'psionic', range: 5, projectile: 'pulse', aggressive: true, guard: 'warden', wander: 1, loot: [{ itemId: 'vault-trace', count: 3, chance: 1 }, { itemId: 'vault-bloom', count: 2, chance: 1 }, { itemId: 'vault-glass-plating', count: 1, chance: 1 }, { itemId: 'auditors-seal', count: 1, chance: 0.02 }] }, 3000, {
    mechanics: [
      { kind: 'telegraph', id: 'redaction', shape: 'line', reach: 6, windupTicks: 3, cooldownTicks: 14, style: 'psionic', accuracy: 45, maxHit: 28 },
      { kind: 'hazard', id: 'cold-storage', hazard: 'coolant', seedTiles: 3, spreadEveryTicks: 8, damagePerTick: 4, maxTiles: 18 },
      { kind: 'summon', id: 'audit-staff', creatureId: 'null-echo', count: 2, everyTicks: 60, maxAlive: 2 },
    ],
    phases: [
      { belowIntegrity: 0.66, announce: 'The Auditor files you under cold storage.', enables: ['cold-storage'] },
      { belowIntegrity: 0.33, announce: 'The Auditor calls its staff and reads the finding aloud.', attack: { style: 'ranged', accuracy: 74, maxHit: 15, range: 5, speedTicks: 4, projectile: 'tracer' }, enables: ['audit-staff'] },
    ],
  }),
];
