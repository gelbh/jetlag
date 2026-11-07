import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { AdminBoardPanel } from "./AdminBoardPanel";

const listMock = vi.fn();
const opsMock = vi.fn();

vi.mock("@/services/admin/adminBoardOps", () => ({
  adminListBoardAnnotations: (...args: unknown[]) => listMock(...args),
  adminSessionBoardOps: (...args: unknown[]) => opsMock(...args),
}));

describe("AdminBoardPanel", () => {
  beforeEach(() => {
    listMock.mockReset();
    opsMock.mockReset();
    listMock.mockResolvedValue([
      {
        id: "a1",
        type: "radar",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        answerSummary: "inside",
        hotterTowards: null,
        radiusMeters: 500,
      },
    ]);
  });

  it("disables Execute until Preview and Cancel clears preview", async () => {
    const onPreview = vi.fn();
    const onClearPreview = vi.fn();

    const { rerender } = renderWithAppUi(
      <AdminBoardPanel
        sessionId="session-1"
        liveAnnotations={[]}
        confirmedHide={null}
        pendingOp={null}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
      />,
    );

    expect(screen.queryByTestId("admin-board-execute")).not.toBeInTheDocument();

    await screen.findByText("radar");
    fireEvent.click(screen.getByRole("button", { name: "Preview delete" }));
    expect(onPreview).toHaveBeenCalledWith({
      action: "softDeleteAnnotation",
      annotationId: "a1",
    });

    rerender(
      <AdminBoardPanel
        sessionId="session-1"
        liveAnnotations={[]}
        confirmedHide={null}
        pendingOp={{ action: "softDeleteAnnotation", annotationId: "a1" }}
        onPreview={onPreview}
        onClearPreview={onClearPreview}
      />,
    );

    expect(screen.getByTestId("admin-board-execute")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClearPreview).toHaveBeenCalled();
  });

  it("disables recompute preview without confirmed hide", async () => {
    listMock.mockResolvedValue([
      {
        id: "t1",
        type: "thermometer",
        status: "active",
        createdAt: null,
        answerSummary: "hotter",
        hotterTowards: "b",
        radiusMeters: null,
      },
    ]);

    renderWithAppUi(
      <AdminBoardPanel
        sessionId="session-1"
        liveAnnotations={[
          {
            id: "t1",
            sessionId: "session-1",
            type: "thermometer",
            status: "active",
            geometry: {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: [
                  [0, 0],
                  [1, 1],
                ],
              },
            },
            metadata: { createdAt: "2026-01-01T00:00:00.000Z" },
          },
        ]}
        confirmedHide={null}
        pendingOp={null}
        onPreview={vi.fn()}
        onClearPreview={vi.fn()}
      />,
    );

    const button = await screen.findByRole("button", { name: "Preview recompute" });
    expect(button).toBeDisabled();
  });
});
