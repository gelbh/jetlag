import type { PlayerRole } from "../../domain/session/playerRole";
import { playerRoleLabel } from "../../domain/session/playerRole";
import { RadioCardGroup } from "../ui/RadioCardGroup";

interface RolePickerProps {
  value: PlayerRole;
  onChange: (role: PlayerRole) => void;
  disabled?: boolean;
}

const ROLE_OPTIONS: Array<{
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

export function RolePicker({ value, onChange, disabled }: RolePickerProps) {
  return (
    <RadioCardGroup
      value={value}
      options={ROLE_OPTIONS.map((option) => ({
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
