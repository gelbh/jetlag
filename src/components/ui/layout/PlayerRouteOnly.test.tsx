import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppEntryBackdrop } from "./AppEntryBackdrop";
import { isAdminPath, PlayerRouteOnly } from "./PlayerRouteOnly";

const at = (route: string, ui: ReactElement) =>
  render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);

describe("PlayerRouteOnly", () => {
  it.each([
    ["/admin", true],
    ["/admin/incidents/inc-1", true],
    ["/administrator", false],
    ["/", false],
    ["/map", false],
  ])("isAdminPath(%s) is %s", (path, expected) => {
    expect(isAdminPath(path)).toBe(expected);
  });

  it("hides children on admin routes and shows them elsewhere", () => {
    const { unmount } = at("/admin", <PlayerRouteOnly>tip</PlayerRouteOnly>);
    expect(screen.queryByText("tip")).toBeNull();
    unmount();
    at("/", <PlayerRouteOnly>tip</PlayerRouteOnly>);
    expect(screen.getByText("tip")).toBeInTheDocument();
  });

  it("does not paint the entry backdrop on admin routes", () => {
    const { container, unmount } = at("/admin/incidents", <AppEntryBackdrop />);
    expect(container.querySelector(".app-entry-backdrop")).toBeNull();
    unmount();
    const home = at("/", <AppEntryBackdrop />);
    expect(home.container.querySelector(".app-entry-backdrop")).not.toBeNull();
  });
});
