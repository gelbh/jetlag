import { lazy, type ReactNode, Suspense } from "react";
import type { MapViewProps } from "./mapViewTypes";

export type {
  MapViewCoreProps,
  MapViewMapLibreChromeProps,
  MapViewMapLibreProps,
  MapViewModel,
  MapViewProps,
} from "./mapViewTypes";

const MapViewMapLibreLazy = lazy(async () => {
  const mod = await import("./MapViewMapLibre");
  return { default: mod.MapViewMapLibre };
});

function MapLibreSuspense({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div
          className={`${className ?? "h-full w-full"} jl-basemap--dark-canvas`}
          aria-busy="true"
          role="status"
        />
      }
    >
      {children}
    </Suspense>
  );
}

/** Production map shell (MapLibre only). */
export function MapView({ model, children }: MapViewProps) {
  return (
    <MapLibreSuspense className={model.className}>
      <MapViewMapLibreLazy model={model}>{children}</MapViewMapLibreLazy>
    </MapLibreSuspense>
  );
}
