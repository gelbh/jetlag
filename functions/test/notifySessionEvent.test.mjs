import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildNotificationPayload,
  selectDeviceTokens,
  shouldNotifyForPreference,
  toolLabel,
} from "../session/notifySessionEvent.mjs";

describe("notifySessionEvent helpers", () => {
  it("maps tool labels", () => {
    assert.equal(toolLabel("radar"), "Radar");
    assert.equal(toolLabel("unknown"), "Question");
  });

  it("respects notification preferences", () => {
    const prefs = {
      enabled: true,
      newQuestions: true,
      timerChanges: false,
      chatMessages: false,
      liveActivities: true,
    };

    assert.equal(shouldNotifyForPreference(prefs, "new_question"), true);
    assert.equal(shouldNotifyForPreference(prefs, "timer_changed"), false);
    assert.equal(
      shouldNotifyForPreference({ ...prefs, enabled: false }, "new_question"),
      false,
    );
  });

  it("selects hider tokens for new questions", () => {
    const tokens = selectDeviceTokens(
      {
        seeker1: {
          token: "seeker-token",
          role: "seeker",
          preferences: { enabled: true, newQuestions: true },
        },
        hider1: {
          token: "hider-token",
          role: "hider",
          preferences: { enabled: true, newQuestions: true },
        },
      },
      { eventType: "new_question", senderUid: "seeker1" },
    );

    assert.deepEqual(tokens, ["hider-token"]);
  });

  it("builds notification payloads", () => {
    const payload = buildNotificationPayload("new_question", {
      sessionId: "session-1",
      questionId: "q-1",
      toolType: "radar",
    });

    assert.equal(payload.title, "New question");
    assert.match(payload.body, /Radar/);
    assert.equal(payload.data.sessionId, "session-1");
  });
});
