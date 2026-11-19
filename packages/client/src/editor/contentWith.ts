import {
  buildLevelIndex,
  firstHollowOf,
  LEVEL_RECIPES,
  SHIPPED_CONTEXT,
  type DistrictDefinition,
  type DistrictId,
  type DistrictLayout,
  type GameContent,
  type LandMap,
  type LevelContext,
  type LevelId,
  type LevelRecipe,
  type TilePoint,
} from '@containment/shared';

export interface EditedDistrict {
  readonly district: DistrictDefinition;
  readonly layout: DistrictLayout;
}

export function contentWith(
  base: GameContent,
  edited: ReadonlyMap<DistrictId, EditedDistrict>,
  recipes: ReadonlyMap<LevelId, LevelRecipe> = LEVEL_RECIPES,
  shippedHollowOf: (id: DistrictId) => TilePoint = SHIPPED_CONTEXT.hollowOf,
  editedLands: ReadonlyMap<string, LandMap> = new Map(),
): GameContent {
  if (edited.size === 0 && editedLands.size === 0) return base;
  const districts = new Map(base.districts);
  for (const [id, { district }] of edited) districts.set(id, district);
  const lands = new Map(base.lands);
  for (const [id, land] of editedLands) lands.set(id, land);
  const context: LevelContext = {
    districtOf: (id) => {
      const district = districts.get(id);
      if (!district) throw new Error(`There is no district "${id}".`);
      return district;
    },
    hollowOf: (id) => {
      const layout = edited.get(id)?.layout;
      return layout ? firstHollowOf(layout) : shippedHollowOf(id);
    },
    landOf: (id) => {
      const land = lands.get(id);
      if (!land) throw new Error(`There is no land plan "${id}".`);
      return land;
    },
  };
  const index = buildLevelIndex([...recipes.values()].map((recipe) => recipe(context)), districts, base.assemblies);
  return { ...base, districts, lands, levels: index.levels, levelOfDistrict: index.levelOfDistrict };
}
