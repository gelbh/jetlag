function captureClientException(
  error: unknown,
  additionalProperties?: Record<string, unknown>,
): void {
  void import("./analytics")
    .then((m) => m.capturePosthogException(error, additionalProperties))
    .catch(() => {});
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

/** Same capture shape as the former ErrorBoundary helper (component stack on the exception). */
export function captureErrorBoundaryException(
  error: unknown,
  componentStack: string | null | undefined,
): void {
  captureClientException(error, {
    componentStack: componentStack ?? "",
  });
}

export function captureException(error: unknown): void {
  captureClientException(error);
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

export interface AppResumeContext {
  pathname: string;
  backgroundMs: number;
  standalone: boolean;
  iosStandalone: boolean;
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
