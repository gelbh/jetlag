import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppUiProvider } from "./AppUiProvider";
import { useAdminColorSchemeScope } from "./colorSchemeScope";

function mockPrefersDark(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") ? dark : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
}

function AdminRoot() {
  useAdminColorSchemeScope();
  return <div>admin</div>;
}

const scheme = () => document.documentElement.getAttribute("data-mantine-color-scheme");

describe("admin color scheme scope", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forces dark outside admin even when the OS is light", () => {
    mockPrefersDark(false);
    render(
      <AppUiProvider>
        <div>player</div>
      </AppUiProvider>,
    );
    expect(scheme()).toBe("dark");
  });

  it("follows a light OS inside admin and restores dark on unmount", () => {
    mockPrefersDark(false);
    const { rerender } = render(
      <AppUiProvider>
        <AdminRoot />
      </AppUiProvider>,
    );
    expect(scheme()).toBe("light");
    rerender(
      <AppUiProvider>
        <div>player</div>
      </AppUiProvider>,
    );
    expect(scheme()).toBe("dark");
  });

  it("follows a dark OS inside admin", () => {
    mockPrefersDark(true);
    render(
      <AppUiProvider>
        <AdminRoot />
      </AppUiProvider>,
    );
    expect(scheme()).toBe("dark");
  });
});
