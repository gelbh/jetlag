import { useId } from "react";
import type { AdvancedSessionSettingsValue } from "../../domain/session/advancedSessionSettings";
import type { GameArea } from "../../domain/map/annotations";
import { CategoryEditor } from "./customContent/CategoryEditor";
import { MatchingAreaUpload } from "./customContent/MatchingAreaUpload";
import { PinEditor } from "./customContent/PinEditor";

interface SessionCustomContentSettingsProps {
  value: AdvancedSessionSettingsValue;
  onChange: (value: AdvancedSessionSettingsValue) => void;
  gameArea?: GameArea | null;
  disabled?: boolean;
}

export function SessionCustomContentSettings({
  value,
  onChange,
  gameArea,
  disabled,
}: SessionCustomContentSettingsProps) {
  const panelId = useId();

  return (
    <div id={panelId} className="space-y-4 border-t border-border pt-3">
      <MatchingAreaUpload
        value={value}
        onChange={onChange}
        gameArea={gameArea}
        disabled={disabled}
      />
      <CategoryEditor value={value} onChange={onChange} disabled={disabled} />
      <PinEditor value={value} onChange={onChange} disabled={disabled} />
    </div>
  );
}
