import { isAuthBootstrapReady, isFirebaseConfigured } from "../services/core/firebase";
import { isPlayAreaReadySync } from "../services/geo/resolveSessionMatchingAreas";
import { usePremiumEntitlementsStore } from "../state/premiumEntitlementsStore";
import { useSessionStore } from "../state/sessionStore";
import { isLazyRoute, normalizeRoutePath } from "./routeMetadata";
import { isRouteImportWarm } from "./routeWarmState";

export type RouteLoadingStepId =
  | "download-screen"
  | "load-boundaries"
  | "prepare-map"
  | "check-sign-in"
  | "load-premium"
  | "verify-admin"
  | "open-screen";

export type RouteLoadingProgress = {
  destinationTitle: string;
  steps: RouteLoadingStepId[];
  currentStepIndex: number;
  currentStepLabel: string;
};

export function destinationTitleForPath(path: string): string {
  switch (normalizeRoutePath(path)) {
    case "/":
      return "Home";
    case "/map":
      return "Map";
    case "/create":
      return "Create session";
    case "/join":
      return "Join session";
    case "/tutorial":
      return "Tutorial";
    case "/presets":
      return "Presets";
    case "/presets/new":
      return "New preset";
    case "/presets/:id/edit":
      return "Edit preset";
    case "/premium":
      return "Premium";
    case "/admin":
      return "Admin";
    default:
      return "Page";
  }
}

export function labelForStep(
  stepId: RouteLoadingStepId,
  destinationTitle: string,
): string {
  switch (stepId) {
    case "download-screen":
      return "Downloading screen…";
    case "load-boundaries":
      return "Loading game boundaries…";
    case "prepare-map":
      return "Preparing map…";
    case "check-sign-in":
      return "Checking sign-in…";
    case "load-premium":
      return "Loading subscription…";
    case "verify-admin":
      return "Verifying admin access…";
    case "open-screen":
      return `Opening ${destinationTitle}…`;
    default: {
      const _exhaustive: never = stepId;
      return _exhaustive;
    }
  }
}

function baseStepsForPath(normalizedPath: string): RouteLoadingStepId[] {
  switch (normalizedPath) {
    case "/map":
      return ["download-screen", "load-boundaries", "prepare-map"];
    case "/":
      return ["check-sign-in"];
    case "/create":
      return ["download-screen", "open-screen"];
    case "/join":
      return ["open-screen"];
    case "/tutorial":
      return ["download-screen", "open-screen"];
    case "/presets":
    case "/presets/new":
    case "/presets/:id/edit":
      return ["download-screen", "open-screen"];
    case "/premium":
      return ["load-premium"];
    case "/admin":
      return ["verify-admin"];
    default:
      return ["open-screen"];
  }
}

export function isLoadingStepComplete(
  stepId: RouteLoadingStepId,
  path: string,
  screenReady: boolean,
): boolean {
  const normalizedPath = normalizeRoutePath(path);
  switch (stepId) {
    case "download-screen":
      return !isLazyRoute(normalizedPath) || isRouteImportWarm(path);
    case "load-boundaries":
      return isPlayAreaReadySync(useSessionStore.getState().session);
    case "prepare-map":
      return screenReady;
    case "check-sign-in":
      return !isFirebaseConfigured() || isAuthBootstrapReady();
    case "load-premium":
      return usePremiumEntitlementsStore.getState().hydrated;
    case "verify-admin":
      return !isFirebaseConfigured() || isAuthBootstrapReady();
    case "open-screen":
      return screenReady;
    default: {
      const _exhaustive: never = stepId;
      return _exhaustive;
    }
  }
}

export function resolveLoadingSteps(path: string): RouteLoadingStepId[] {
  const normalizedPath = normalizeRoutePath(path);
  const session = useSessionStore.getState().session;

  return baseStepsForPath(normalizedPath).filter((step) => {
    if (step === "download-screen") {
      return isLazyRoute(normalizedPath) && !isRouteImportWarm(path);
    }
    if (step === "load-boundaries") {
      return !isPlayAreaReadySync(session);
    }
    return true;
  });
}

export function computeLoadingProgress(
  path: string,
  screenReady: boolean,
): RouteLoadingProgress {
  const destinationTitle = destinationTitleForPath(path);
  const steps = resolveLoadingSteps(path);

  if (steps.length === 0) {
    return {
      destinationTitle,
      steps: ["open-screen"],
      currentStepIndex: 0,
      currentStepLabel: labelForStep("open-screen", destinationTitle),
    };
  }

  let currentStepIndex = steps.length - 1;
  for (let index = 0; index < steps.length; index += 1) {
    if (!isLoadingStepComplete(steps[index], path, screenReady)) {
      currentStepIndex = index;
      break;
    }
  }

  const currentStepId = steps[currentStepIndex];

  return {
    destinationTitle,
    steps,
    currentStepIndex,
    currentStepLabel: labelForStep(currentStepId, destinationTitle),
  };
}
