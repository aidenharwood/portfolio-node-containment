# Handoff: sci-fi gear and components

Written 2026-11-19. The owner asked for gear (armour and weapons) and components to move from a medieval feel towards Halo and Cyberpunk.

## What landed

- **The ladder** (`content/ward/items.ts`) runs Scrap (1), Ferro (10), Plasteel (20), Duralloy (30), Sinter (40) and Vault Glass (50). `GEAR_FORMS` is `scrap, ferro, plasteel, duralloy, sinter, vaultGlass`.
- **Weapons:** Shock Baton, Monoblade, Power Hammer, Coil Pistol, Pulse Carbine, Rail Rifle, Psi Focus and Resonator. Weapon kind keys (`baton`, `maul` and so on) are unchanged; `WEAPON_KIND_INFO.name` carries the new names for tooltips.
- **Armour:**
  - Bulwark: Helmet, Carapace, Gauntlets, Legguards, Mag-boots, Barrier.
  - Skirmisher: Hood, Jacket, Gloves, Fatigues, Treads, Pack.
  - Adept (warden): Crown, Longcoat, Conduits, Leggings, Boots, Cloak.
  - The skirmisher and adept line names for the first two rungs are Scav and Runner, and Static and Null.
  - Every ladder piece carries its tier glow.
- **Components:**
  - Bars and ingots became Plating (Scrap Plating to Vault Glass Plating).
  - Waxed and tarred canvas became Ballistic Cloth and Tide Polymer.
  - Kit fittings became an Induction Coil, a Servo and a Gyro Stabiliser.
  - Edge and Sight kits became Overdrive and Optics kits. Stats, recipe counts, values and experience are unchanged.
- **Saves:** `RENAMED_WARD_ITEMS` maps every retired id (including the older `ceramite-*` ids) to its new id. Characters already migrated through it. Open market orders now do too (`withCurrentItem` in `economy/market.ts`, applied when `MarketController` loads).
- **Look** (client):
  - Sealed visor helmets, with a riot visor at Ferro and a gold Halo-style visor at Plasteel.
  - A carapace with ab plates and a power spine.
  - A barrier generator throwing a hard-light lattice, in place of the kite shield.
  - A hood with a neural crown, in place of the pointed cowl.
  - A longcoat with a collar, belt and circuit traces, in place of the tabard robe.
  - Shock prongs on the baton, a Monoblade with no crossguard, piston, ram and split gravity heads on the hammer, coil rings on the pistol and rails on the rifle.
  - Scrap gear is bound with grey tape instead of rope.
- **Gear gallery:** `/gear.html` (dev only) shows every tier on mannequins and as icons, plus `?components`. Options are listed in `ARCHITECTURE.md`.

`npm run typecheck` is clean and all 794 tests pass, including the silhouette test that keeps every tier distinct.

## Open

1. **Not checked in a live session.** The gallery uses the game's own `CharacterRig` and icon renderer. Tooltips, shops and the crafting window were not looked at in the running game.
2. **Mastery mantles** (`ward/mastery.ts`) still say "Mantle". They use the `cape` shape, so they now draw as the split tech cloak. Rename them to cloaks if that matters; the effect runner and the content check name them too.
3. **Hollow Bay materials.** The atlas plans Keelplate, Saltglass, Lodestone, Reliquary silver, Blacksteel, Drownglass and Lanternglass. When those ship, follow the ladder: a plating, a fibre and a trace per ward, with sci-fi names (for example Reliquary alloy rather than silver).
