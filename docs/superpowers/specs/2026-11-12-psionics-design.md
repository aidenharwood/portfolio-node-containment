# Psionics and the combat triangle

## Goal

Add Psionics as a third combat skill and make melee, ranged and psionic a gear-driven triangle built on the Bulwark, Skirmisher and Warden armour lines.

## Triangle

Melee beats ranged, ranged beats psionic, psionic beats melee.

| Style | Skill | Offence stat | Defence stat | Armour line |
|---|---|---|---|---|
| melee | closeQuarters | power | armor | bulwark |
| ranged | marksmanship | accuracy | deflection (new) | skirmisher |
| psionic | psionics (new) | focus (new) | cognitiveWard | warden |

`COMBAT_STYLE_INFO` in `shared/src/combat/weapons.ts` holds this table; every style-dependent rule reads it.

## Player profile

- Ratings: Melee (Close Quarters + Power), Ranged (Marksmanship + Accuracy), Psionic (Psionics + Focus).
- Defences: each is half Fortitude plus its gear stat. Psionic Defence replaces the unused Cognitive Resistance.
- `combatLevel` = Fortitude / 2 + best style / 2 + each other style / 8.
- Creature attacks roll against the defence matching their style.

## Armour lines

- Bulwark: high Armor and Deflection, little Ward. Weak to psionic.
- Skirmisher: high Deflection, Ward, low Armor. Weak to melee.
- Warden: high Ward, Focus on hands and back, low Deflection. Gated by Psionics (was Containment). Weak to ranged.
- Hand-authored gear gains Deflection by shape (plate/helmet 0.8x Armor, vest/visor/respirator 1.0x, coat/implant 0.3x, rounded).
- Content integrity rejects any armour tier where one line is strongest against all three styles.

## Weapons and kit

- New kinds: `focus` (one-handed, `channel`, `pulse`) and `resonator` (two-handed, `invoke`, `wave`, damage scale 1.3).
- A Warden focus and resonator per weapon tier, fabricated from the tier's materials, each with a weapon variant. Psionic variants keep the Warden motif.
- Amplifier implants per tier: Focus with some Ward, gated by Psionics.
- Training Focus from Live Fire and a basic focus in the Intake shop.

## Creatures

- `weakness` is replaced by an optional `guard: GearMotif`. Guard multiplies the base Defence per style (strong 1.15, weak 0.8, warden neutral to melee). No guard means neutral (training targets).
- Study still reveals the weakness and makes the weak style ignore 30% of Defence.
- Psionic attackers (Warden guard): Static Wraith, Echo Operator, The Choir, Last Archivist, Knockling, The Host, The Salt Bishop, Prescription Wraith, The Almoner.
- Bulwark guards: armoured and construct bodies. Skirmisher guards: fliers, drifters and fast bodies.
- Second attack styles for bosses are deferred to the boss rework.

## Client

Psionic projectiles (`pulse`, `wave`), `channel` and `invoke` poses, focus and resonator models, bestiary guard and per-style defences, Psionics in the skill list.

## Testing

Unit tests for the style table, profile, combat level and creature defence; balance tests that every style can beat each boss and the counter style wins more; variant parity for psionic weapons; content integrity for the line rule.
