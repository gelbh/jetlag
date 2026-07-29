import { lazyWithChunkRetry } from "../../domain/device/updates/lazyWithChunkRetry";

export const HeavyToolHost = lazyWithChunkRetry(() =>
  import("../../components/tools/HeavyToolHost").then((module) => ({
    default: module.HeavyToolHost,
  })),
);

export const TransitLayer = lazyWithChunkRetry(() =>
  import("../../components/map/layers/TransitLayer").then((module) => ({
    default: module.TransitLayer,
  })),
);
