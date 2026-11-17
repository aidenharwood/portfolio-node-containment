# Item sources

## Intent

Players at a crafting station can't tell where to get a recipe's ingredients. Every item should answer "where do I get this?" in the game, at the moment the player is stuck.

## Goals

- Every item can show every way to obtain it, derived from game content so it never goes stale.
- Reachable from a recipe ingredient in the crafting window and from an inventory item's context menu.
- Nothing is hidden behind discovery: creature drops show even for unstudied creatures.

## Non-goals

- A browsable encyclopedia tab or an external website. Both could reuse the same lookup later.
- Player market listings, which are live state rather than content.

## Approaches

- **A. Sources panel on ingredients and inventory items (chosen).** Answers the question where it's asked, and the lookup is reusable.
- B. An in-game item encyclopedia tab. More UI, and it still needs A's crafting link to fix the actual problem.
- C. A generated website wiki. Takes the player out of the game mid-craft, and is a second renderer to maintain.

## Design

- **Lookup (shared, pure):** `itemSources(content)` returns a map from item to its sources, built once from `GameContent`:
  - creature loot: creature, level, chance, count, districts it lives in
  - gathering and salvage: world object, skill and level, levels/districts where it's placed (generalising `salvageGuide`'s location logic to every gather skill)
  - recipes that output it: recipe, station, skill and level
  - shop listings: shop, price, currency, and the quest that unlocks it if any
  - quest rewards and `giveItem` effects on world objects and dialogue
  - the starting kit
- **Panel (client):** a "Where to get it" window grouped by source type. A recipe source links to that recipe's own ingredients, so the player can follow a chain down to raw materials. An item with no sources says so.
- **Entry points:** clicking an ingredient in the crafting detail, and a "Sources" action beside "Examine" in the inventory context menu.
- **Integrity:** a test lists ingredients with no source at all, and fails on any, so unobtainable recipes are caught.

## Left to the builder

Panel layout and styling following the existing shop and salvage guide windows; ordering within each group (lowest level first is the default).
