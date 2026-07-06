const TOOL_LABELS = {
  radar: "Radar",
  thermometer: "Thermometer",
  measuring: "Measuring",
  matching: "Matching",
  tentacle: "Tentacles",
  zone: "Zone",
  pin: "Pin",
};

export function toolLabel(toolType) {
  if (typeof toolType !== "string") {
    return "Question";
  }

  return TOOL_LABELS[toolType] ?? "Question";
}

export function shouldNotifyForPreference(preferences, eventType) {
  if (!preferences?.enabled) {
    return false;
  }

  switch (eventType) {
    case "new_question":
    case "question_answered":
    case "question_deadline_expired":
      return preferences.newQuestions !== false;
    case "timer_changed":
      return preferences.timerChanges !== false;
    case "chat_message":
      return preferences.chatMessages === true;
    default:
      return false;
  }
}

export function targetRolesForEvent(eventType) {
  switch (eventType) {
    case "new_question":
      return ["hider"];
    case "question_answered":
    case "question_deadline_expired":
      return ["seeker"];
    case "timer_changed":
      return ["seeker", "hider"];
    case "chat_message":
      return ["seeker", "hider"];
    default:
      return [];
  }
}

export function buildNotificationPayload(eventType, context) {
  switch (eventType) {
    case "new_question":
      return {
        title: "New question",
        body: `${toolLabel(context.toolType)} question — open Jet Lag to answer`,
        data: {
          event: eventType,
          sessionId: context.sessionId,
          questionId: context.questionId,
        },
      };
    case "question_answered":
      return {
        title: "Question answered",
        body: `${toolLabel(context.toolType)} question was answered`,
        data: {
          event: eventType,
          sessionId: context.sessionId,
          questionId: context.questionId,
        },
      };
    case "question_deadline_expired":
      return {
        title: "Answer deadline passed",
        body: `${toolLabel(context.toolType)} question expired`,
        data: {
          event: eventType,
          sessionId: context.sessionId,
          questionId: context.questionId,
        },
      };
    case "timer_changed":
      return {
        title: "Timer updated",
        body: context.running ? "Hiding timer resumed" : "Hiding timer paused",
        data: {
          event: eventType,
          sessionId: context.sessionId,
        },
      };
    case "chat_message":
      return {
        title: context.channel === "game" ? "Game chat" : "Team chat",
        body: context.preview ?? "New message",
        data: {
          event: eventType,
          sessionId: context.sessionId,
        },
      };
    default:
      return null;
  }
}

export function selectDeviceTokens(devices, input) {
  const roles = new Set(targetRolesForEvent(input.eventType));
  const tokens = [];

  for (const [uid, device] of Object.entries(devices)) {
    if (uid === input.senderUid) {
      continue;
    }

    if (!roles.has(device.role)) {
      continue;
    }

    if (!shouldNotifyForPreference(device.preferences, input.eventType)) {
      continue;
    }

    if (typeof device.token === "string" && device.token.length > 0) {
      tokens.push(device.token);
    }
  }

  return [...new Set(tokens)];
}
