import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminNoticeComposer } from "./AdminNoticeComposer";

vi.mock("@/services/admin/adminSessionNotices", () => ({
  adminPublishSessionNotice: vi.fn(),
}));

describe("AdminNoticeComposer", () => {
  it("Preview sets draft and Send stays hidden until then", () => {
    const onDraftChange = vi.fn();

    const { rerender } = renderWithAppUi(
      <AdminNoticeComposer sessionId="session-1" draft={null} onDraftChange={onDraftChange} />,
    );

    expect(screen.queryByTestId("admin-notice-send")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Support is watching" },
    });
    fireEvent.click(screen.getByTestId("admin-notice-preview"));

    expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Support is watching",
        tone: "info",
      }),
    );

    rerender(
      <AdminNoticeComposer
        sessionId="session-1"
        draft={{ text: "Support is watching", tone: "info", ttlSeconds: 30 }}
        onDraftChange={onDraftChange}
      />,
    );

    expect(screen.getByTestId("admin-notice-send")).toBeInTheDocument();
  });
});
