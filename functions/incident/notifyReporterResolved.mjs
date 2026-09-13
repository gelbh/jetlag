function selectReporterDeviceTokens(devices) {
  const tokens = [];
  for (const device of Object.values(devices)) {
    const token = typeof device?.token === "string" ? device.token.trim() : "";
    if (!token) continue;
    const preferences = device.preferences ?? {};
    if (preferences.enabled !== true) continue;
    if (preferences.incidentResolved === false) continue;
    tokens.push(token);
  }
  return tokens;
}

export async function loadUserDevices(db, reporterUid) {
  const snapshot = await db
    .collection("users")
    .doc(reporterUid)
    .collection("devices")
    .get();

  const devices = {};
  for (const doc of snapshot.docs) {
    devices[doc.id] = doc.data();
  }
  return devices;
}

/**
 * FCM multicast to users/{uid}/devices for incident_resolved.
 * Injectable messaging for tests.
 */
export async function sendReporterResolvedPush(db, payload, deps = {}) {
  const reporterUid = payload?.reporterUid;
  const incidentId = payload?.incidentId;
  if (!reporterUid || !incidentId) {
    return { sent: 0 };
  }

  const devices = await loadUserDevices(db, reporterUid);
  const tokens = selectReporterDeviceTokens(devices);
  if (tokens.length === 0) {
    return { sent: 0 };
  }

  const messaging =
    deps.messaging ??
    (await import("firebase-admin/messaging")).getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: "Issue fixed",
      body: "Your issue has been fixed. Open Jet Lag.",
    },
    data: {
      event: "incident_resolved",
      incidentId,
    },
    android: {
      priority: "high",
      notification: {
        channelId: "jetlag_alerts",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  });

  return { sent: response.successCount ?? 0 };
}

/**
 * Write incident notice + best-effort email/push for a resolved incident.
 * Never throws to the caller when email/push fail (those are swallowed).
 * Notice write failures propagate so the status handler can catch them.
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

  await noticeRef.set(
    {
      incidentId,
      status: "resolved",
      resolvedAt: nowIso,
      bannerDismissedAt: null,
    },
    { merge: true },
  );

  try {
    const email =
      typeof deps.getUserEmail === "function"
        ? await deps.getUserEmail(reporterUid)
        : null;
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

  try {
    if (typeof deps.sendPush === "function") {
      await deps.sendPush({ reporterUid, incidentId });
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn("[notifyReporterResolved] push failed:", detail);
  }

  return { ok: true };
}
