import { type RefObject, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { QUESTION_DOCK_TOOL_IDS } from "../../domain/map/mapTools";
import type { MapTool } from "../../state/sessionStore";

export function useToolDockMenus(dockRef: RefObject<HTMLDivElement | null>) {
  const [drawMenuOpen, setDrawMenuOpen] = useState(false);

  useEffect(() => {
    if (!drawMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      // Clicks on the dock itself (including the Draw toggle) stay local.
      if (dockRef.current?.contains(target)) {
        return;
      }
      // Draw menu SheetHost portals outside the dock. Closing on pointerdown
      // unmounts the sheet before click when Drawer transition duration is 0
      // (reduced motion / low power), so Pin/Zone never select. SheetHost owns
      // overlay / Escape dismiss.
      if (
        target instanceof Element &&
        target.closest(
          '.mantine-Drawer-content, .mantine-Drawer-inner, [data-testid="mantine-drawer-sheet"], [role="dialog"]',
        )
      ) {
        return;
      }
      setDrawMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawMenuOpen, dockRef]);

  const closeMenus = useCallback(() => {
    setDrawMenuOpen(false);
  }, []);

  return {
    drawMenuOpen,
    setDrawMenuOpen,
    closeMenus,
  };
}

export function useToolDockHighlight(
  mainGroupRef: RefObject<HTMLDivElement | null>,
  activeTool: MapTool,
  viewportBottomInset: number,
  visibleQuestionToolCount: number,
) {
  const [dockHighlight, setDockHighlight] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const updateDockHighlight = useCallback(() => {
    const group = mainGroupRef.current;
    const isQuestionTool = QUESTION_DOCK_TOOL_IDS.includes(
      activeTool as (typeof QUESTION_DOCK_TOOL_IDS)[number],
    );

    if (!group || activeTool === "none" || !isQuestionTool) {
      setDockHighlight(null);
      return;
    }

    const slot = group.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (!slot) {
      setDockHighlight(null);
      return;
    }

    const groupRect = group.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    setDockHighlight({
      x: slotRect.left - groupRect.left,
      y: slotRect.top - groupRect.top,
      width: slotRect.width,
      height: slotRect.height,
    });
  }, [activeTool, mainGroupRef]);

  useLayoutEffect(() => {
    updateDockHighlight();
  }, [updateDockHighlight, activeTool, viewportBottomInset, visibleQuestionToolCount]);

  useEffect(() => {
    window.addEventListener("resize", updateDockHighlight);
    return () => window.removeEventListener("resize", updateDockHighlight);
  }, [updateDockHighlight, viewportBottomInset, visibleQuestionToolCount]);

  return dockHighlight;
}
