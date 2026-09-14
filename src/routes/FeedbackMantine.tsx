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
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetRow } from "@/components/ui/apple/IosInsetRow";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeasBrowseUrl,
  githubIdeaSubmitUrl,
} from "@/domain/device/feedback/githubFeedback";

export function FeedbackMantine() {
  const [reportProblemOpen, setReportProblemOpen] = useState(false);

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Feedback" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
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
            <IosSectionLabel>Live support</IosSectionLabel>
            <Button
              fullWidth
              leftSection={<WarningCircle size={18} weight="bold" />}
              onClick={() => setReportProblemOpen(true)}
              aria-label="Report a problem"
              styles={iosFilledStyles}
            >
              Report a problem
            </Button>
          </Stack>

          <Stack gap={8}>
            <IosSectionLabel>Improvement ideas</IosSectionLabel>
            <IosInsetGroup>
              <IosInsetRow
                href={githubIdeasBrowseUrl()}
                label="Browse ideas"
                icon={<MagnifyingGlass size={22} weight="regular" />}
                aria-label="Browse improvement ideas on GitHub"
              />
              <IosInsetRow
                showSeparator
                href={githubIdeaSubmitUrl()}
                label="Suggest improvement"
                icon={<Lightbulb size={22} weight="regular" />}
                aria-label="Suggest an improvement on GitHub"
              />
            </IosInsetGroup>
          </Stack>

          <Stack gap={8}>
            <IosSectionLabel>Bug reports</IosSectionLabel>
            <IosInsetGroup>
              <IosInsetRow
                href={githubBugsBrowseUrl()}
                label="Browse bugs"
                icon={<ChatCircleDots size={22} weight="regular" />}
                aria-label="Browse bug reports on GitHub"
              />
              <IosInsetRow
                showSeparator
                href={githubBugReportUrl()}
                label="Report a bug"
                icon={<Bug size={22} weight="regular" />}
                aria-label="Report a bug on GitHub"
              />
            </IosInsetGroup>
          </Stack>
        </Stack>

        <ReportProblemSheet
          open={reportProblemOpen}
          onClose={() => setReportProblemOpen(false)}
          chrome="ios"
        />
      </Container>
    </EntryScreenLayout>
  );
}
