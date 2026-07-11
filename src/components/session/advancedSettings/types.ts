import type { AdvancedSessionSettingsValue } from "../../../domain/session/advancedSessionSettings";
import type { DistanceUnit } from "../../../domain/map/distance";
import type { GameSize } from "../../../domain/session/gameSize";

export interface AdvancedSettingsSectionProps {
  gameSize: GameSize;
  distanceUnit: DistanceUnit;
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  disabled?: boolean;
}
