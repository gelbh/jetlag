import type { MapTool } from "../../map/mapToolTypes";
import type { DistanceUnit } from "../../map/distance";
import type { ThermometerDistanceOptionMiles } from "../../questions/thermometerQuestions";
import { toolDockEnabled } from "../gameSizeRules";
import { resolveTentaclesEnabledForSession } from "./tentacleRules";
import {
  ALL_CONFIGURABLE_TOOLS,
  sessionGameSize,
  type ConfigurableMapTool,
  type SessionRulesInput,
} from "./types";

export function resolveToolDockEnabled(
  session: SessionRulesInput,
  toolId: Exclude<MapTool, "none">,
  options?: { hasHiders?: boolean },
): boolean {
  if (session.disabledTools?.includes(toolId)) {
    return false;
  }

  if (toolId === "tentacle") {
    return resolveTentaclesEnabledForSession(session);
  }

  return toolDockEnabled(toolId, sessionGameSize(session), options);
}

export function isConfigurableMapTool(
  toolId: string,
): toolId is ConfigurableMapTool {
  return (ALL_CONFIGURABLE_TOOLS as readonly string[]).includes(toolId);
}

export function parseDisabledTools(value: unknown): ConfigurableMapTool[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const tools = value.filter(isConfigurableMapTool);
  return tools.length > 0 ? tools : undefined;
}

export function parseThermometerPresetMeters(
  value: unknown,
): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const presets = value.filter(
    (item): item is number => typeof item === "number" && item > 0,
  );

  return presets.length > 0 ? presets : undefined;
}

export function parseThermometerPresetMiles(
  value: unknown,
): ThermometerDistanceOptionMiles[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const presets = value.filter(
    (item): item is ThermometerDistanceOptionMiles =>
      item === 0.5 || item === 3 || item === 10 || item === 50,
  );

  return presets.length > 0 ? presets : undefined;
}

export function parseDistanceUnit(value: unknown): DistanceUnit | undefined {
  return value === "metric" || value === "imperial" ? value : undefined;
}
