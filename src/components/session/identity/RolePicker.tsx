import { BinocularsIcon, DetectiveIcon, EyeIcon, ShieldIcon } from "@phosphor-icons/react";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { SectionLabel } from "../../ui/entry/entryChrome";

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

function RoleGlyph({ role }: { role: PlayerRole }) {
  switch (role) {
    case "seeker":
      return <BinocularsIcon size={36} weight="bold" aria-hidden />;
    case "hider":
      return <DetectiveIcon size={36} weight="bold" aria-hidden />;
    case "observer":
      return <EyeIcon size={36} weight="bold" aria-hidden />;
    case "admin":
      return <ShieldIcon size={36} weight="bold" aria-hidden />;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

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
    <div className="px-1 py-3">
      <SectionLabel>Choose your side</SectionLabel>
      <div role="radiogroup" aria-label="Player side" className="mt-3 grid grid-cols-2 gap-3">
        {roleOptions.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${playerRoleLabel(option.value)}. ${option.summary}`}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-4 disabled:opacity-50 ${
                selected
                  ? "border-flag bg-flag-soft text-flag"
                  : "border-rule bg-canvas text-field-ink"
              }`}
            >
              <RoleGlyph role={option.value} />
              <span className="text-center text-[1.0625rem] font-semibold tracking-[-0.01em]">
                {playerRoleLabel(option.value)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
