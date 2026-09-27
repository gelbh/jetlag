/**
 * Category icon pin (Matching / Measuring): frosted disc + category glyph.
 */
import { createElement } from "react";
import { Marker } from "react-map-gl/maplibre";
import type { MatchingCategoryId, MeasuringFromKind } from "@/domain/questions";
import { matchingCategoryIcon } from "@/components/tools/ask/matchingCategoryIcons";
import {
  hasMeasuringCategoryIcon,
  measuringCategoryIcon,
} from "@/components/tools/ask/measuringCategoryIcons";

export type MatchingCategoryPinMarkerProps = {
  latitude: number;
  longitude: number;
  categoryId: string;
  pulsing?: boolean;
};

function placementCategoryIcon(categoryId: string) {
  if (hasMeasuringCategoryIcon(categoryId)) {
    return measuringCategoryIcon(categoryId as MeasuringFromKind);
  }
  return matchingCategoryIcon(categoryId as MatchingCategoryId);
}

export function MatchingCategoryPinMarker({
  latitude,
  longitude,
  categoryId,
  pulsing = false,
}: MatchingCategoryPinMarkerProps) {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <div
        data-testid="matching-category-pin"
        data-category-id={categoryId}
        data-pulsing={pulsing ? "1" : undefined}
        className="pointer-events-none flex flex-col items-center"
        style={{ transform: "translateY(1px)" }}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: "oklch(from var(--color-canvas) l c h / 0.96)",
            border: "0.5px solid oklch(from var(--color-field-ink) l c h / 0.12)",
            boxShadow:
              "0 8px 20px 0 oklch(0.15 0.04 265 / 0.28), 0 1px 0 0 oklch(1 0 0 / 0.35) inset",
            color: "var(--color-flag)",
            backdropFilter: "blur(18px) saturate(1.35)",
            WebkitBackdropFilter: "blur(18px) saturate(1.35)",
          }}
        >
          <span
            aria-hidden
            style={{
              position: "absolute",
              inset: 5,
              borderRadius: "50%",
              backgroundColor: "oklch(from var(--color-flag) l c h / 0.12)",
            }}
          />
          {pulsing ? (
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: -5,
                borderRadius: "50%",
                border: "2px solid oklch(from var(--color-flag) l c h / 0.4)",
                animation: "matching-pin-pulse 1.35s ease-out infinite",
              }}
            />
          ) : null}
          {createElement(placementCategoryIcon(categoryId), {
            size: 22,
            weight: "fill",
            "aria-hidden": true,
            style: { position: "relative", zIndex: 1 },
          })}
        </div>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            marginTop: -5,
            borderRadius: 2,
            backgroundColor: "oklch(from var(--color-canvas) l c h / 0.96)",
            border: "0.5px solid oklch(from var(--color-field-ink) l c h / 0.12)",
            transform: "rotate(45deg)",
            boxShadow: "2px 2px 6px 0 oklch(0.15 0.04 265 / 0.2)",
          }}
        />
        <style>{`
          @keyframes matching-pin-pulse {
            0% { opacity: 0.65; transform: scale(1); }
            100% { opacity: 0; transform: scale(1.4); }
          }
        `}</style>
      </div>
    </Marker>
  );
}
