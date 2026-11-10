import type { SkillId } from '../character/skills.ts';
import type { CraftingStation, RecipeDefinition, RecipeIngredient } from '../crafting/recipes.ts';

const STATION_SKILLS: Readonly<Record<CraftingStation, SkillId>> = {
  refinery: 'refining',
  fabricator: 'engineering',
  synthesiser: 'biochemistry',
};

const recipe = (
  station: CraftingStation,
  output: string,
  level: number,
  inputs: Readonly<Record<string, number>>,
  options: { readonly experience: number; readonly ticks?: number; readonly count?: number },
): RecipeDefinition => ({
  id: `${station}:${output}`,
  station,
  skill: STATION_SKILLS[station],
  level,
  inputs: Object.entries(inputs).map(([itemId, count]): RecipeIngredient => ({ itemId, count })),
  output: { itemId: output, count: options.count ?? 1 },
  experience: options.experience,
  ticks: options.ticks ?? 4,
});

export const REFINING_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'alloy-plate', 1, { 'scrap-alloy': 2 }, { experience: 12 }),
  recipe('refinery', 'synthweave-bolt', 1, { 'synthweave-offcut': 2 }, { experience: 12 }),
  recipe('refinery', 'gel-base', 1, { 'gloam-moss': 2 }, { experience: 12 }),
  recipe('refinery', 'polymer-sheet', 3, { 'polymer-resin': 2 }, { experience: 20 }),
  recipe('refinery', 'braided-cord', 4, { 'vine-fibre': 2 }, { experience: 26 }),
  recipe('refinery', 'wiring-loom', 5, { 'conductive-filament': 2 }, { experience: 30 }),
  recipe('refinery', 'chitin-laminate', 6, { 'gloam-chitin': 2 }, { experience: 34 }),
  recipe('refinery', 'lumen-extract', 6, { 'lumen-spores': 2 }, { experience: 34 }),
  recipe('refinery', 'charged-cell', 9, { 'static-residue': 2, 'alloy-plate': 1 }, { experience: 52 }),
  recipe('refinery', 'hardened-steel', 10, { 'ferrous-slag': 2 }, { experience: 58 }),
  recipe('refinery', 'anticoagulant', 10, { 'leech-sac': 2 }, { experience: 58 }),
];

export const MEDICAL_RECIPES: readonly RecipeDefinition[] = [
  recipe('synthesiser', 'medgel', 1, { 'gel-base': 1 }, { experience: 15 }),
  recipe('synthesiser', 'sap-poultice', 5, { 'gel-base': 1, 'vine-fibre': 1 }, { experience: 28 }),
  recipe('synthesiser', 'trauma-foam', 6, { 'gel-base': 1, 'lumen-extract': 1 }, { experience: 40 }),
  recipe('synthesiser', 'clotting-shot', 10, { anticoagulant: 1, 'lumen-extract': 1 }, { experience: 70 }),
];

export const FABRICATION_RECIPES: readonly RecipeDefinition[] = [
  recipe('fabricator', 'intake-jumpsuit', 1, { 'synthweave-bolt': 2 }, { experience: 20, ticks: 5 }),
  recipe('fabricator', 'intake-trousers', 1, { 'synthweave-bolt': 2 }, { experience: 20, ticks: 5 }),
  recipe('fabricator', 'work-boots', 1, { 'synthweave-bolt': 1, 'alloy-plate': 1 }, { experience: 20, ticks: 5 }),
  recipe('fabricator', 'operative-badge', 1, { 'alloy-plate': 1 }, { experience: 12 }),
  recipe('fabricator', 'stun-baton', 1, { 'alloy-plate': 2, 'synthweave-bolt': 1 }, { experience: 30, ticks: 5 }),
  recipe('fabricator', 'utility-knife', 1, { 'alloy-plate': 1, 'synthweave-bolt': 1 }, { experience: 24, ticks: 5 }),
  recipe('fabricator', 'lab-coat', 2, { 'synthweave-bolt': 3 }, { experience: 32, ticks: 5 }),
  recipe('fabricator', 'dart-pistol', 2, { 'alloy-plate': 2, 'polymer-sheet': 1 }, { experience: 36, ticks: 5 }),
  recipe('fabricator', 'containment-gloves', 3, { 'synthweave-bolt': 1, 'polymer-sheet': 1 }, { experience: 40, ticks: 5 }),
  recipe('fabricator', 'hazard-visor', 3, { 'polymer-sheet': 2 }, { experience: 40, ticks: 5 }),
  recipe('fabricator', 'field-vest-mk1', 4, { 'alloy-plate': 2, 'synthweave-bolt': 2 }, { experience: 50, ticks: 6 }),
  recipe('fabricator', 'thornweave-gloves', 5, { 'braided-cord': 2, 'thorn-cluster': 2 }, { experience: 60, ticks: 6 }),
  recipe('fabricator', 'research-datapad', 5, { 'polymer-sheet': 1, 'wiring-loom': 1 }, { experience: 60, ticks: 6 }),
  recipe('fabricator', 'kestrel-sidearm', 5, { 'alloy-plate': 3, 'wiring-loom': 1 }, { experience: 70, ticks: 6 }),
  recipe('fabricator', 'breaching-machete', 5, { 'alloy-plate': 3, 'braided-cord': 1 }, { experience: 66, ticks: 6 }),
  recipe('fabricator', 'field-scanner', 6, { 'polymer-sheet': 1, 'wiring-loom': 2 }, { experience: 80, ticks: 6 }),
  recipe('fabricator', 'response-helmet', 6, { 'chitin-laminate': 2, 'alloy-plate': 1 }, { experience: 85, ticks: 6 }),
  recipe('fabricator', 'filter-respirator', 8, { 'polymer-sheet': 2, 'hardened-steel': 1 }, { experience: 110, ticks: 7 }),
  recipe('fabricator', 'shock-maul', 8, { 'hardened-steel': 2, 'charged-cell': 1, 'hound-fang': 2 }, { experience: 140, ticks: 7 }),
  recipe('fabricator', 'riot-pike', 8, { 'hardened-steel': 2, 'braided-cord': 2 }, { experience: 135, ticks: 7 }),
  recipe('fabricator', 'riot-scattergun', 8, { 'hardened-steel': 2, 'polymer-sheet': 2, 'charged-cell': 1 }, { experience: 140, ticks: 7 }),
  recipe('fabricator', 'composite-plate', 9, { 'hardened-steel': 3, 'chitin-laminate': 2 }, { experience: 160, ticks: 7 }),
  recipe('fabricator', 'marksman-carbine', 10, { 'hardened-steel': 2, 'wiring-loom': 2, 'charged-cell': 1 }, { experience: 180, ticks: 7 }),
  recipe('fabricator', 'ward-lattice', 12, { 'charged-cell': 3, 'wiring-loom': 2 }, { experience: 240, ticks: 8 }),
];

export const DEEP_REFINING_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'rime-alloy', 12, { 'frost-crystal': 2, 'hardened-steel': 1 }, { experience: 80 }),
  recipe('refinery', 'cryo-compound', 13, { 'moth-dust': 1, 'cryo-gel': 1 }, { experience: 84 }),
  recipe('refinery', 'relay-weave', 16, { 'signal-copper': 2, 'wiring-loom': 1 }, { experience: 110 }),
  recipe('refinery', 'servo-core', 17, { 'sentinel-servo': 2 }, { experience: 116 }),
  recipe('refinery', 'echo-serum', 17, { 'echo-residue': 2 }, { experience: 116 }),
  recipe('refinery', 'vellum-weave', 20, { 'archival-vellum': 2 }, { experience: 150 }),
  recipe('refinery', 'ink-laminate', 21, { 'eel-hide': 2, 'black-ink': 1 }, { experience: 160 }),
  recipe('refinery', 'ink-essence', 22, { 'black-ink': 1, 'redaction-strip': 1 }, { experience: 168 }),
  recipe('refinery', 'furnace-steel', 25, { 'ember-ore': 2, 'hardened-steel': 1 }, { experience: 210 }),
  recipe('refinery', 'cinder-salt', 26, { 'cinder-mote': 2 }, { experience: 220 }),
  recipe('refinery', 'mirror-alloy', 30, { 'mirror-glass': 2, 'furnace-steel': 1 }, { experience: 290 }),
  recipe('refinery', 'hollow-weave', 31, { 'hollow-thread': 2 }, { experience: 300 }),
  recipe('refinery', 'seal-alloy', 35, { 'franking-wax': 2, 'mirror-alloy': 1 }, { experience: 380 }),
  recipe('refinery', 'letter-weave', 35, { 'dead-letter': 2, 'hollow-weave': 1 }, { experience: 380 }),
];

export const DEEP_MEDICAL_RECIPES: readonly RecipeDefinition[] = [
  recipe('synthesiser', 'rime-salve', 12, { 'gel-base': 1, 'cryo-compound': 1 }, { experience: 90 }),
  recipe('synthesiser', 'echo-stim', 16, { 'echo-serum': 1, 'lumen-extract': 1 }, { experience: 125 }),
  recipe('synthesiser', 'ink-tonic', 20, { 'ink-essence': 1, 'lumen-extract': 1 }, { experience: 170 }),
  recipe('synthesiser', 'cinder-draught', 25, { 'cinder-salt': 1, 'echo-serum': 1 }, { experience: 220 }),
  recipe('synthesiser', 'threshold-elixir', 30, { 'knock-splinter': 1, 'cinder-salt': 1 }, { experience: 300 }),
];

const fabricate = (output: string, level: number, inputs: Readonly<Record<string, number>>, experience: number): RecipeDefinition =>
  recipe('fabricator', output, level, inputs, { experience, ticks: 8 });

export const DEEP_FABRICATION_RECIPES: readonly RecipeDefinition[] = [
  fabricate('rimeguard-helm', 12, { 'rime-alloy': 2, 'chitin-laminate': 1 }, 180),
  fabricate('rimeguard-plate', 13, { 'rime-alloy': 4, 'polymer-sheet': 2 }, 260),
  fabricate('rimeguard-gauntlets', 12, { 'rime-alloy': 1, 'braided-cord': 2 }, 170),
  fabricate('rimeguard-greaves', 12, { 'rime-alloy': 2, 'synthweave-bolt': 2 }, 170),
  fabricate('rimeguard-boots', 12, { 'rime-alloy': 1, 'chitin-laminate': 1, 'synthweave-bolt': 1 }, 170),
  fabricate('cryo-maul', 14, { 'rime-alloy': 3, 'charged-cell': 1, 'hardened-steel': 1 }, 280),
  fabricate('rime-carbine', 14, { 'rime-alloy': 2, 'wiring-loom': 2, 'cryo-compound': 1 }, 280),
  fabricate('rime-shiv', 13, { 'rime-alloy': 2, 'cryo-compound': 1 }, 250),
  fabricate('frost-glaive', 14, { 'rime-alloy': 3, 'braided-cord': 2 }, 280),
  fabricate('stasis-implant', 15, { 'cryo-compound': 2, 'charged-cell': 2, 'wiring-loom': 1 }, 300),

  fabricate('relay-helm', 16, { 'relay-weave': 1, 'rime-alloy': 2 }, 320),
  fabricate('relay-vest', 17, { 'relay-weave': 3, 'servo-core': 1 }, 400),
  fabricate('relay-gloves', 16, { 'relay-weave': 1, 'servo-core': 1 }, 320),
  fabricate('relay-trousers', 16, { 'relay-weave': 2, 'synthweave-bolt': 2 }, 300),
  fabricate('relay-boots', 16, { 'relay-weave': 1, 'rime-alloy': 1, 'polymer-sheet': 1 }, 300),
  fabricate('arc-baton', 18, { 'servo-core': 2, 'relay-weave': 1, 'charged-cell': 2 }, 440),
  fabricate('arc-carbine', 18, { 'servo-core': 1, 'relay-weave': 2, 'rime-alloy': 2 }, 440),
  fabricate('relay-cutlass', 17, { 'servo-core': 1, 'relay-weave': 2, 'rime-alloy': 1 }, 420),
  fabricate('arc-scattergun', 18, { 'servo-core': 2, 'relay-weave': 1, 'charged-cell': 2 }, 440),
  fabricate('choir-visor', 18, { 'echo-serum': 2, 'polymer-sheet': 2, 'relay-weave': 1 }, 440),
  fabricate('signal-scanner', 17, { 'relay-weave': 1, 'servo-core': 1, 'wiring-loom': 2 }, 380),

  fabricate('inkproof-helm', 20, { 'ink-laminate': 2, 'relay-weave': 1 }, 520),
  fabricate('archivist-coat', 22, { 'vellum-weave': 4, 'ink-laminate': 2 }, 680),
  fabricate('vellum-gloves', 20, { 'vellum-weave': 1, 'ink-laminate': 1, 'servo-core': 1 }, 500),
  fabricate('ink-trousers', 20, { 'vellum-weave': 2, 'ink-laminate': 1 }, 500),
  fabricate('ink-boots', 20, { 'ink-laminate': 2, 'rime-alloy': 1 }, 500),
  fabricate('censor-maul', 23, { 'ink-laminate': 3, 'rime-alloy': 3, 'servo-core': 1 }, 720),
  fabricate('inkshot-pistol', 23, { 'ink-laminate': 2, 'servo-core': 2, 'ink-essence': 1 }, 720),
  fabricate('quill-knife', 21, { 'ink-laminate': 2, 'servo-core': 1 }, 640),
  fabricate('redaction-rifle', 23, { 'ink-laminate': 2, 'vellum-weave': 2, 'servo-core': 2 }, 720),
  fabricate('palimpsest-implant', 22, { 'ink-essence': 2, 'relay-weave': 2 }, 640),
  fabricate('lexicon-datapad', 21, { 'vellum-weave': 2, 'servo-core': 1, 'wiring-loom': 2 }, 600),

  fabricate('furnace-helm', 25, { 'furnace-steel': 2, 'ink-laminate': 1 }, 820),
  fabricate('furnace-plate', 27, { 'furnace-steel': 4, 'vellum-weave': 2 }, 1000),
  fabricate('furnace-gauntlets', 25, { 'furnace-steel': 1, 'golem-core': 1, 'vellum-weave': 1 }, 820),
  fabricate('furnace-greaves', 25, { 'furnace-steel': 2, 'vellum-weave': 2 }, 800),
  fabricate('furnace-boots', 25, { 'furnace-steel': 2, 'ink-laminate': 1 }, 800),
  fabricate('stoker-maul', 28, { 'furnace-steel': 3, 'golem-core': 2, 'servo-core': 1 }, 1100),
  fabricate('cinder-carbine', 28, { 'furnace-steel': 2, 'cinder-salt': 2, 'servo-core': 2 }, 1100),
  fabricate('furnace-cleaver', 26, { 'furnace-steel': 2, 'golem-core': 1 }, 1000),
  fabricate('slag-pike', 27, { 'furnace-steel': 3, 'vellum-weave': 1 }, 1050),
  fabricate('furnace-respirator', 26, { 'furnace-steel': 1, 'cinder-salt': 2, 'polymer-sheet': 2 }, 900),

  fabricate('threshold-helm', 30, { 'mirror-alloy': 2, 'hollow-weave': 1 }, 1300),
  fabricate('threshold-plate', 32, { 'mirror-alloy': 4, 'hollow-weave': 2 }, 1600),
  fabricate('threshold-gloves', 30, { 'hollow-weave': 2, 'golem-core': 1 }, 1250),
  fabricate('threshold-trousers', 30, { 'hollow-weave': 3, 'mirror-alloy': 1 }, 1250),
  fabricate('threshold-boots', 30, { 'mirror-alloy': 2, 'hollow-weave': 1 }, 1250),
  fabricate('the-knocker', 33, { 'mirror-alloy': 3, 'knock-splinter': 3, 'golem-core': 2 }, 1800),
  fabricate('last-word', 33, { 'mirror-alloy': 3, 'knock-splinter': 2, 'cinder-salt': 2 }, 1800),
  fabricate('hinge-glaive', 32, { 'mirror-alloy': 3, 'hollow-weave': 2 }, 1700),
  fabricate('farsight-rifle', 33, { 'mirror-alloy': 2, 'knock-splinter': 2, 'hollow-weave': 1 }, 1800),
  fabricate('threshold-implant', 32, { 'knock-splinter': 3, 'ink-essence': 2, 'hollow-weave': 1 }, 1600),
  fabricate('meridian-sigil', 30, { 'mirror-alloy': 1, 'knock-splinter': 1, 'furnace-steel': 1 }, 1200),

  fabricate('dispatch-helm', 35, { 'seal-alloy': 2, 'letter-weave': 1 }, 2000),
  fabricate('dispatch-plate', 36, { 'seal-alloy': 4, 'letter-weave': 2 }, 2400),
  fabricate('dispatch-gloves', 35, { 'letter-weave': 2, 'golem-core': 1 }, 1900),
  fabricate('dispatch-trousers', 35, { 'letter-weave': 3, 'seal-alloy': 1 }, 1900),
  fabricate('dispatch-boots', 35, { 'seal-alloy': 2, 'letter-weave': 1 }, 1900),
  fabricate('sorter-visor', 35, { 'seal-alloy': 1, 'letter-weave': 1, 'polymer-sheet': 2 }, 1900),
  fabricate('franking-hammer', 37, { 'seal-alloy': 3, 'knock-splinter': 2, 'golem-core': 2 }, 2700),
  fabricate('return-to-sender', 37, { 'seal-alloy': 3, 'dead-letter': 2, 'cinder-salt': 2 }, 2700),
  fabricate('letter-opener', 36, { 'seal-alloy': 2, 'letter-weave': 1 }, 2400),
  fabricate('long-haul-rifle', 37, { 'seal-alloy': 2, 'dead-letter': 2, 'hollow-weave': 1 }, 2700),
  fabricate('postmark-implant', 36, { 'dead-letter': 3, 'ink-essence': 2, 'letter-weave': 1 }, 2400),
];


export const CALDER_RECIPES: readonly RecipeDefinition[] = [
  recipe('refinery', 'brine-steel', 40, { 'crawler-carapace': 1, 'rock-salt': 2 }, { experience: 420 }),
  recipe('refinery', 'salt-weave', 40, { 'miner-canvas': 2, 'rock-salt': 1 }, { experience: 420 }),
  recipe('refinery', 'halite-glass', 45, { 'halite-geode': 2, 'lamp-glass': 1 }, { experience: 470 }),
  recipe('refinery', 'vestment-weave', 45, { 'salted-vestment': 2, 'salt-weave': 1 }, { experience: 470 }),
  recipe('synthesiser', 'salt-poultice', 42, { 'rock-salt': 2, 'gel-base': 1 }, { experience: 380 }),
  fabricate('saltworks-helm', 40, { 'brine-steel': 2, 'salt-weave': 1 }, 2200),
  fabricate('saltworks-plate', 41, { 'brine-steel': 4, 'salt-weave': 2 }, 2600),
  fabricate('saltworks-gloves', 40, { 'salt-weave': 2, 'crawler-carapace': 1 }, 2100),
  fabricate('saltworks-trousers', 40, { 'salt-weave': 3, 'brine-steel': 1 }, 2100),
  fabricate('saltworks-boots', 40, { 'brine-steel': 2, 'salt-weave': 1 }, 2100),
  fabricate('saltworks-goggles', 40, { 'brine-steel': 1, 'salt-weave': 1, 'lamp-glass': 2 }, 2100),
  fabricate('seam-maul', 42, { 'brine-steel': 3, 'crawler-carapace': 2 }, 2900),
  fabricate('brine-cutter', 41, { 'brine-steel': 2, 'salt-weave': 1 }, 2600),
  fabricate('seam-carbine', 42, { 'brine-steel': 3, 'lamp-glass': 2 }, 2900),
  fabricate('lampline-rifle', 42, { 'brine-steel': 2, 'lamp-glass': 2, 'salt-weave': 1 }, 2900),
  fabricate('geode-implant', 41, { 'lamp-glass': 3, 'salt-weave': 1, 'rock-salt': 2 }, 2600),
  fabricate('cathedral-helm', 45, { 'halite-glass': 2, 'vestment-weave': 1 }, 2500),
  fabricate('cathedral-plate', 46, { 'halite-glass': 4, 'vestment-weave': 2 }, 3000),
  fabricate('cathedral-gloves', 45, { 'vestment-weave': 2, 'brine-steel': 1 }, 2400),
  fabricate('cathedral-trousers', 45, { 'vestment-weave': 3, 'halite-glass': 1 }, 2400),
  fabricate('cathedral-boots', 45, { 'halite-glass': 2, 'vestment-weave': 1 }, 2400),
  fabricate('cathedral-lenses', 45, { 'halite-glass': 2, 'vestment-weave': 1 }, 2400),
  fabricate('censer-maul', 47, { 'halite-glass': 3, 'brine-steel': 2 }, 3300),
  fabricate('reliquary-glaive', 46, { 'halite-glass': 3, 'vestment-weave': 1 }, 3000),
  fabricate('choir-carbine', 47, { 'halite-glass': 3, 'lamp-glass': 2 }, 3300),
  fabricate('vigil-rifle', 47, { 'halite-glass': 2, 'vestment-weave': 1, 'lamp-glass': 2 }, 3300),
  fabricate('relic-implant', 46, { 'halite-glass': 2, 'vestment-weave': 2, 'halite-geode': 2 }, 3000),
];

export const RECIPES: readonly RecipeDefinition[] = [
  ...REFINING_RECIPES,
  ...MEDICAL_RECIPES,
  ...FABRICATION_RECIPES,
  ...DEEP_REFINING_RECIPES,
  ...DEEP_MEDICAL_RECIPES,
  ...DEEP_FABRICATION_RECIPES,
  ...CALDER_RECIPES,
];
