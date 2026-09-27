import { fireEvent, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { renderWithRouter } from "@/test/renderWithRouter";
import { AdvancedSettingsCategory } from "./shared";

function renderUi(ui: ReactElement) {
  return renderWithRouter(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("AdvancedSettingsCategory", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("toggles category body open and closed", () => {
    renderUi(
      <AdvancedSettingsCategory title="Timers">
        <p>Timer controls</p>
      </AdvancedSettingsCategory>,
    );

    const toggle = screen.getByRole("button", { name: /Timers/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Timer controls")).toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Timer controls")).not.toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Timer controls")).toBeVisible();
  });

  it("honors defaultOpen=false", () => {
    renderUi(
      <AdvancedSettingsCategory title="Tools" defaultOpen={false}>
        <p>Tool list</p>
      </AdvancedSettingsCategory>,
    );

    expect(screen.getByRole("button", { name: /Tools/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Tool list")).not.toBeVisible();
  });
});
