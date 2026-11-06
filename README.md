# Containment Online

A browser-based, point-and-click sci-fi MMO set inside a containment facility run by the Meridian Directorate. The world is fully 3D and built from voxels, with a freely orbiting camera. It has click-to-walk movement, hover bubbles for interactions, context-menu interactions, skills that level from XP, a 28-slot inventory, and a ten-slot loadout.

## Quick start

Requires **Node 24+**.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite client proxies `/ws` to the game server on port 7420.

| Command             | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Game server (auto-restart) and Vite client together             |
| `npm test`          | All unit and integration tests, using Node's built-in runner    |
| `npm run typecheck` | Strict TypeScript across all three packages                     |
| `npm run build`     | Production client bundle in `packages/client/dist`              |
| `npm start`         | Game server only; also serves the built client on port 7420     |

**Controls:**

- Left-click to walk or to do the default action. Hover anything interactive to see its bubble; right-click for every option.
- Drag, middle-drag or Q/E to rotate the camera. Use the arrow keys to tilt, scroll to zoom, and Home to reset.
- F1–F5 switch the side panel tabs. Enter opens chat.

Environment variables for the server: `GAME_SERVER_PORT` (default 7420), `DATABASE_PATH` (default `data/containment.sqlite`) and `CLIENT_DIST_PATH`. For the client dev server, `GAME_SERVER_URL` sets the proxy target.

## What exists today

- **Auth:** registration and login use scrypt-hashed passwords. Session tokens are stored only as SHA-256 hashes and expire after 14 days. Failed logins are throttled per origin and username.
- **Character creation:** purely cosmetic. You choose a name, pronouns and appearance: a male or female body, build, height, complexion, hair style and colour, eyes, distinguishing marks and cybernetic augments. Every operative starts with identical, untrained skills, an empty pack and nothing but an undersuit. The early tutorial has you craft what you need. There are no classes and no attributes; everything is earned by training skills. A live 3D voxel preview, which you can drag to rotate, shows the character with a walk cycle. Male and female bodies have different silhouettes, and armour follows the body underneath. Everything you equip appears on your character exactly as its icon shows.
- **Gear:** stacking inventory, equipping with skill-level requirements, swap-on-equip, aggregated stats, and procedurally drawn icons and on-body visuals.
- **Derived stats:** a combat profile (Integrity, Melee and Ranged Rating, Defence, Hazard and Cognitive Resistance, Analysis) computed purely from trained skills plus equipped gear (`shared/src/character/derivedStats.ts`).
- **Combat:** server-authoritative and tick-based, in the style of classic point-and-click MMOs.
  - Click a creature to engage. Your character closes the distance and attacks on the weapon's rhythm.
  - Hit chance and max hit come from Close Quarters or Marksmanship plus weapon Power or Accuracy. Damage taken is reduced by Defence (Fortitude plus Armor).
  - Damage dealt trains the matching style skill and Fortitude.
  - Creatures have aggro and leash ranges, loot tables and respawn timers.
  - When your character is incapacitated, they wake in the Atrium Medbay at full integrity. Integrity also regenerates out of combat, and Medgel heals it.
  - The screen shows hit splats, overhead health bars, an integrity bar and a target panel.
- **Economy:** Quartermaster Okafor runs Meridian Requisitions. Right-click and choose "Trade", or ask in dialogue, to buy Medgel and gear with scrip. You can sell creature materials and spare equipment back at half value. Right-click a listing or an item to buy or sell 1, 5, 10 or all of it.
- **Personal storage:** storage lockers by Requisitions (Atrium) and in the Undercroft camp open onto the same storage, which has 200 slots and stacks everything. Click to move one, or right-click for 5, X (any amount) or all. "Deposit pack" stores everything except quest items. Lockers stand in the Commissary, the Fabrication Hall, the Undercroft camp and on the hydroponics platform.
- **Built for crowds:**
  - **Layers:** each zone has a capacity. Once a zone is full, new arrivals go to an overflow copy of it (shown as "Layer 2" in the banner and minimap). Overflow layers that sit empty are retired.
  - **Single-way combat:** outside special areas, a creature fights one operative at a time and an operative is fought by one creature at a time. You can't attack something another operative is fighting, and you can't be piled on. Multi-combat areas, such as the Foreman's workshop with its leech adds, allow free-for-all fights.
  - **Shared credit (multi-combat areas):** everyone who damages a creature gets quest credit, kill XP and their own loot roll.
  - **Faster respawns when busy:** respawns speed up as a layer gets busier.
- **Ground items:**
  - Creature loot and anything you drop or can't carry lands on the floor as a small spinning voxel model.
  - For the first minute only its owner can see or take it; it has a gold halo. Then it goes public with a cyan halo, and it despawns after three minutes.
  - Click an item to walk over and take it. Quest items can't be dropped.
- **Gathering, refining and crafting:** every piece of gear and every healing item can be made. Raw stock is gathered with Salvage from resource nodes: scrap heaps, textile bins, moss beds, resin drums, severed conduits, lumen blooms and slag heaps. Creature drops count as raw stock too. A Refinery turns raw stock into base parts (Refining), a Fabricator assembles parts into equipment (Engineering), and a Bio-synthesiser makes medicine (Biochemistry): Medgel, Trauma Foam and Clotting Shots. Click a node and you keep working it until it runs dry (it replenishes after a while, for everyone in that zone layer) or your pack is full. Workshops are in the Atrium (west wall) and Mags' camp in the Undercroft. Deeper zones hold better stock.
- **Ranged training path:** a level-1 Trainee Dart Pistol (from Sergeant Kade, or 35 scrip at Requisitions) trains Marksmanship up to the Kestrel's level-5 requirement.
- **Minimap:** circular, centred on you and rotated with the camera, with a north marker, your facing arrow, creatures, NPCs and ground items. Click it to walk.
- **Item sprites:** every item has a voxel model. Its inventory and shop icon is a render of that model.
- **Quests and tutorial:** a data-driven quest engine with event-based and state-based objectives, conditional dialogue trees and effects. The storyline runs in order:
  1. *Orientation Protocol* (Intake Wing): getting around and gear.
  2. *Field Fabrication* (Atrium workshop, Technician Pell): gather scrap, offcuts and moss, refine them into plates, a bolt and a gel base, then assemble your own stun baton and synthesise a Medgel.
  3. *Live Fire* (Atrium training range): wielding a weapon, fighting and healing. Kade accepts the baton you made.
  4. *The Knocking*, the first main-story quest: through the quarantine bulkhead into **Sector 2**. You clear Gloam Mites, recover Dr. Halvorsen's expedition log and put down the Hollow Warden. It ends by revealing Sector 3.
  5. *The Far Side* (recommended rating 8): Varga gives you a Lantern Lens and clears you for the Atrium service lift down to **the Undercroft**, a flooded, rusting maintenance level with failing lights. You restore three junction boxes and defeat the Foreman, who unseals the way to **Sector 3**. There you find Dr. Halvorsen alive at the Knock, then report back to Sel.

  Side quests: *Overgrowth* comes from Dr. Oyelaran on the Verdance hydroponics deck: cut back thorn crawlers, harvest strangler fibre and check the seed vault. *Static in the Vents* runs in the Atrium. *Leech Season* comes from Mags, a scavenger in the Undercroft camp: bring five Leech Sacs for a Filter Respirator.
- **Undercroft gear tier:** Mags' swap shop (buys at 60%) and Undercroft drops lead to the Shock Maul (Close Quarters 8), Marksman Carbine (Marksmanship 10) and Composite Plate (Fortitude 8). Pipe Leeches (level 4) and Rust Hounds (level 7) are the training ground for the Foreman (level 10).
- **The Meridian Atrium hub:** the first hub, laid out as districts around a central plaza and coolant core.
  - **Commissary:** Requisitions and storage.
  - **Fabrication Hall:** all three crafting stations and starter resource nodes.
  - **Quarantine Gate:** the way to Sector 2.
  - **Archives:** Sel.
  - **Training Range:** Kade and the drones.
  - **Engineering Bay:** the service lift to the Undercroft.
  - **Medbay:** Medic Anand, who heals for free and sells medicine, plus beds you can rest on. This is also where incapacitated operatives wake up.
  - **Transit Bay:** the lift from the Intake Wing and the tram to Verdance Hydroponics.
- **Verdance Hydroponics (tier 2):** an overgrown agricultural deck between Sector 2 and the Undercroft in difficulty. Thorn Crawlers (level 4) drop thorn clusters, and Spore Drifters (level 6, ranged) drop lumen spores and moss. Strangler vines (Salvage 4) give fibre for Braided Cord, Sap Poultices (heal 11) and Thornweave Gloves.
- **World:** a Three.js voxel renderer with baked ambient occlusion, soft shadows, dynamic point lights, bloom and wall cutaway; the camera orbits and zooms freely. A server-authoritative 300ms tick and A* pathfinding with no corner-cutting. There are six hand-built zones (Intake Wing, Meridian Atrium, the Sector 2 quarantine, Verdance Hydroponics, the Undercroft and Sector 3), wandering NPCs, objects that run effects, lighting and a minimap.

## Repository layout

```
packages/
  shared/   Domain rules, content data and the network protocol. No I/O; both server and client import it.
  server/   Node game server: persistence, auth, world simulation, gameplay controllers.
  client/   Vite + Three.js client: screens, voxel renderer, HUD.
scripts/    Dev tooling
```

Read [ARCHITECTURE.md](ARCHITECTURE.md) for how the pieces fit, and [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and recipes, such as adding an item, an NPC, a quest or a zone.
