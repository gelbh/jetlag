export function isFirstTimerStartTransition(before, after) {
  const wasStopped =
    before?.timerRunningSince == null ||
    before?.timerRunningSince === undefined;
  const isRunning = typeof after?.timerRunningSince === "string";

  return wasStopped && isRunning;
}

function buildStartingLocationDocument(sessionId, uid, location, memberRoles, capturedAt) {
  const roleFromLocation =
    location.role === "hider" || location.role === "seeker"
      ? location.role
      : null;
  const roleFromSession =
    memberRoles?.[uid] === "hider" || memberRoles?.[uid] === "seeker"
      ? memberRoles[uid]
      : "seeker";

  return {
    uid,
    sessionId,
    lat: Number(location.lat),
    lng: Number(location.lng),
    ...(typeof location.accuracyMeters === "number"
      ? { accuracyMeters: location.accuracyMeters }
      : {}),
    role: roleFromLocation ?? roleFromSession,
    capturedAt,
  };
}

export async function captureStartingLocationsForSession(db, sessionId, capturedAt) {
  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    return { captured: 0 };
  }

  const session = sessionSnap.data() ?? {};
  const memberRoles = session.memberRoles ?? {};

  const locationsSnap = await sessionRef.collection("playerLocations").get();
  if (locationsSnap.empty) {
    return { captured: 0 };
  }

  const batch = db.batch();
  let captured = 0;

  for (const locationDoc of locationsSnap.docs) {
    const location = locationDoc.data() ?? {};
    if (typeof location.lat !== "number" || typeof location.lng !== "number") {
      continue;
    }

    const startingRef = sessionRef
      .collection("startingLocations")
      .doc(locationDoc.id);
    batch.set(
      startingRef,
      buildStartingLocationDocument(
        sessionId,
        locationDoc.id,
        location,
        memberRoles,
        capturedAt,
      ),
    );
    captured += 1;
  }

  if (captured > 0) {
    await batch.commit();
  }

  return { captured };
}

export async function handleCaptureStartingLocationsWrite(db, event) {
  const sessionId = event.params.sessionId;
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!after) {
    return;
  }

  if (!isFirstTimerStartTransition(before, after)) {
    return;
  }

  const capturedAt =
    typeof after.timerRunningSince === "string"
      ? after.timerRunningSince
      : new Date().toISOString();

  await captureStartingLocationsForSession(db, sessionId, capturedAt);
}
