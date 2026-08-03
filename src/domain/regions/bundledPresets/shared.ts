import type { DistanceUnit } from "../../map/distance";
import type { AdvancedSessionSettingsValue } from "../../session/tools/advancedSessionSettings";
import type { PresetHierarchySegment } from "../bundledPresetHierarchy";
import type { RegionPackId } from "../regionPack";

export interface BundledGamePresetDefinition {
  id: string;
  name: string;
  description: string;
  placeLabel: string;
  regionPackId: RegionPackId;
  subregionId?: string;
  hierarchy: readonly PresetHierarchySegment[];
  distanceUnit?: DistanceUnit;
  advancedSettingsPatch?: Partial<AdvancedSessionSettingsValue>;
  transitMetroId?: string;
  playAreaSquareMiles: number;
}

export const EXPANSION_OFF: Partial<AdvancedSessionSettingsValue> = {
  expansionPackEnabled: false,
  customQuestionPackEnabled: false,
};

export function titleCase(value: string): string {
  return value
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
