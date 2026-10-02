/**
 * Tentacle place candidate: frosted iOS disc with category glyph; selected lifts into a pin.
 */
import { createElement } from "react";
import { Marker } from "react-map-gl/maplibre";
import { tentacleCategoryIcon } from "@/components/tools/ask/tentacleCategoryIcons";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import type { TentacleExtendedCategoryId } from "@/domain/questions";

export type TentaclePoiPinMarkerProps = {
  latitude: number;
  longitude: number;
  categoryId: TentacleExtendedCategoryId;
  selected?: boolean;
  /** Soften peers when another place is chosen. */
  dimmed?: boolean;
  label: string;
  onActivate: () => void;
};

export function TentaclePoiPinMarker({
  latitude,
  longitude,
  categoryId,
  selected = false,
  dimmed = false,
  label,
  onActivate,
}: TentaclePoiPinMarkerProps) {
  const green = MAP_ANNOTATION_COLORS.tentacle;
  const greenSoft = MAP_ANNOTATION_COLORS.tentacleAccent;
  // Selection reads via fill + stem, not bulk; keep disc near idle size.
  const size = selected ? 34 : 30;

  return (
    <Marker longitude={longitude} latitude={latitude} anchor={selected ? "bottom" : "center"}>
      <button
        type="button"
        data-testid="tentacle-poi-pin"
        data-category-id={categoryId}
        data-selected={selected ? "1" : undefined}
        data-dimmed={dimmed ? "1" : undefined}
        aria-label={label}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation();
          onActivate();
        }}
        className="pointer-events-auto flex flex-col items-center border-0 bg-transparent p-0"
        style={{
          minWidth: 40,
          minHeight: 40,
          justifyContent: selected ? "flex-end" : "center",
          opacity: dimmed ? 0.58 : 1,
          transform: selected ? "translateY(1px)" : undefined,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <span
          aria-hidden
          className="relative flex items-center justify-center"
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: selected ? green : "oklch(from var(--color-canvas) l c h / 0.96)",
            border: selected
              ? "1.25px solid oklch(1 0 0 / 0.92)"
              : "0.5px solid oklch(from var(--color-field-ink) l c h / 0.12)",
            boxShadow: selected
              ? `0 6px 14px 0 oklch(0.28 0.08 145 / 0.32), 0 0 0 2px oklch(from ${greenSoft} l c h / 0.32), 0 1px 0 0 oklch(1 0 0 / 0.35) inset`
              : "0 5px 12px 0 oklch(0.15 0.04 265 / 0.2), 0 1px 0 0 oklch(1 0 0 / 0.4) inset",
            color: selected ? "oklch(1 0 0 / 0.96)" : green,
            backdropFilter: selected ? undefined : "blur(18px) saturate(1.35)",
            WebkitBackdropFilter: selected ? undefined : "blur(18px) saturate(1.35)",
            transition:
              "width 160ms cubic-bezier(0.22, 1, 0.36, 1), height 160ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease-out, box-shadow 160ms ease-out",
          }}
        >
          {createElement(tentacleCategoryIcon(categoryId), {
            size: selected ? 16 : 14,
            weight: "fill",
            "aria-hidden": true,
          })}
        </span>
        {selected ? (
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              marginTop: -4,
              borderRadius: 1.5,
              backgroundColor: green,
              border: "0.5px solid oklch(1 0 0 / 0.7)",
              transform: "rotate(45deg)",
              boxShadow: "1px 2px 5px 0 oklch(0.2 0.06 145 / 0.26)",
            }}
          />
        ) : null}
      </button>
    </Marker>
  );
}
