import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getPhotoDownloadUrl } from "../../services/core/photoStorage";
import { PhotoAnswerPreview } from "./PhotoAnswerPreview";

vi.mock("../../services/core/photoStorage", () => ({
  getPhotoDownloadUrl: vi.fn(),
}));

describe("PhotoAnswerPreview", () => {
  it("renders sent externally without loading a photo", () => {
    render(<PhotoAnswerPreview answer={{ kind: "sent_externally" }} />);

    expect(
      screen.getByText("Photo sent outside the app"),
    ).toBeInTheDocument();
    expect(getPhotoDownloadUrl).not.toHaveBeenCalled();
  });

  it("still loads legacy uploaded photo answers", async () => {
    vi.mocked(getPhotoDownloadUrl).mockResolvedValueOnce("https://example.com/photo.jpg");

    render(
      <PhotoAnswerPreview
        answer={{
          kind: "photo",
          storagePath: "sessions/s1/photoAnswers/q1/photo.jpg",
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByAltText("Hider photo answer")).toBeInTheDocument();
    });
    expect(getPhotoDownloadUrl).toHaveBeenCalledWith(
      "sessions/s1/photoAnswers/q1/photo.jpg",
    );
  });
});
