import type { ItemDefinition, ItemIconShape } from '../gear/items.ts';
import { gear } from './gearItem.ts';

const material = (id: string, name: string, examine: string, icon: ItemIconShape, iconColors: readonly [string, string], value: number): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'material',
  rarity: 'standard',
  icon,
  iconColors,
  maxStack: 100,
  value,
});

const questItem = (id: string, name: string, examine: string, icon: ItemIconShape, iconColors: readonly [string, string]): ItemDefinition => ({
  id,
  name,
  examine,
  category: 'quest',
  rarity: 'anomalous',
  icon,
  iconColors,
  maxStack: 1,
  value: 0,
});

export const VESPER_MATERIALS: readonly ItemDefinition[] = [
  material('bedframe-iron', 'Bedframe Iron', "A bar of iron from a ward bedframe, still painted hospital cream. The paint has been touched up every year by someone who wasn't there.", 'ingot', ['#e8e0c8', '#5a5a4a'], 90),
  material('starched-linen', 'Starched Linen', 'Ward linen starched so hard it stands up on its own. It smells of carbolic and very faintly of lavender.', 'sheet', ['#f4f4ee', '#8a9a9a'], 90),
  material('physic-herb', 'Physic Herb', 'A bundle of dried herbs from a Vesper physic cabinet. Every bundle is labelled in the same hand, for the same patient.', 'moss', ['#9ab87a', '#3a5a2a'], 85),
  material('vesper-tincture', 'Vesper Tincture', 'A dark tincture drawn from the pharmacy stills. The label prescribes it for "whatever is the matter with you".', 'vial', ['#7a3a6a', '#2a0f24'], 105),
  material('prescription-sheaf', 'Prescription Sheaf', 'A sheaf of prescriptions torn from a wraith. Every one is made out to you, and every one is dated tomorrow.', 'sheet', ['#f2ecd8', '#5a2a4a'], 105),
  material('ward-steel', 'Ward Steel', 'Bedframe iron quenched in a physic-herb wash. It is cold to the touch and never harbours anything.', 'ingot', ['#e8e0c8', '#6ad8b8'], 360),
  material('sterile-weave', 'Sterile Weave', 'Starched linen re-woven with herb fibre. Nothing grows on it, including doubt.', 'sheet', ['#f4f4ee', '#6ad8b8'], 350),
  material('tonic-glass', 'Tonic Glass', 'Pharmacy glass cast around ward steel and cured in tincture. It heals small cuts on the hands that hold it.', 'shard', ['#c8a8d8', '#7a3a6a'], 430),
  material('prescription-weave', 'Prescription Weave', 'Prescriptions pulped into sterile weave. Wearing it feels like being told exactly what to do.', 'sheet', ['#f2ecd8', '#7a3a6a'], 420),
];

export const VESPER_MEDICINE: readonly ItemDefinition[] = [
  {
    id: 'vesper-tonic',
    name: 'Vesper Tonic',
    examine: 'A sanatorium tonic of physic herb in gel base. Take one spoonful and lie down; you will feel better, and you will not be asked how.',
    category: 'consumable',
    rarity: 'anomalous',
    icon: 'vial',
    iconColors: ['#9ab87a', '#7a3a6a'],
    maxStack: 20,
    value: 260,
    consumable: { verb: 'Drink', heal: 82 },
  },
];

export const VESPER_QUEST_ITEMS: readonly ItemDefinition[] = [
  questItem('vesper-referral', 'Vesper Referral', "A referral slip on Vesper Sanatorium letterhead, delivered by the Medbay's pneumatic tube. PATIENT: MERIDIAN. CONDITION: UNKNOWN. PLEASE ATTEND.", 'sheet', ['#f2ecd8', '#5a2a4a']),
  questItem('discharge-papers', 'Discharge Papers', 'Discharge papers for every patient in the cold ward, signed by Matron Ashby and countersigned by nobody, yet.', 'sheet', ['#f4f4ee', '#3a5a2a']),
];

const WARD = { primary: '#e8e0c8', secondary: '#3a5a52', emissive: '#6ad8b8' };
const PHYSICIAN = { primary: '#f4f4ee', secondary: '#2a1f2a', emissive: '#c88ad8' };
const SURGEON = { primary: '#f4f4ee', secondary: '#6a1a2a', emissive: '#ff6a7a' };

export const WARD_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'ward-helm', name: 'Ward Helm', examine: 'A ward-steel helm with a surgical lamp. It sees in clean, flat light, and it does not flinch.', rarity: 'anomalous', icon: 'helmet', slot: 'head', stats: { armor: 23, hazardShielding: 11, cognitiveWard: 10 }, requires: { fortitude: 50 }, visual: WARD, value: 9600 }),
  gear({ id: 'ward-plate', name: 'Ward Plate', examine: 'Ward-steel plate over a sterile-weave gown. It is easy to wipe down, which is the point.', rarity: 'anomalous', icon: 'plate', slot: 'torso', stats: { armor: 46, hazardShielding: 11, cognitiveWard: 10 }, requires: { fortitude: 50 }, visual: WARD, value: 12700 }),
  gear({ id: 'ward-gloves', name: 'Ward Gloves', examine: 'Sterile-weave gloves with ward-steel knuckles. They never need washing, and they wash themselves anyway.', rarity: 'anomalous', icon: 'gloves', slot: 'hands', stats: { armor: 13, power: 13, accuracy: 13 }, requires: { fortitude: 50 }, visual: WARD, value: 8600 }),
  gear({ id: 'ward-trousers', name: 'Ward Trousers', examine: 'Scrub trousers in sterile weave with ward-steel shin guards. Built for a twelve-hour shift on your feet.', rarity: 'anomalous', icon: 'trousers', slot: 'legs', stats: { armor: 21, hazardShielding: 8 }, requires: { fortitude: 50 }, visual: WARD, value: 8400 }),
  gear({ id: 'ward-boots', name: 'Ward Boots', examine: 'Rubber-soled ward boots. They make no sound on the linoleum, which the night staff appreciate.', rarity: 'anomalous', icon: 'boots', slot: 'feet', stats: { armor: 20, hazardShielding: 9 }, requires: { fortitude: 50 }, visual: WARD, value: 8000 }),
  gear({ id: 'ward-visor', name: 'Ward Visor', examine: 'A splash visor in ward steel and clear glass. Whatever is about to happen, you will see it coming.', rarity: 'anomalous', icon: 'visor', slot: 'eyes', stats: { hazardShielding: 19, cognitiveWard: 11, armor: 7, accuracy: 6 }, requires: { fortitude: 50 }, visual: WARD, value: 8900 }),
  gear({ id: 'bonesetter-maul', name: 'Bonesetter', examine: 'A ward-steel mallet for setting bones. It sets them very firmly, in whichever direction it likes.', rarity: 'anomalous', icon: 'maul', slot: 'primary', stats: { power: 62, accuracy: 20 }, requires: { closeQuarters: 50 }, visual: WARD, value: 13800, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'ward-scalpel', name: 'Ward Scalpel', examine: 'A long scalpel in ward steel. It has only ever made one kind of cut, and it is very good at it.', rarity: 'anomalous', icon: 'knife', slot: 'primary', stats: { power: 38, accuracy: 22 }, requires: { closeQuarters: 50 }, visual: WARD, value: 12400, weapon: { kind: 'knife', range: 1, speedTicks: 3 } }),
  gear({ id: 'ward-carbine', name: 'Ward Carbine', examine: 'A sedative-dart carbine rebuilt to fire something less gentle. The label still says FOR PATIENT USE.', rarity: 'anomalous', icon: 'carbine', slot: 'primary', stats: { power: 40, accuracy: 65 }, requires: { marksmanship: 50 }, visual: WARD, value: 13800, weapon: { kind: 'carbine', range: 8, speedTicks: 5 } }),
  gear({ id: 'quarantine-rifle', name: 'Quarantine Rifle', examine: 'A long rifle from the sanatorium quarantine watch. It was built to keep things in, at range.', rarity: 'anomalous', icon: 'rifle', slot: 'primary', stats: { power: 20, accuracy: 64 }, requires: { marksmanship: 50 }, visual: WARD, value: 13400, weapon: { kind: 'rifle', range: 9, speedTicks: 7 } }),
  gear({ id: 'ward-implant', name: 'Ward Implant', examine: 'A ward-steel implant that keeps a steady pulse in your head. It checks on you every hour, all night.', rarity: 'anomalous', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 32, armor: 7, insight: 7 }, requires: { containment: 50 }, visual: WARD, value: 11400 }),
];

export const PHYSICIAN_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'physician-helm', name: 'Physician Helm', examine: 'A tonic-glass helm shaped like a head mirror. It reflects your face back at your enemies, slightly improved.', rarity: 'anomalous', icon: 'helmet', slot: 'head', stats: { armor: 25, hazardShielding: 12, cognitiveWard: 11 }, requires: { fortitude: 55 }, visual: PHYSICIAN, value: 11500 }),
  gear({ id: 'physician-plate', name: 'Physician Plate', examine: 'Tonic-glass plate over a prescription-weave coat. It has a calm bedside manner and very poor news.', rarity: 'anomalous', icon: 'plate', slot: 'torso', stats: { armor: 50, hazardShielding: 12, cognitiveWard: 11 }, requires: { fortitude: 55 }, visual: PHYSICIAN, value: 15200 }),
  gear({ id: 'physician-gloves', name: 'Physician Gloves', examine: 'Prescription-weave gloves with tonic-glass fingertips. They take a pulse through armour.', rarity: 'anomalous', icon: 'gloves', slot: 'hands', stats: { armor: 14, power: 14, accuracy: 14 }, requires: { fortitude: 55 }, visual: PHYSICIAN, value: 10300 }),
  gear({ id: 'physician-trousers', name: 'Physician Trousers', examine: 'Pressed prescription-weave trousers. They have never once been seen with a crease in the wrong place.', rarity: 'anomalous', icon: 'trousers', slot: 'legs', stats: { armor: 23, hazardShielding: 9 }, requires: { fortitude: 55 }, visual: PHYSICIAN, value: 10000 }),
  gear({ id: 'physician-boots', name: 'Physician Boots', examine: 'Polished boots with tonic-glass heels. They arrive on the ward a moment before you do.', rarity: 'anomalous', icon: 'boots', slot: 'feet', stats: { armor: 22, hazardShielding: 10 }, requires: { fortitude: 55 }, visual: PHYSICIAN, value: 9600 }),
  gear({ id: 'physician-loupe', name: 'Physician Loupe', examine: 'Tonic-glass loupes on a steel band. Under them, every wound is a diagnosis and every diagnosis is terminal.', rarity: 'anomalous', icon: 'visor', slot: 'eyes', stats: { hazardShielding: 21, cognitiveWard: 12, armor: 8, accuracy: 7 }, requires: { fortitude: 55 }, visual: PHYSICIAN, value: 10700 }),
  gear({ id: 'amputation-maul', name: 'Second Opinion', examine: 'A heavy tonic-glass maul from the surgery. Whatever it hits gets a second opinion, and the opinion is the same.', rarity: 'anomalous', icon: 'maul', slot: 'primary', stats: { power: 68, accuracy: 22 }, requires: { closeQuarters: 55 }, visual: PHYSICIAN, value: 16500, weapon: { kind: 'maul', range: 1, speedTicks: 5 } }),
  gear({ id: 'tourniquet-glaive', name: 'Tourniquet Glaive', examine: 'A long glaive with a tourniquet wound round the haft. It stops bleeding, eventually, one way or another.', rarity: 'anomalous', icon: 'polearm', slot: 'primary', stats: { power: 66, accuracy: 18 }, requires: { closeQuarters: 55 }, visual: PHYSICIAN, value: 15800, weapon: { kind: 'polearm', range: 2, speedTicks: 5 } }),
  gear({ id: 'physician-carbine', name: 'House Call', examine: 'A tonic-glass carbine for visiting patients who will not come in. It always makes the appointment.', rarity: 'anomalous', icon: 'carbine', slot: 'primary', stats: { power: 44, accuracy: 72 }, requires: { marksmanship: 55 }, visual: PHYSICIAN, value: 16500, weapon: { kind: 'carbine', range: 8, speedTicks: 5 } }),
  gear({ id: 'triage-rifle', name: 'Triage Rifle', examine: 'A long rifle for triage at distance. It decides who is next, and it is never wrong for long.', rarity: 'anomalous', icon: 'rifle', slot: 'primary', stats: { power: 22, accuracy: 71 }, requires: { marksmanship: 55 }, visual: PHYSICIAN, value: 16100, weapon: { kind: 'rifle', range: 9, speedTicks: 7 } }),
  gear({ id: 'physician-implant', name: 'Physician Implant', examine: 'A tonic-glass implant that writes your symptoms down before you notice them.', rarity: 'anomalous', icon: 'implant', slot: 'implant', stats: { cognitiveWard: 36, armor: 8, insight: 8 }, requires: { containment: 55 }, visual: PHYSICIAN, value: 13700 }),
];

export const VESPER_UNIQUE_GEAR: readonly ItemDefinition[] = [
  gear({ id: 'night-shift-syringe', name: 'Night Shift', examine: "A night nurse's syringe pistol. It only ever fires at three in the morning, and it is always three in the morning somewhere.", rarity: 'anomalous', icon: 'pistol', slot: 'primary', stats: { power: 34, accuracy: 60 }, requires: { marksmanship: 54 }, visual: WARD, value: 14000, weapon: { kind: 'pistol', range: 6, speedTicks: 4 }, unique: true }),
  gear({ id: 'physicians-coat', name: "The Physician's Coat", examine: 'The Chief Physician\'s white coat. The pockets are full of notes about you, and they are all encouraging.', rarity: 'anomalous', icon: 'coat', slot: 'torso', stats: { armor: 52, hazardShielding: 14, cognitiveWard: 16 }, requires: { fortitude: 57 }, visual: SURGEON, value: 17000, unique: true }),
  gear({ id: 'bone-saw', name: 'Bone Saw', examine: 'A surgical bone saw, retoothed for work in the field. It is sharp, and it is very patient.', rarity: 'anomalous', icon: 'blade', slot: 'primary', stats: { power: 70, accuracy: 24 }, requires: { closeQuarters: 57 }, visual: SURGEON, value: 19000, weapon: { kind: 'blade', range: 1, speedTicks: 4 }, unique: true }),
];
