import { lazyWithChunkRetry } from "../../domain/device/lazyWithChunkRetry";

export const HeavyToolHost = lazyWithChunkRetry(() =>
  import("../../components/tools/HeavyToolHost").then((module) => ({
    default: module.HeavyToolHost,
  })),
);

export const TransitLayer = lazyWithChunkRetry(() =>
  import("../../components/map/TransitLayer").then((module) => ({
    default: module.TransitLayer,
  })),
);
