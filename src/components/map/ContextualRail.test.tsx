import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ContextualRail } from "./ContextualRail";
import { ContextualRailPanelProvider } from "./ContextualRailContext";

function renderRail(
  props: Partial<ComponentProps<typeof ContextualRail>> = {},
) {
  const onClose = vi.fn();
  const onSelectTab = vi.fn();
  const result = render(
    <ContextualRailPanelProvider>
      <ContextualRail
        open={props.open ?? false}
        activeTab={props.activeTab ?? null}
        onClose={props.onClose ?? onClose}
        onSelectTab={props.onSelectTab ?? onSelectTab}
        tabs={props.tabs}
        dismissible={props.dismissible}
      />
    </ContextualRailPanelProvider>,
  );
  return { ...result, onClose, onSelectTab };
}

describe("ContextualRail", () => {
  it("exposes complementary landmark", () => {
    renderRail();
    expect(
      screen.getByRole("complementary", { name: "Map panels" }),
    ).toBeInTheDocument();
  });

  it("shows collapsed icon tabs when closed", () => {
    const { onSelectTab } = renderRail({ open: false });
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onSelectTab).toHaveBeenCalledWith("settings");
  });

  it("shows open panel tabs when open", () => {
    renderRail({ open: true, activeTab: "settings" });
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "Settings" })).toBeInTheDocument();
  });

  it("closes on Escape when open", () => {
    const { onClose } = renderRail({ open: true, activeTab: "chat" });
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("moves focus into the panel when opened", () => {
    renderRail({ open: true, activeTab: "log" });
    const panel = screen.getByRole("tabpanel", { name: "Log" });
    expect(document.activeElement).toBe(panel);
  });
});
