import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { InsetRow } from "./InsetRow";

function renderInsetRow(ui: ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

function iconWrapperFor(label: string) {
  const button = screen.getByRole("button", { name: label });
  const iconWrapper = button.querySelector("span[aria-hidden]");
  expect(iconWrapper).toBeTruthy();
  return iconWrapper as HTMLElement;
}

describe("InsetRow", () => {
  it("uses field-ink for default-tone icon color", () => {
    renderInsetRow(<InsetRow label="Settings" icon={<span>I</span>} onClick={() => undefined} />);
    const iconWrapper = iconWrapperFor("Settings");
    expect(iconWrapper.style.color).toBe("var(--color-field-ink)");
    expect(iconWrapper.style.color).not.toBe("var(--color-flag)");
  });

  it("keeps halt tone on icon color", () => {
    renderInsetRow(
      <InsetRow tone="halt" label="Sign out" icon={<span>I</span>} onClick={() => undefined} />,
    );
    const iconWrapper = iconWrapperFor("Sign out");
    expect(iconWrapper.style.color).toBe("var(--color-halt)");
  });
});
