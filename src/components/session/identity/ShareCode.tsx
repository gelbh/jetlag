import { useCopyFeedback } from "../../../hooks/forms/useCopyFeedback";
import { buildSessionInviteUrl } from "../../../domain/session/join/sessionInviteUrl";

interface ShareCodeProps {
  code: string;
  remote?: boolean;
  compact?: boolean;
}

function canNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function ShareCode({
  code,
  remote = false,
  compact = false,
}: ShareCodeProps) {
  const { status: copyStatus, copy } = useCopyFeedback();
  const { status: linkCopyStatus, copy: copyLink } = useCopyFeedback();

  const inviteUrl =
    remote && typeof window !== "undefined"
      ? buildSessionInviteUrl(window.location.origin, code)
      : null;

  const handleCopyCode = async () => {
    await copy(code);
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) {
      return;
    }
    await copyLink(inviteUrl);
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

    await copyLink(inviteUrl);
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
      ? "Copied to clipboard."
      : copyStatus === "failed"
        ? "Copy failed. Select and copy manually."
        : linkCopyStatus === "copied"
          ? "Join link copied."
          : linkCopyStatus === "failed"
            ? "Couldn't copy the join link."
            : remote
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
        <p className="mt-2 text-xs text-ink-dim">{feedback}</p>
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
