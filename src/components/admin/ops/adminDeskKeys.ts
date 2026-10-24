import type { RefObject } from "react";

/** Dialog, drawer, popover or menu open: it owns its own keystrokes. */
export function dialogIsOpen(): boolean {
  return (
    document.activeElement?.closest('[role="dialog"], [role="menu"]') != null ||
    document.querySelector('[role="dialog"], [role="menu"], [aria-modal="true"]') != null
  );
}

/** Not default-prevented up front: a dialog keeps its own `/`, `j`, `k` and Escape. */
export function unlessDialog(event: KeyboardEvent, run: () => void) {
  if (dialogIsOpen()) return;
  event.preventDefault();
  run();
}

export const PASSIVE_HOTKEY = { preventDefault: false } as const;

const ROW_SELECTOR = "tbody tr, [data-desk-row]";

export function moveRowFocus(root: RefObject<HTMLElement | null>, delta: 1 | -1) {
  const rows = [...(root.current?.querySelectorAll<HTMLElement>(ROW_SELECTOR) ?? [])];
  if (rows.length === 0) return;
  const current = rows.indexOf(document.activeElement as HTMLElement);
  const next =
    current === -1
      ? delta > 0
        ? 0
        : rows.length - 1
      : Math.min(Math.max(current + delta, 0), rows.length - 1);
  rows[next]?.focus();
  rows[next]?.scrollIntoView?.({ block: "nearest" });
}

export function focusSearch(root: RefObject<HTMLElement | null>) {
  root.current?.querySelector<HTMLInputElement>('input[aria-label="Search sessions"]')?.focus();
}
