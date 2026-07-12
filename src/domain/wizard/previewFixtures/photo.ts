import type { PhotoCategoryId } from "../../questions";

export interface PhotoPreviewFixture {
  categoryId: PhotoCategoryId;
  canSubmitQuestion: boolean;
  hasOpenQuestion: boolean;
}

export const PHOTO_PREVIEW_INTERACTIVE: PhotoPreviewFixture = {
  categoryId: "tree",
  canSubmitQuestion: true,
  hasOpenQuestion: false,
};

export const PHOTO_PREVIEW_NO_HIDERS: PhotoPreviewFixture = {
  categoryId: "tree",
  canSubmitQuestion: false,
  hasOpenQuestion: false,
};

export const PHOTO_PREVIEW_WITH_HIDERS: PhotoPreviewFixture = {
  categoryId: "tree",
  canSubmitQuestion: true,
  hasOpenQuestion: false,
};
