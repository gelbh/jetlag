import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DesktopOpsShell } from "./DesktopOpsShell";

describe("DesktopOpsShell", () => {
  it("exposes status region, tools navigation, and map content", () => {
    render(
      <DesktopOpsShell
        status={<p>status body</p>}
        tools={<button type="button">Radar</button>}
      >
        <p>map body</p>
      </DesktopOpsShell>,
    );

    expect(
      screen.getByRole("region", { name: "Map status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Map tools" }),
    ).toBeInTheDocument();
    expect(screen.getByText("status body")).toBeInTheDocument();
    expect(screen.getByText("map body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Radar" })).toBeInTheDocument();
    expect(document.querySelector(".desktop-ops-shell")).not.toBeNull();
  });

  it("renders contextual slot when provided", () => {
    render(
      <DesktopOpsShell
        status={<span>s</span>}
        tools={<span>t</span>}
        map={<span>m</span>}
        contextual={<p>panel</p>}
      />,
    );

    expect(document.querySelector(".desktop-ops-shell__contextual")).not.toBeNull();
    expect(screen.getByText("panel")).toBeInTheDocument();
  });

  it("omits contextual slot when contextual is absent", () => {
    render(
      <DesktopOpsShell
        status={<span>s</span>}
        tools={<span>t</span>}
        map={<span>m</span>}
      />,
    );

    expect(document.querySelector(".desktop-ops-shell__contextual")).toBeNull();
  });
});
