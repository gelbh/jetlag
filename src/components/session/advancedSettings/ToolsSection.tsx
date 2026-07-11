import { toggleToolInSettings } from "../../../domain/session/advancedSessionSettings";
import { MAP_TOOL_DOCK_ENTRIES } from "../../../domain/map/mapTools";
import {
  ALL_CONFIGURABLE_TOOLS,
  type ConfigurableMapTool,
} from "../../../domain/session/sessionRules";
import type { AdvancedSettingsSectionProps } from "./types";

export function ToolsSection({
  gameSize,
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
        Tools
      </p>

      {gameSize === "small" ? (
        <label className="flex items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={value.tentaclesEnabledOverride}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                ...value,
                tentaclesEnabledOverride: event.target.checked,
              })
            }
            className="mt-1"
          />
          <span>
            <span className="block font-medium">Enable tentacles on small games</span>
          </span>
        </label>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {ALL_CONFIGURABLE_TOOLS.map((toolId) => {
          const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
          const enabled = !value.disabledTools.includes(toolId);

          return (
            <label
              key={toolId}
              className="flex items-center gap-2 text-sm text-ink"
            >
              <input
                type="checkbox"
                checked={enabled}
                disabled={disabled}
                onChange={(event) =>
                  onChange(
                    toggleToolInSettings(
                      value,
                      toolId as ConfigurableMapTool,
                      event.target.checked,
                    ),
                  )
                }
              />
              <span>{entry?.name ?? toolId}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
