import type { StorageEstimateSnapshot } from "@/domain/device/pwa/pwaStorageBudget";

// ponytail: no PostHog breadcrumb trail in P3; upgrade via $exception properties or custom events after Accept if needed.

function captureClientException(
  error: unknown,
  additionalProperties?: Record<string, unknown>,
): void {
  void import("./analytics")
    .then((m) => m.capturePosthogException(error, additionalProperties))
    .catch(() => {});
}

export function syncSentryUser(_user: { uid: string } | null): void {}

export function setBootstrapTag(_phase: string): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export function captureAuthPersistenceFallback(mode: "session" | "memory", error?: unknown): void {
  captureClientException(error ?? new Error(`Auth persistence fell back to ${mode}`), {
    auth_persistence: mode,
  });
}

export function captureAuthBootstrapFailure(error: unknown): void {
  captureClientException(error, { bootstrap_phase: "auth_failed" });
}

export type AppCheckCaptureContext = {
  source?: string;
  reason?: "timeout" | "blocked" | "error" | string;
  soft?: boolean;
};

export function captureAppCheckTokenFailure(
  error: unknown,
  context?: AppCheckCaptureContext,
): void {
  if (context?.soft === true) {
    return;
  }

  const { soft: _soft, ...extras } = context ?? {};
  captureClientException(error, {
    app_check_token: "failed",
    ...extras,
  });
}

/** Same capture shape as the former Sentry ErrorBoundary (component stack on the exception). */
export function captureErrorBoundaryException(
  error: unknown,
  componentStack: string | null | undefined,
): void {
  captureClientException(error, {
    componentStack: componentStack ?? "",
  });
}

export function addRecoverableErrorBreadcrumb(_error: unknown, _componentStack?: string): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export function setTransactionName(_pathname: string): void {}

export function captureException(error: unknown): void {
  captureClientException(error);
}

/** Expected join/heal permission-denied — breadcrumb only (no issue). */
export function reportJoinPermissionDenied(_phase: "initial" | "retry"): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

/** Expected mid-session listen permission loss — breadcrumb only (no issue). */
export function reportFirestoreListenPermissionDenied(): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export function capturePhotoUploadFailure(
  error: unknown,
  stage: "compress" | "storage" | "firestore",
  context?: Record<string, unknown>,
): void {
  captureClientException(error, {
    photo_upload: stage,
    ...(context ?? {}),
  });
}

export function capturePendingResolveFailure(
  error: unknown,
  context: { toolType: string; pendingQuestionId?: string },
): void {
  captureClientException(error, {
    pending_resolve_failed: "true",
    toolType: context.toolType,
    ...(context.pendingQuestionId ? { pendingQuestionId: context.pendingQuestionId } : {}),
  });
}

export function addPhotoUploadBreadcrumb(_details: Record<string, unknown>): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export interface SlowRouteTransitionDetails {
  preload_ms: number;
  ready_wait_ms: number;
  total_ms: number;
  target_path: string;
  final_path: string;
  readiness_kind: string;
  warm_chunk: boolean;
  warm_ready: boolean;
}

export function reportSlowRouteTransition(_details: SlowRouteTransitionDetails): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export interface AppResumeContext {
  pathname: string;
  backgroundMs: number;
  standalone: boolean;
  iosStandalone: boolean;
}

export function addAppResumeBreadcrumb(_context: AppResumeContext): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export function addPwaStoragePressureBreadcrumb(_snapshot: StorageEstimateSnapshot): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export function captureResumeShellUnresponsive(
  context: Omit<AppResumeContext, "backgroundMs"> & {
    backgroundMs: number;
    adminRoute?: boolean;
  },
): void {
  captureClientException(new Error("resume_shell_unresponsive"), {
    resume_watchdog: "unresponsive",
    pathname: context.pathname,
    backgroundMs: context.backgroundMs,
    standalone: context.standalone,
    ios_standalone: context.iosStandalone,
    ...(context.adminRoute ? { admin_route: true } : {}),
  });
}

export function addWriteRejectedBreadcrumb(_label: string, _error: unknown): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}

export function addIdbDeleteFailureBreadcrumb(_error: unknown): void {
  if (import.meta.env.MODE === "test") {
    return;
  }
}
