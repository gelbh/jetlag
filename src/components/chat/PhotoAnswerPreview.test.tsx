import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PhotoAnswerPreview } from "./PhotoAnswerPreview";

vi.mock("../../services/core/photoStorage", () => ({
  getPhotoDownloadUrl: vi.fn(),
}));

import { getPhotoDownloadUrl } from "../../services/core/photoStorage";

describe("PhotoAnswerPreview", () => {
  it("renders sent externally without loading a photo", () => {
    render(<PhotoAnswerPreview answer={{ kind: "sent_externally" }} />);

    expect(
      screen.getByText("Photo sent outside the app"),
    ).toBeInTheDocument();
    expect(getPhotoDownloadUrl).not.toHaveBeenCalled();
  });
});
