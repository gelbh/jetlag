import { getMessaging } from "firebase-admin/messaging";
import {
  buildNotificationPayload,
  selectDeviceTokens,
} from "./notifySessionEvent.mjs";

export async function loadSessionDevices(db, sessionId) {
  const snapshot = await db
    .collection("sessions")
    .doc(sessionId)
    .collection("devices")
    .get();

  const devices = {};
  for (const doc of snapshot.docs) {
    devices[doc.id] = doc.data();
  }

  return devices;
}

export async function sendSessionNotification(db, input) {
  const payload = buildNotificationPayload(input.eventType, input.context);
  if (!payload) {
    return { sent: 0 };
  }

  const devices = await loadSessionDevices(db, input.sessionId);
  const tokens = selectDeviceTokens(devices, input);
  if (tokens.length === 0) {
    return { sent: 0 };
  }

  const messaging = getMessaging();
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
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

  return { sent: response.successCount };
}

export async function handlePendingQuestionWrite(db, event) {
  const sessionId = event.params.sessionId;
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!after) {
    return;
  }

  if (!before) {
    await sendSessionNotification(db, {
      sessionId,
      eventType: "new_question",
      senderUid: after.createdByUid,
      context: {
        sessionId,
        questionId: event.params.questionId,
        toolType: after.toolType,
      },
    });
    return;
  }

  if (before.status !== "answered" && after.status === "answered") {
    await sendSessionNotification(db, {
      sessionId,
      eventType: "question_answered",
      senderUid: after.answeredByUid ?? after.createdByUid,
      context: {
        sessionId,
        questionId: event.params.questionId,
        toolType: after.toolType,
      },
    });
    return;
  }

  if (!before.deadlineExpiredAt && after.deadlineExpiredAt) {
    await sendSessionNotification(db, {
      sessionId,
      eventType: "question_deadline_expired",
      context: {
        sessionId,
        questionId: event.params.questionId,
        toolType: after.toolType,
      },
    });
  }
}

export async function handleSessionTimerWrite(db, event) {
  const sessionId = event.params.sessionId;
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();

  if (!before || !after) {
    return;
  }

  const timerChanged =
    before.timerAccumulatedMs !== after.timerAccumulatedMs ||
    before.timerRunningSince !== after.timerRunningSince;

  if (!timerChanged) {
    return;
  }

  await sendSessionNotification(db, {
    sessionId,
    eventType: "timer_changed",
    senderUid: after.hostUid,
    context: {
      sessionId,
      running: after.timerRunningSince != null,
    },
  });
}

export async function handleSessionMessageWrite(db, event) {
  const sessionId = event.params.sessionId;
  const after = event.data?.after?.data();

  if (!after) {
    return;
  }

  if (after.channel !== "social") {
    return;
  }

  await sendSessionNotification(db, {
    sessionId,
    eventType: "chat_message",
    senderUid: after.senderUid,
    context: {
      sessionId,
      channel: after.channel,
      preview:
        typeof after.text === "string" ? after.text.slice(0, 120) : "New message",
    },
  });
}
