async function sendReporterEmail(reporterUid, deps) {
  try {
    const email =
      typeof deps.getUserEmail === "function" ? await deps.getUserEmail(reporterUid) : null;
    if (email && typeof deps.sendEmail === "function") {
      const homeUrl = deps.homeUrl ?? "https://jetlag.gelbhart.dev/";
      await deps.sendEmail({
        audience: "reporter",
        to: email,
        subject: "Your Jet Lag issue has been fixed",
        text: `Your reported issue has been fixed. Open Jet Lag and refresh or update if needed.\n\n${homeUrl}`,
      });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn("[notifyReporterResolved] email failed:", detail);
  }
}

/**
 * Write incident notice + best-effort email for a resolved incident.
 * Notice write is awaited. Email is fire-and-forget unless
 * deps.waitForChannels is true (tests).
 */
export async function notifyReporterResolved(db, input, deps = {}) {
  const reporterUid = input?.reporterUid;
  const incidentId = input?.incidentId;
  if (!reporterUid || !incidentId) return { skipped: true };

  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  const noticeRef = db
    .collection("users")
    .doc(reporterUid)
    .collection("incidentNotices")
    .doc(incidentId);

  try {
    await noticeRef.set(
      {
        incidentId,
        status: "resolved",
        resolvedAt: nowIso,
        bannerDismissedAt: null,
      },
      { merge: true },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn("[notifyReporterResolved] notice write failed:", detail);
    throw error;
  }

  const emailPromise = sendReporterEmail(reporterUid, deps);
  if (deps.waitForChannels === true) {
    await emailPromise;
  } else {
    void emailPromise;
  }

  return { ok: true };
}
