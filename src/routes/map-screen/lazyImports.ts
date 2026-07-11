import { lazyWithChunkRetry } from "../../domain/device/lazyWithChunkRetry";

export const HeavyMapToolsSlot = lazyWithChunkRetry(() =>
  import("../../components/tools/HeavyMapToolsSlot").then((module) => ({
    default: module.HeavyMapToolsSlot,
  })),
);

export const TransitLayer = lazyWithChunkRetry(() =>
  import("../../components/map/TransitLayer").then((module) => ({
    default: module.TransitLayer,
  })),
);
