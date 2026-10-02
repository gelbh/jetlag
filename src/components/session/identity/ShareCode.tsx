import { Button, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { filledStyles, grayStyles } from "@/components/ui/entry/entryChrome";
import crawlPolicy from "@/domain/seo/seoCrawlPolicy.json";
import { useCopyFeedback } from "@/hooks/forms/useCopyFeedback";
import {
  buildSessionInviteUrl,
  resolveSessionInviteOrigin,
} from "@/services/session/sessionInviteUrl";

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
    typeof window !== "undefined" ? window.location.origin : crawlPolicy.siteOrigin;
  const origin = resolveSessionInviteOrigin(currentOrigin, crawlPolicy.siteOrigin);
  return buildSessionInviteUrl(origin, code);
}

export function ShareCode({ code, remote = false, compact = false }: ShareCodeProps) {
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
        aria-label={`Copy session code ${code}`}
        className="min-h-12 flex-1 rounded-[12px] px-3 py-2 text-center"
        style={{
          backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
          border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
        }}
      >
        <Text
          size="xs"
          fw={590}
          tt="uppercase"
          style={{
            letterSpacing: "0.08em",
            color: "var(--color-field-ink-muted)",
          }}
        >
          Code
        </Text>
        <Text
          className="jl-stamp-code"
          style={{
            marginTop: "0.15rem",
            fontSize: "1.125rem",
            letterSpacing: "0.2em",
            color: "var(--color-field-ink)",
          }}
        >
          {code}
        </Text>
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
    <Stack gap="sm">
      <button
        type="button"
        onClick={() => void handleCopyCode()}
        aria-label={`Copy session code ${code}`}
        className="w-full rounded-[12px] px-4 py-3 text-center"
        style={{
          backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
          border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
        }}
      >
        <Text
          size="xs"
          fw={590}
          tt="uppercase"
          style={{
            letterSpacing: "0.08em",
            color: "var(--color-field-ink-muted)",
          }}
        >
          Session code
        </Text>
        <Text
          className="jl-stamp-code"
          style={{
            marginTop: "0.35rem",
            fontSize: "1.75rem",
            letterSpacing: "0.28em",
            color: "var(--color-field-ink)",
          }}
        >
          {code}
        </Text>
        <Text
          role="status"
          aria-live="polite"
          size="xs"
          style={{
            marginTop: "0.5rem",
            color: "var(--color-field-ink-muted)",
          }}
        >
          {feedback}
        </Text>
      </button>

      {inviteUrl ? (
        <Stack gap="xs">
          <Button fullWidth styles={filledStyles} onClick={() => void handleInvite()}>
            Invite friends
          </Button>
          <Button fullWidth styles={grayStyles} onClick={() => void handleCopyLink()}>
            Copy join link
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
