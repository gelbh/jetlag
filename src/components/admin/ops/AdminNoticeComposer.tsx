import { Button, Group, NumberInput, SegmentedControl, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";
import {
  clampNoticeTtlSeconds,
  normalizeNoticeText,
  SESSION_NOTICE_TEXT_MAX,
  SESSION_NOTICE_TTL_DEFAULT,
  type SessionNoticeDraft,
  type SessionNoticeTone,
} from "@/domain/session/opsNotice";
import { adminPublishSessionNotice } from "@/services/admin/adminSessionNotices";
import { AdminConfirm } from "../shared/AdminConfirm";

interface AdminNoticeComposerProps {
  sessionId: string;
  draft: SessionNoticeDraft | null;
  onDraftChange: (draft: SessionNoticeDraft | null) => void;
}

export function AdminNoticeComposer({ sessionId, draft, onDraftChange }: AdminNoticeComposerProps) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<SessionNoticeTone>("info");
  const [ttlSeconds, setTtlSeconds] = useState(SESSION_NOTICE_TTL_DEFAULT);
  const [sendOpen, setSendOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const preview = () => {
    const normalized = normalizeNoticeText(text);
    if (!normalized) {
      setFormError(`Enter 1–${SESSION_NOTICE_TEXT_MAX} characters.`);
      return;
    }
    setFormError(null);
    onDraftChange({
      text: normalized,
      tone,
      ttlSeconds: clampNoticeTtlSeconds(ttlSeconds),
    });
  };

  const cancel = () => {
    onDraftChange(null);
    setFormError(null);
  };

  return (
    <Stack gap="sm" data-testid="admin-notice-composer">
      <Text size="sm" fw={600}>
        Session notice
      </Text>
      <Textarea
        label="Message"
        description={`Max ${SESSION_NOTICE_TEXT_MAX} characters`}
        value={text}
        onChange={(event) => {
          setText(event.currentTarget.value);
          if (draft) onDraftChange(null);
        }}
        minRows={2}
        maxLength={SESSION_NOTICE_TEXT_MAX}
      />
      <SegmentedControl
        value={tone}
        onChange={(value) => {
          setTone(value as SessionNoticeTone);
          if (draft) onDraftChange(null);
        }}
        data={[
          { label: "Info", value: "info" },
          { label: "Warn", value: "warn" },
        ]}
      />
      <NumberInput
        label="TTL seconds"
        value={ttlSeconds}
        onChange={(value) => {
          setTtlSeconds(typeof value === "number" ? value : SESSION_NOTICE_TTL_DEFAULT);
          if (draft) onDraftChange(null);
        }}
        min={10}
        max={120}
      />
      {formError ? (
        <Text size="sm" c="halt" role="alert">
          {formError}
        </Text>
      ) : null}
      {draft ? (
        <Stack gap="xs">
          <Text size="sm" c="flag" role="status">
            Preview - not sent ({draft.ttlSeconds}s, {draft.tone})
          </Text>
          <Group gap="xs">
            <Button size="sm" onClick={() => setSendOpen(true)} data-testid="admin-notice-send">
              Send
            </Button>
            <Button size="sm" variant="default" onClick={cancel}>
              Cancel
            </Button>
          </Group>
        </Stack>
      ) : (
        <Group gap="xs">
          <Button size="sm" variant="default" onClick={preview} data-testid="admin-notice-preview">
            Preview
          </Button>
        </Group>
      )}

      <AdminConfirm
        opened={sendOpen && draft != null}
        title="Send session notice?"
        consequence={`Players see “${draft?.text ?? ""}” for about ${draft?.ttlSeconds ?? 0} seconds.`}
        confirmLabel="Send notice"
        onClose={() => setSendOpen(false)}
        onConfirm={async () => {
          if (!draft) return;
          await adminPublishSessionNotice(sessionId, draft);
          onDraftChange(null);
          setText("");
        }}
      />
    </Stack>
  );
}
