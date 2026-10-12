import { MantineProvider } from "@mantine/core";
import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AnnotationRecord } from "@/domain/map/annotations";
import { jetlagTheme } from "@/theme/theme";
import { HiderPinSheet } from "./HiderPinSheet";

function render(ui: ReactElement) {
  return rtlRender(<MantineProvider theme={jetlagTheme}>{ui}</MantineProvider>);
}

function pin(overrides: Partial<AnnotationRecord> = {}): AnnotationRecord {
  return {
    id: "pin-1",
    sessionId: "session-1",
    type: "pin",
    status: "active",
    geometry: {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: {},
    },
    metadata: {
      createdAt: "2026-10-11T12:00:00.000Z",
      label: "Pop-up zoo",
      createdByUid: "hider-1",
    },
    ...overrides,
  };
}

describe("HiderPinSheet", () => {
  it("deletes the hider's own active pin", () => {
    const onDelete = vi.fn();
    render(
      <HiderPinSheet annotation={pin()} uid="hider-1" onClose={vi.fn()} onDelete={onDelete} />,
    );

    expect(screen.getByText("Pop-up zoo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("pin-1");
  });

  it("closes without deleting", () => {
    const onClose = vi.fn();
    const onDelete = vi.fn();
    render(
      <HiderPinSheet annotation={pin()} uid="hider-1" onClose={onClose} onDelete={onDelete} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it.each([
    ["another player's pin", pin(), "hider-2"],
    ["a deleted pin", pin({ status: "deleted" }), "hider-1"],
    ["a non-pin annotation", pin({ type: "radar" }), "hider-1"],
    ["a signed-out hider", pin(), null],
  ])("renders nothing for %s", (_, annotation, uid) => {
    render(
      <HiderPinSheet annotation={annotation} uid={uid} onClose={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
  });
});
