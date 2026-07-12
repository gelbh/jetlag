import {
  useWizardSwipe,
  type UseWizardSwipeOptions,
  type UseWizardSwipeResult,
} from "./useWizardSwipe";

/** Wizard step swipes always use pointer capture so gestures work over buttons and inputs. */
export function useAdaptiveWizardSwipe(
  options: UseWizardSwipeOptions,
): UseWizardSwipeResult & { useFramerSwipe: boolean } {
  const cssSwipe = useWizardSwipe(options);
  return { ...cssSwipe, useFramerSwipe: false };
}
