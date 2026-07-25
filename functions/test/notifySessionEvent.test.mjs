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
      incidentHostConfirm: true,
      liveActivities: true,
    };

    assert.equal(shouldNotifyForPreference(prefs, "new_question"), true);
    assert.equal(shouldNotifyForPreference(prefs, "timer_changed"), false);
    assert.equal(
      shouldNotifyForPreference(prefs, "incident_host_confirm"),
      true,
    );
    assert.equal(
      shouldNotifyForPreference(
        { ...prefs, incidentHostConfirm: false },
        "incident_host_confirm",
      ),
      false,
    );
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

  it("selects host token for incident_host_confirm via targetUid", () => {
    const tokens = selectDeviceTokens(
      {
        host1: {
          token: "host-token",
          role: "seeker",
          preferences: { enabled: true, incidentHostConfirm: true },
        },
        hider1: {
          token: "hider-token",
          role: "hider",
          preferences: { enabled: true, incidentHostConfirm: true },
        },
      },
      {
        eventType: "incident_host_confirm",
        targetUid: "host1",
        senderUid: "agent-1",
      },
    );

    assert.deepEqual(tokens, ["host-token"]);
  });

  it("builds incident_host_confirm payload", () => {
    const payload = buildNotificationPayload("incident_host_confirm", {
      sessionId: "session-1",
      incidentId: "inc-1",
      confirmId: "confirm-1",
      tool: "reset_board",
    });

    assert.equal(payload.title, "Host confirmation needed");
    assert.match(payload.body, /reset board/);
    assert.equal(payload.data.incidentId, "inc-1");
    assert.equal(payload.data.confirmId, "confirm-1");
    assert.equal(payload.data.event, "incident_host_confirm");
  });
});
