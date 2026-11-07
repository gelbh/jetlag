import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { SessionOpsNoticeBanner } from "./SessionOpsNoticeBanner";

describe("SessionOpsNoticeBanner", () => {
  it("renders nothing without a notice", () => {
    const { container } = renderWithAppUi(<SessionOpsNoticeBanner notice={null} />);
    expect(container.querySelector("[data-testid='session-ops-notice-banner']")).toBeNull();
  });

  it("calls dismiss when Dismiss is pressed", () => {
    const onDismiss = vi.fn();

    renderWithAppUi(
      <SessionOpsNoticeBanner
        notice={{ text: "Stay on transit", tone: "warn" }}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByTestId("session-ops-notice-banner")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});
