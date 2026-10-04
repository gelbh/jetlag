import { createElement } from "react";
import { placeCategoryIcon } from "./placeCategoryIcon";

export function GeocodedPlaceLeading({ category }: { category: string }) {
  return createElement(placeCategoryIcon(category), {
    "aria-hidden": true,
    size: 18,
    weight: "bold",
    className: "mt-0.5 shrink-0 text-current",
  });
}
