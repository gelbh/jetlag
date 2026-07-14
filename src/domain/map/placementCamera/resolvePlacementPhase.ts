import type { MapTool } from "../mapToolTypes";
import type { PlacementCameraDraftState, PlacementPhase } from "./types";

export function resolvePlacementPhase(
  tool: MapTool,
  draft: PlacementCameraDraftState,
): PlacementPhase {
  switch (tool) {
    case "none":
    case "photo":
      return "idle";
    case "pin":
      return draft.pin.point ? "pick_center" : "idle";
    case "radar": {
      if (draft.radar.answer) {
        return "answered";
      }
      if (draft.radar.center && draft.radar.radiusMeters > 0) {
        return "pick_radius";
      }
      if (draft.radar.center) {
        return "pick_center";
      }
      return "idle";
    }
    case "tentacle": {
      if (draft.tentacle.outOfReach) {
        return "answered";
      }
      if (
        draft.tentacle.center &&
        draft.tentacle.searchRadiusMeters > 0 &&
        draft.tentacle.pois.length > 0
      ) {
        return "pick_poi";
      }
      if (draft.tentacle.center && draft.tentacle.searchRadiusMeters > 0) {
        return "pick_radius";
      }
      if (draft.tentacle.center) {
        return "pick_center";
      }
      return "idle";
    }
    case "thermometer": {
      if (draft.thermometer.answer && draft.thermometer.thermoA && draft.thermometer.thermoB) {
        return "answered";
      }
      if (draft.thermometer.walkActive) {
        return "pick_second_point";
      }
      if (draft.thermometer.thermoA && draft.thermometer.thermoB) {
        return "await_answer";
      }
      if (draft.thermometer.thermoA) {
        return "pick_second_point";
      }
      return "idle";
    }
    case "measuring": {
      if (draft.measuring.eliminationPreview) {
        return "answered";
      }
      if (draft.measuring.seekerResolving) {
        return "await_answer";
      }
      if (draft.measuring.seekerPoint) {
        return "pick_second_point";
      }
      return "idle";
    }
    case "matching": {
      if (draft.matching.eliminationPreview) {
        return "answered";
      }
      if (draft.matching.seekerResolving) {
        return "await_answer";
      }
      if (draft.matching.seekerPoint) {
        return "pick_second_point";
      }
      return "idle";
    }
    case "zone":
      return draft.zone.vertices.length > 0 ? "pick_center" : "idle";
    default: {
      const unreachable: never = tool;
      return unreachable;
    }
  }
}
