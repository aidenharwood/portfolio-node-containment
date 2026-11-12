import { buildLevelIndex, firstHollowOf, LEVEL_RECIPES, SHIPPED_CONTEXT, type DistrictDefinition, type DistrictId, type DistrictLayout, type GameContent, type LevelContext } from '@containment/shared';

export interface EditedDistrict {
  readonly district: DistrictDefinition;
  readonly layout: DistrictLayout;
}

export function contentWith(base: GameContent, edited: ReadonlyMap<DistrictId, EditedDistrict>): GameContent {
  if (edited.size === 0) return base;
  const districts = new Map(base.districts);
  for (const [id, { district }] of edited) districts.set(id, district);
  const context: LevelContext = {
    districtOf: (id) => {
      const district = districts.get(id);
      if (!district) throw new Error(`There is no district "${id}".`);
      return district;
    },
    hollowOf: (id) => {
      const layout = edited.get(id)?.layout;
      return layout ? firstHollowOf(layout) : SHIPPED_CONTEXT.hollowOf(id);
    },
  };
  const index = buildLevelIndex([...LEVEL_RECIPES.values()].map((recipe) => recipe(context)), districts, base.assemblies);
  return { ...base, districts, levels: index.levels, levelOfDistrict: index.levelOfDistrict };
}
