import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { buildSessionColumns } from "./sessionColumns";
import { makeSession } from "./testSessions";

function cell(id: string, row = makeSession(), incidents: ReadonlyMap<string, number> = new Map()) {
  const column = buildSessionColumns(incidents).find((c) => c.id === id);
  if (!column) throw new Error(`no column ${id}`);
  return column.render(row);
}

describe("buildSessionColumns", () => {
  it("defines the 19 spec columns with Code pinned and the spec defaults", () => {
    const columns = buildSessionColumns(new Map());
    expect(columns.map((c) => c.id)).toEqual([
      "code",
      "area",
      "phase",
      "players",
      "clock",
      "lastActivity",
      "lastLocation",
      "openIncidents",
      "tier",
      "questions",
      "size",
      "annotations",
      "lastAnnotation",
      "hidingPeriod",
      "mode",
      "regionPack",
      "transitMetro",
      "appVersion",
      "created",
    ]);
    expect(columns.filter((c) => c.pinned).map((c) => c.id)).toEqual(["code"]);
    expect(columns.filter((c) => c.defaultVisible)).toHaveLength(9);
    expect(columns.find((c) => c.id === "openIncidents")?.headerTitle).toBe(
      "Open incidents among the latest 50",
    );
  });

  it("renders open incidents from the map and 0 when absent", () => {
    renderWithAppUi(
      <>{cell("openIncidents", makeSession({ sessionId: "x" }), new Map([["x", 3]]))}</>,
    );
    expect(screen.getByText("3 open")).toBeInTheDocument();
    renderWithAppUi(<>{cell("openIncidents", makeSession({ sessionId: "y" }))}</>);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders a dash for questions when absent and the count when present", () => {
    renderWithAppUi(<>{cell("questions")}</>);
    expect(screen.getByText("–")).toBeInTheDocument();
    renderWithAppUi(<>{cell("questions", makeSession({ questionCount: 7 }))}</>);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("formats the game clock as m:ss or h:mm:ss", () => {
    renderWithAppUi(<>{cell("clock", makeSession({ timerAccumulatedMs: 125_000 }))}</>);
    expect(screen.getByText("02:05")).toBeInTheDocument();
    renderWithAppUi(<>{cell("clock", makeSession({ timerAccumulatedMs: 4_360_000 }))}</>);
    expect(screen.getByText("1:12:40")).toBeInTheDocument();
  });

  it("shows an orange dot for last activity under 60s only", () => {
    renderWithAppUi(
      <>
        {cell(
          "lastActivity",
          makeSession({ lastActivityAt: new Date(Date.now() - 5_000).toISOString() }),
        )}
      </>,
    );
    expect(screen.getByText("just now")).toBeInTheDocument();
    expect(screen.getByTestId("fresh-dot")).toBeInTheDocument();
    renderWithAppUi(
      <>
        {cell(
          "lastActivity",
          makeSession({ lastActivityAt: new Date(Date.now() - 180_000).toISOString() }),
        )}
      </>,
    );
    expect(screen.getByText("3m ago")).toBeInTheDocument();
    expect(screen.getAllByTestId("fresh-dot")).toHaveLength(1);
  });
});
