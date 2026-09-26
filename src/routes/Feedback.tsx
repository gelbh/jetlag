import { useState } from "react";
import { Button, Container, Stack, Text } from "@mantine/core";
import {
  Bug,
  ChatCircleDots,
  Lightbulb,
  MagnifyingGlass,
  WarningCircle,
} from "@phosphor-icons/react";
import { ReportProblemSheet } from "@/components/incident/ReportProblemSheet";
import {
  InsetGroup,
  SectionLabel,
  filledStyles,
} from "@/components/ui/entry/entryChrome";
import { InsetRow } from "@/components/ui/entry/InsetRow";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeasBrowseUrl,
  githubIdeaSubmitUrl,
} from "@/domain/device/feedback/githubFeedback";

export function Feedback() {
  const [reportProblemOpen, setReportProblemOpen] = useState(false);

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title="Feedback" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
      >
        <Stack gap={22}>
          <Text
            size="sm"
            c="var(--color-field-ink-muted)"
            style={{ lineHeight: 1.4, textWrap: "pretty" }}
          >
            Search existing threads before posting so bugs and ideas stay in one
            place. For an urgent live issue mid-game, report a problem instead.
          </Text>

          <Stack gap={8}>
            <SectionLabel>Live support</SectionLabel>
            <Button
              fullWidth
              leftSection={<WarningCircle size={18} weight="bold" />}
              onClick={() => setReportProblemOpen(true)}
              aria-label="Report a problem"
              styles={filledStyles}
            >
              Report a problem
            </Button>
          </Stack>

          <Stack gap={8}>
            <SectionLabel>Improvement ideas</SectionLabel>
            <InsetGroup>
              <InsetRow
                href={githubIdeasBrowseUrl()}
                label="Browse ideas"
                icon={<MagnifyingGlass size={22} weight="regular" />}
                aria-label="Browse improvement ideas on GitHub"
              />
              <InsetRow
                showSeparator
                href={githubIdeaSubmitUrl()}
                label="Suggest improvement"
                icon={<Lightbulb size={22} weight="regular" />}
                aria-label="Suggest an improvement on GitHub"
              />
            </InsetGroup>
          </Stack>

          <Stack gap={8}>
            <SectionLabel>Bug reports</SectionLabel>
            <InsetGroup>
              <InsetRow
                href={githubBugsBrowseUrl()}
                label="Browse bugs"
                icon={<ChatCircleDots size={22} weight="regular" />}
                aria-label="Browse bug reports on GitHub"
              />
              <InsetRow
                showSeparator
                href={githubBugReportUrl()}
                label="Report a bug"
                icon={<Bug size={22} weight="regular" />}
                aria-label="Report a bug on GitHub"
              />
            </InsetGroup>
          </Stack>
        </Stack>

        <ReportProblemSheet
          open={reportProblemOpen}
          onClose={() => setReportProblemOpen(false)}
        />
      </Container>
    </EntryScreenLayout>
  );
}
