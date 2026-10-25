import { getTentacleLocationCategory, type TentacleExtendedCategoryId } from "@/domain/questions";

export function tentacleEmptyPlayAreaMessage(categoryId: TentacleExtendedCategoryId): string {
  const label = getTentacleLocationCategory(categoryId).promptNoun;
  return `No named ${label} found in this play area.`;
}
