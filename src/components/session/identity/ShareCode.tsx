import { useState } from "react";
import { useCopyFeedback } from "../../../hooks/forms/useCopyFeedback";
import crawlPolicy from "../../../domain/seo/seoCrawlPolicy.json";
import {
  buildSessionInviteUrl,
  resolveSessionInviteOrigin,
} from "../../../services/session/sessionInviteUrl";

interface ShareCodeProps {
  code: string;
  remote?: boolean;
  compact?: boolean;
}

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function resolveInviteUrl(code: string): string | null {
  const currentOrigin =
    typeof window !== "undefined"
      ? window.location.origin
      : crawlPolicy.siteOrigin;
  const origin = resolveSessionInviteOrigin(
    currentOrigin,
    crawlPolicy.siteOrigin,
  );
  return buildSessionInviteUrl(origin, code);
}

export function ShareCode({
  code,
  remote = false,
  compact = false,
}: ShareCodeProps) {
  const { status: copyStatus, copy } = useCopyFeedback();
  const [copyTarget, setCopyTarget] = useState<"code" | "link">("code");
  const inviteUrl = remote ? resolveInviteUrl(code) : null;

  const handleCopyCode = async () => {
    setCopyTarget("code");
    await copy(code);
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) {
      return;
    }
    setCopyTarget("link");
    await copy(inviteUrl);
  };

  const handleInvite = async () => {
    if (!inviteUrl) {
      return;
    }

    if (canNativeShare()) {
      try {
        await navigator.share({
          title: "Join my Hide+Seek session",
          text: `Join with code ${code}`,
          url: inviteUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Fall through to clipboard when share is unavailable or fails.
      }
    }

    setCopyTarget("link");
    await copy(inviteUrl);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void handleCopyCode()}
        className="jl-stamp min-h-12 flex-1 justify-center text-center"
        aria-label={`Copy session code ${code}`}
      >
        <span className="jl-stamp-label">Code</span>
        <span className="jl-stamp-code text-lg">{code}</span>
      </button>
    );
  }

  const feedback =
    copyStatus === "copied"
      ? copyTarget === "link"
        ? "Join link copied."
        : "Copied to clipboard."
      : copyStatus === "failed"
        ? copyTarget === "link"
          ? "Couldn't copy the join link."
          : "Copy failed. Select and copy manually."
        : inviteUrl
          ? "Tap code to copy. Invite friends with the join link."
          : "Tap code to copy. Local-only session for solo play.";

  return (
    <div className="space-y-3">
      <div className="jl-stamp w-full items-center py-3 text-center">
        <span className="jl-stamp-label">Session code</span>
        <button
          type="button"
          onClick={() => void handleCopyCode()}
          className="mt-0.5 w-full"
          aria-label={`Copy session code ${code}`}
        >
          <span className="jl-stamp-code text-3xl tracking-[0.35em]">{code}</span>
        </button>
        <p className="mt-2 text-xs text-ink-dim" role="status" aria-live="polite">
          {feedback}
        </p>
      </div>

      {inviteUrl ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void handleInvite()}
            className="btn-primary w-full"
          >
            Invite friends
          </button>
          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="btn-secondary w-full"
          >
            Copy join link
          </button>
        </div>
      ) : null}
    </div>
  );
}
