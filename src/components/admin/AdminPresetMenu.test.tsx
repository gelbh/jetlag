import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  CUSTOM_PRESET_ID,
  type DeskPreset,
} from "../../domain/admin/opsDeskLayout";
import { AdminPresetMenu } from "./AdminPresetMenu";

const baseProps = {
  activePresetId: "session-watch",
  defaultPresetId: "session-watch",
  presetOrder: ["session-watch", "incident-triage", CUSTOM_PRESET_ID],
  userPresets: [] as DeskPreset[],
  onSelectPreset: vi.fn(),
  onSaveCurrent: vi.fn(),
  onDeleteUserPreset: vi.fn(),
  onSetDefault: vi.fn(),
  onReorderPresets: vi.fn(),
  onRenameUserPreset: vi.fn(),
  onOverwriteUserPreset: vi.fn(),
};

describe("AdminPresetMenu", () => {
  it("selects via label without calling setDefault", () => {
    const onSelectPreset = vi.fn();
    const onSetDefault = vi.fn();
    render(
      <AdminPresetMenu
        {...baseProps}
        onSelectPreset={onSelectPreset}
        onSetDefault={onSetDefault}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Incident triage" }));
    expect(onSelectPreset).toHaveBeenCalledWith("incident-triage");
    expect(onSetDefault).not.toHaveBeenCalled();
  });

  it("sets default via star without calling select", () => {
    const onSelectPreset = vi.fn();
    const onSetDefault = vi.fn();
    render(
      <AdminPresetMenu
        {...baseProps}
        onSelectPreset={onSelectPreset}
        onSetDefault={onSetDefault}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Set Incident triage as default" }),
    );
    expect(onSetDefault).toHaveBeenCalledWith("incident-triage");
    expect(onSelectPreset).not.toHaveBeenCalled();
  });

  it("does not render always-on move chevrons in the idle strip", () => {
    render(<AdminPresetMenu {...baseProps} />);
    expect(
      screen.queryByRole("button", { name: /move .* earlier/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /move .* later/i }),
    ).toBeNull();
    expect(screen.queryByText("‹")).toBeNull();
    expect(screen.queryByText("›")).toBeNull();
  });

  it("Manage move earlier calls onReorderPresets with swapped order", () => {
    const onReorderPresets = vi.fn();
    render(
      <AdminPresetMenu {...baseProps} onReorderPresets={onReorderPresets} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Move Incident triage earlier" }),
    );

    expect(onReorderPresets).toHaveBeenCalledWith([
      "incident-triage",
      "session-watch",
      CUSTOM_PRESET_ID,
    ]);
  });

  it("closes Manage on Escape", () => {
    render(<AdminPresetMenu {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: "Manage" }));
    expect(screen.getByTestId("admin-ops-preset-manage")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("admin-ops-preset-manage")).toBeNull();
  });
});

