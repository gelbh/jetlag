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

export const AdminBoundariesLayer = lazyWithChunkRetry(() =>
  import("../../components/map/layers/AdminBoundariesLayer").then((module) => ({
    default: module.AdminBoundariesLayer,
  })),
);
