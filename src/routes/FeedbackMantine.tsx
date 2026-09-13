import { useState } from "react";
import {
  Anchor,
  Button,
  Container,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "react-router-dom";
import { ReportProblemSheet } from "../components/incident/ReportProblemSheet";
import {
  githubBugReportUrl,
  githubBugsBrowseUrl,
  githubIdeasBrowseUrl,
  githubIdeaSubmitUrl,
} from "../domain/device/feedback/githubFeedback";

const externalLinkProps = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
};

export function FeedbackMantine() {
  const [reportProblemOpen, setReportProblemOpen] = useState(false);

  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm">
          Back
        </Anchor>
        <Title order={1}>Feedback</Title>
        <Text c="dimmed">
          Search existing threads before posting so bugs and ideas stay in one
          place. For an urgent live issue mid-game, report a problem instead.
        </Text>

        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
          Live support
        </Text>
        <Button
          onClick={() => setReportProblemOpen(true)}
          aria-label="Report a problem"
        >
          Report a problem
        </Button>

        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
          Improvement ideas
        </Text>
        <Button
          component="a"
          href={githubIdeasBrowseUrl()}
          {...externalLinkProps}
          variant="light"
          aria-label="Browse improvement ideas on GitHub"
        >
          Browse ideas
        </Button>
        <Button
          component="a"
          href={githubIdeaSubmitUrl()}
          {...externalLinkProps}
          aria-label="Suggest an improvement on GitHub"
        >
          Suggest improvement
        </Button>

        <Text size="xs" tt="uppercase" fw={600} c="dimmed">
          Bug reports
        </Text>
        <Button
          component="a"
          href={githubBugsBrowseUrl()}
          {...externalLinkProps}
          variant="light"
          aria-label="Browse bug reports on GitHub"
        >
          Browse bugs
        </Button>
        <Button
          component="a"
          href={githubBugReportUrl()}
          {...externalLinkProps}
          aria-label="Report a bug on GitHub"
        >
          Report a bug
        </Button>
      </Stack>

      <ReportProblemSheet
        open={reportProblemOpen}
        onClose={() => setReportProblemOpen(false)}
      />
    </Container>
  );
}
