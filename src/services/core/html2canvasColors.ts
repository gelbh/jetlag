const COLOR_STYLE_KEYS = [
  "backgroundColor",
  "color",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
] as const;

export function forceRgbCssColorsInClone(root: HTMLElement): void {
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) {
    return;
  }

  const toRgb = (value: string): string => {
    if (!value || value === "transparent" || value.startsWith("rgb")) {
      return value;
    }
    probe.fillStyle = "#000000";
    probe.fillStyle = value;
    return String(probe.fillStyle);
  };

  const paint = (node: HTMLElement): void => {
    const computed = getComputedStyle(node);
    for (const key of COLOR_STYLE_KEYS) {
      node.style[key] = toRgb(computed[key]);
    }
  };

  const visit = (node: Element): void => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    paint(node);

    for (const child of node.children) {
      visit(child);
    }
  };

  // html2canvas reads documentElement/body backgrounds; paint those two nodes only.
  const doc = root.ownerDocument;
  if (doc.documentElement instanceof HTMLElement) {
    paint(doc.documentElement);
  }
  if (doc.body instanceof HTMLElement) {
    paint(doc.body);
  }
  visit(root);
}
