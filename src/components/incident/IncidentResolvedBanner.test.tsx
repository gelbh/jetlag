import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IncidentResolvedBanner } from "./IncidentResolvedBanner";

describe("IncidentResolvedBanner", () => {
  it("shows copy and dismisses", async () => {
    const dismissFn = vi.fn();

    render(
      <IncidentResolvedBanner
        notice={{
          incidentId: "inc-1",
          status: "resolved",
          resolvedAt: "2026-01-02T00:00:00.000Z",
          bannerDismissedAt: null,
        }}
        onDismiss={dismissFn}
      />
    );

    expect(screen.getByText(/issue has been fixed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(dismissFn).toHaveBeenCalledWith("inc-1");
  });
});
