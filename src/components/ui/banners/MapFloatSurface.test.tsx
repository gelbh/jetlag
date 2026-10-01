import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagBrand, jetlagTheme } from "@/theme/theme";
import { MapFloatSurface } from "./MapFloatSurface";
import { MapFloatAlert, MapFloatAlertPanel } from "./MapFloatAlert";
import { floatToneStyles } from "./mapFloatToneStyles";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("floatToneStyles", () => {
  it("uses frosted canvas fill, not accent-at-0.12 wash", () => {
    const styles = floatToneStyles("halt");
    expect(styles.root.backgroundColor).toContain(jetlagBrand.canvas);
    expect(styles.root.backgroundColor).toMatch(/\/ 0\.92\)/);
    expect(styles.root.backgroundColor).not.toMatch(/\/ 0\.12\)/);
    expect(styles.message.color).toBe(jetlagBrand.fieldInk);
    expect(styles.title.color).toBe(jetlagBrand.halt);
  });
});

describe("MapFloatSurface", () => {
  it("renders children and optional title", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatSurface tone="flag" title="Match">
          Prompt text
        </MapFloatSurface>
      </MantineProvider>,
    );
    expect(screen.getByText("Match")).toBeInTheDocument();
    expect(screen.getByText("Prompt text")).toBeInTheDocument();
  });

  it("supports alert role", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatSurface tone="halt" role="alert">
          Outside zone
        </MapFloatSurface>
      </MantineProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Outside zone");
  });

  it("forwards className for width and margins", () => {
    const { container } = render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatSurface tone="default" className="mx-3 mt-1.5">
          Syncing
        </MapFloatSurface>
      </MantineProvider>,
    );
    expect(container.querySelector(".mx-3")).toBeTruthy();
  });
});

describe("MapFloatAlert wrappers", () => {
  it("MapFloatAlert renders children via default tone surface", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatAlert role="status">Round ending soon</MapFloatAlert>
      </MantineProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Round ending soon");
  });

  it("MapFloatAlertPanel defaults to alert role with halt tone", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatAlertPanel>Outside the zone</MapFloatAlertPanel>
      </MantineProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Outside the zone");
  });

  it("MapFloatAlertPanel keeps copy and actions in a flex action row", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatAlertPanel>
          <span>Outside the zone</span>
          <button type="button">Dismiss</button>
        </MapFloatAlertPanel>
      </MantineProvider>,
    );
    const panel = screen.getByRole("alert");
    const style = getComputedStyle(panel);
    expect(style.display).toBe("flex");
    expect(style.justifyContent).toBe("space-between");
    expect(style.alignItems).toBe("center");
  });
});
