import type { PlayerRole } from "../../domain/session/playerRole";
import { playerRoleLabel } from "../../domain/session/playerRole";
import { RadioCardGroup } from "../ui/RadioCardGroup";

interface RolePickerProps {
  value: PlayerRole;
  onChange: (role: PlayerRole) => void;
  disabled?: boolean;
  includeObserver?: boolean;
}

const BASE_ROLE_OPTIONS: Array<{
  value: PlayerRole;
  summary: string;
}> = [
  {
    value: "seeker",
    summary: "Ask questions, mark the map, share live location.",
  },
  {
    value: "hider",
    summary: "Answer questions, set your hiding zone, watch seekers.",
  },
];

const OBSERVER_ROLE_OPTION = {
  value: "observer" as const,
  summary: "Watch the game read-only. Switch between seeker and hider views.",
};

export function RolePicker({
  value,
  onChange,
  disabled,
  includeObserver = false,
}: RolePickerProps) {
  const roleOptions = includeObserver
    ? [...BASE_ROLE_OPTIONS, OBSERVER_ROLE_OPTION]
    : BASE_ROLE_OPTIONS;

  return (
    <RadioCardGroup
      value={value}
      options={roleOptions.map((option) => ({
        value: option.value,
        title: playerRoleLabel(option.value),
        description: option.summary,
      }))}
      onChange={onChange}
      aria-label="Player side"
      label="Your side"
      disabled={disabled}
    />
  );
}
