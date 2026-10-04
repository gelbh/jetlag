import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagBrand, jetlagTheme } from "@/theme/theme";
import { MapFloatAlertPanel } from "./MapFloatAlert";
import { MapFloatSurface } from "./MapFloatSurface";
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
});

describe("MapFloatAlert wrappers", () => {
  it("MapFloatAlertPanel defaults to alert role with halt tone", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MapFloatAlertPanel>Outside the zone</MapFloatAlertPanel>
      </MantineProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Outside the zone");
  });
});
