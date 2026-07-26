export function isIosStandalonePwa(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  const isIos =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if (!isIos) {
    return false;
  }

  return (
    Boolean(navigatorWithStandalone.standalone) ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}
