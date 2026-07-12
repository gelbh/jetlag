import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { QUESTION_DOCK_TOOL_IDS } from "../../domain/map/mapTools";
import type { MapTool } from "../../state/sessionStore";

export function useToolDockMenus(dockRef: RefObject<HTMLDivElement | null>) {
  const [drawMenuOpen, setDrawMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!drawMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setDrawMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDrawMenuOpen(false);
        setMoreMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawMenuOpen, dockRef]);

  useEffect(() => {
    if (!moreMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreMenuOpen]);

  const closeMenus = () => {
    setDrawMenuOpen(false);
    setMoreMenuOpen(false);
  };

  return {
    drawMenuOpen,
    setDrawMenuOpen,
    moreMenuOpen,
    setMoreMenuOpen,
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
