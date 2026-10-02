import type { DistanceUnit } from "@/domain/map/distance";
import type { GameSize } from "@/domain/session/size/gameSize";
import type { AdvancedSessionSettingsValue } from "@/domain/session/tools/advancedSessionSettings";

export interface AdvancedSettingsSectionProps {
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}
