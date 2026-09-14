import { Box, Stack, Text } from "@mantine/core";
import { FileText, Shield } from "@phosphor-icons/react";
import {
  IosInsetGroup,
  IosSectionLabel,
} from "@/components/ui/apple/iosEntryChrome";
import { IosInsetRow } from "@/components/ui/apple/IosInsetRow";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_FEEDBACK_URL,
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH,
  type LegalSection,
} from "@/domain/legal/legalContact";

/** Mantine / iOS legal article body (header chrome owned by the route). */
export function LegalDocumentIosBody({
  title,
  sections,
  crossLink,
}: {
  title: string;
  sections: LegalSection[];
  crossLink: "privacy" | "terms";
}) {
  const otherPath =
    crossLink === "privacy" ? LEGAL_TERMS_PATH : LEGAL_PRIVACY_PATH;
  const otherLabel =
    crossLink === "privacy" ? "Terms of Service" : "Privacy Policy";
  const otherIcon =
    crossLink === "privacy" ? (
      <FileText size={22} weight="regular" />
    ) : (
      <Shield size={22} weight="regular" />
    );

  return (
    <Stack gap={22} component="article">
      <Stack gap={6}>
        <Text
          component="h1"
          fw={700}
          c="var(--color-field-ink)"
          style={{
            fontSize: "1.75rem",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          {title}
        </Text>
        <Text size="sm" c="var(--color-field-ink-muted)">
          Last updated {LEGAL_EFFECTIVE_DATE}
        </Text>
      </Stack>

      {sections.map((section) => (
        <Stack key={section.id} gap={8}>
          <IosSectionLabel>{section.title}</IosSectionLabel>
          <IosInsetGroup>
            <Box px="md" py="md">
              <Stack gap={10}>
                {section.paragraphs.map((paragraph) => (
                  <Text
                    key={paragraph}
                    size="sm"
                    c="var(--color-field-ink)"
                    style={{ lineHeight: 1.45, textWrap: "pretty" }}
                  >
                    {paragraph}
                  </Text>
                ))}
              </Stack>
            </Box>
          </IosInsetGroup>
        </Stack>
      ))}

      <Stack gap={8}>
        <IosSectionLabel>More</IosSectionLabel>
        <IosInsetGroup>
          <IosInsetRow
            to={otherPath}
            label={otherLabel}
            icon={otherIcon}
          />
          <IosInsetRow
            showSeparator
            href={LEGAL_FEEDBACK_URL}
            label="Open a GitHub issue"
            icon={<FileText size={22} weight="regular" />}
          />
        </IosInsetGroup>
        <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
          Questions or privacy requests can go through Feedback or GitHub.
        </Text>
      </Stack>
    </Stack>
  );
}
