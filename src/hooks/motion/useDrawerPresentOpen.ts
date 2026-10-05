import { useEffect, useState } from "react";

/**
 * Mantine Drawer skips enter when first painted with opened=true.
 * Delay presented open by one effect tick so closed→open always runs.
 */
export function useDrawerPresentOpen(open: boolean): boolean {
  const [presented, setPresented] = useState(false);

  useEffect(() => {
    if (!open) {
      setPresented(false);
      return;
    }
    setPresented(true);
  }, [open]);

  return open && presented;
}
