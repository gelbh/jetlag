import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { HostConfirmRecord } from "../../domain/incident/incidentTypes";
import { jetlagTheme } from "@/theme/theme";
import { HostConfirmSheet } from "./HostConfirmSheet";

function withProviders(ui: ReactNode) {
  return (
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>
  );
}

const confirm: HostConfirmRecord = {
  id: "confirm-1",
  incidentId: "incident-1",
  sessionId: "session-1",
  tool: "end_session",
  args: {},
  argsHash: "hash-1",
  status: "pending",
  hostUid: "host-1",
  requestedByUid: "agent-1",
  createdAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-01T00:05:00.000Z",
};

describe("HostConfirmSheet", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  it("denies via denyFn when SheetHost onClose fires (scrim dismiss)", async () => {
    const denyFn = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      withProviders(
        <HostConfirmSheet
          open
          confirm={confirm}
          onClose={onClose}
          denyFn={denyFn}
        />,
      ),
    );

    expect(
      screen.getByRole("heading", { name: "Confirm change" }),
    ).toBeInTheDocument();

    const overlay = document.querySelector(".mantine-Drawer-overlay");
    expect(overlay).toBeTruthy();
    fireEvent.mouseDown(overlay!);
    fireEvent.click(overlay!);

    await waitFor(() => {
      expect(denyFn).toHaveBeenCalledWith("incident-1", "confirm-1");
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
