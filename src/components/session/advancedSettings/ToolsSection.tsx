import { toggleToolInSettings } from "@/domain/session/tools/advancedSessionSettings";
import { MAP_TOOL_DOCK_ENTRIES } from "@/domain/map/mapTools";
import {
  ALL_CONFIGURABLE_TOOLS,
  type ConfigurableMapTool,
} from "@/domain/session/rules";
import {
  AdvancedSettingsCategory,
  AdvancedSettingsInset,
  AdvancedSettingsToggle,
} from "./shared";
import type { AdvancedSettingsSectionProps } from "./types";

export function ToolsSection({
  gameSize,
  value,
  onChange,
  disabled,
}: AdvancedSettingsSectionProps) {
  return (
    <AdvancedSettingsCategory title="Tools" defaultOpen={false}>
      {gameSize === "small" ? (
        <AdvancedSettingsInset>
          <AdvancedSettingsToggle
            checked={value.tentaclesEnabledOverride}
            onChange={(tentaclesEnabledOverride) =>
              onChange({ ...value, tentaclesEnabledOverride })
            }
            disabled={disabled}
            label="Enable tentacles on small games"
          />
        </AdvancedSettingsInset>
      ) : null}

      <AdvancedSettingsInset>
        {ALL_CONFIGURABLE_TOOLS.map((toolId, index) => {
          const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolId);
          const enabled = !value.disabledTools.includes(toolId);

          return (
            <AdvancedSettingsToggle
              key={toolId}
              checked={enabled}
              disabled={disabled}
              label={entry?.name ?? toolId}
              showSeparator={index > 0}
              onChange={(checked) =>
                onChange(
                  toggleToolInSettings(
                    value,
                    toolId as ConfigurableMapTool,
                    checked,
                  ),
                )
              }
            />
          );
        })}
      </AdvancedSettingsInset>
    </AdvancedSettingsCategory>
  );
}
