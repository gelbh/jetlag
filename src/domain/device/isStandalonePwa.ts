import { isIosStandalonePwa } from "./isIosStandalonePwa";

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (isIosStandalonePwa()) {
    return true;
  }

  if (typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches;
}
