import { useShallow } from "zustand/react/shallow";
import { selectPreloadBanner, usePreloadStore } from "@/state/preloadStore";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";

/** @deprecated Use GameAreaPreloadBeacon on the map HUD instead. */
export function GameAreaPreloadBanner() {
  const banner = usePreloadStore(useShallow(selectPreloadBanner));
  const dismiss = usePreloadStore((state) => state.dismiss);

  if (!banner.visible) {
    return null;
  }

  return (
    <MapFloatSurface
      tone={banner.failed ? "warn" : "info"}
      role="status"
      className="pointer-events-auto mx-3 mt-2 text-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{banner.title}</p>
          <p className="mt-0.5 text-xs">{banner.body}</p>
        </div>
        {!banner.loading ? (
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-xs font-medium underline underline-offset-2"
          >
            Dismiss
          </button>
        ) : null}
      </div>
    </MapFloatSurface>
  );
}
