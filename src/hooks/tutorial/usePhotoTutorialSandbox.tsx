import { useState } from "react";
import { PhotoPanel } from "../../components/tools/PhotoPanel";
import { type PhotoCategoryId } from "../../domain/questions";
import { DEFAULT_SESSION_RULES } from "../../domain/session/rules/types";
import type { PhotoPreviewFixture } from "../../domain/wizard/previewFixtures/photo";
import {
  createTutorialSandbox,
  type TutorialSandboxContext,
} from "./createTutorialSandbox";

function usePhotoSandboxBody({
  fixture,
  readOnly,
  interactive,
  costLabel,
}: TutorialSandboxContext<PhotoPreviewFixture>) {
  const sessionRules = DEFAULT_SESSION_RULES;
  const gameSize = sessionRules.gameSize ?? "medium";

  const [categoryId, setCategoryId] = useState<PhotoCategoryId>(
    fixture?.categoryId ?? "tree",
  );

  const canCommit = fixture?.canSubmitQuestion ?? true;

  return {
    canCommit,
    renderPanel: (commit: { handleCommit: () => void; isSubmitting: boolean }) => (
      <PhotoPanel
        gameSize={gameSize}
        categoryId={categoryId}
        usedCategoryIds={new Set()}
        costLabel={costLabel}
        onCategoryChange={readOnly ? () => {} : setCategoryId}
        onCommit={interactive ? commit.handleCommit : () => {}}
        isSubmitting={commit.isSubmitting}
        canSubmitQuestion={canCommit}
        hasOpenQuestion={fixture?.hasOpenQuestion ?? false}
        readOnly={readOnly}
      />
    ),
  };
}

export const usePhotoTutorialSandbox = createTutorialSandbox<PhotoPreviewFixture>({
  toolId: "photo",
  requiresSession: false,
  useSandboxBody: usePhotoSandboxBody,
});
