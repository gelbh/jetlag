import { describe, expect, it } from "vitest";
import type { IncidentStatus } from "../incident/incidentTypes";
import {
  INCIDENT_PROGRESS_LABEL,
  type IncidentProgress,
  incidentProgress,
} from "./incidentProgress";

const nowMs = new Date(2026, 9, 12, 14, 0).getTime();
const today = new Date(2026, 9, 12, 0, 5).toISOString();
const yesterday = new Date(2026, 9, 11, 23, 55).toISOString();
const launched = { status: "launched" as const };

const cases: [IncidentStatus, boolean, string, IncidentProgress][] = [
  ["open", false, today, "new"],
  ["open", false, yesterday, "new"],
  ["open", true, today, "fix_proposed"],
  ["open", true, yesterday, "fix_proposed"],
  ["chatting", false, today, "new"],
  ["chatting", false, yesterday, "new"],
  ["chatting", true, today, "fix_proposed"],
  ["chatting", true, yesterday, "fix_proposed"],
  ["mitigating", false, today, "diagnosed"],
  ["mitigating", false, yesterday, "diagnosed"],
  ["mitigating", true, today, "fix_proposed"],
  ["mitigating", true, yesterday, "fix_proposed"],
  ["hotfix_pending", false, today, "fix_proposed"],
  ["hotfix_pending", false, yesterday, "fix_proposed"],
  ["hotfix_pending", true, today, "fix_proposed"],
  ["hotfix_pending", true, yesterday, "fix_proposed"],
  ["resolved", false, today, "resolved_today"],
  ["resolved", false, yesterday, "closed"],
  ["resolved", true, today, "resolved_today"],
  ["resolved", true, yesterday, "closed"],
  ["dismissed", false, today, "resolved_today"],
  ["dismissed", false, yesterday, "closed"],
  ["dismissed", true, today, "resolved_today"],
  ["dismissed", true, yesterday, "closed"],
];

describe("incidentProgress", () => {
  it.each(cases)(
    "%s (agent launched: %s, updatedAt %s) is %s",
    (status, agentLaunched, updatedAt, expected) => {
      expect(
        incidentProgress({ status, agent: agentLaunched ? launched : undefined, updatedAt }, nowMs),
      ).toBe(expected);
    },
  );

  it("ignores a failed agent launch", () => {
    expect(
      incidentProgress({ status: "open", agent: { status: "failed" }, updatedAt: today }, nowMs),
    ).toBe("new");
  });

  it("treats an unparsable updatedAt on a terminal status as closed", () => {
    expect(incidentProgress({ status: "resolved", updatedAt: "not-a-date" }, nowMs)).toBe("closed");
  });

  it("labels every progress group", () => {
    expect(INCIDENT_PROGRESS_LABEL).toEqual({
      new: "New",
      diagnosed: "Diagnosed",
      fix_proposed: "Fix proposed",
      resolved_today: "Resolved today",
      closed: "Closed",
    });
  });
});
