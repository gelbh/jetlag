import { Box, Stack, Text, Title } from "@mantine/core";
import { BookOpenTextIcon, PlusCircleIcon, SignInIcon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { InsetGroup, SectionLabel } from "@/components/ui/entry/entryChrome";
import { InsetRow } from "@/components/ui/entry/InsetRow";
import type { LearnBlock, LearnPageContent, LearnSection } from "@/domain/learn/learnContentTypes";
import { learnLinkLabel, learnPageMeta } from "@/domain/learn/learnPageMeta";
import { UNOFFICIAL_DISCLAIMER } from "@/domain/legal/legalContact";

// Inline styles only: prerendered HTML keeps the SPA shell's <head> assets, so a lazy route
// stylesheet would arrive after first paint and shift the page.
const bodyTextStyle: CSSProperties = { lineHeight: 1.55, textWrap: "pretty" };
const listStyle: CSSProperties = {
  margin: 0,
  paddingInlineStart: "1.25rem",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "var(--color-field-ink)",
  lineHeight: 1.5,
};
const visuallyHiddenStyle: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};
const cellStyle: CSSProperties = {
  textAlign: "start",
  verticalAlign: "top",
  padding: "0.625rem 0.75rem",
  borderTop: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.14)",
  lineHeight: 1.4,
};

function Block({ block }: { block: LearnBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <Text c="var(--color-field-ink)" style={bodyTextStyle}>
          {block.text}
        </Text>
      );
    case "steps":
      return (
        <ol style={listStyle}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      );
    case "bullets":
      return (
        <ul style={listStyle}>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <InsetGroup>
          <Box
            component="table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              color: "var(--color-field-ink)",
              fontSize: "0.9375rem",
            }}
          >
            {/* The h2 and header row already label the table on screen. */}
            <caption style={visuallyHiddenStyle}>{block.caption}</caption>
            <thead>
              <tr>
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    style={{ ...cellStyle, fontWeight: 600, borderTop: "none" }}
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([label, value]) => (
                <tr key={label}>
                  <th scope="row" style={{ ...cellStyle, fontWeight: 600, width: "38%" }}>
                    {label}
                  </th>
                  <td style={cellStyle}>{value}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </InsetGroup>
      );
  }
}

function Section({ section }: { section: LearnSection }) {
  const headingId = `${section.id}-heading`;
  return (
    <Stack
      component="section"
      id={section.id}
      aria-labelledby={headingId}
      gap={10}
      // Deep links (#id) must clear the sticky EntryHeader.
      style={{ scrollMarginTop: "calc(52px + max(0.5rem, var(--safe-area-top)) + 8px)" }}
    >
      <Title
        order={2}
        id={headingId}
        c="var(--color-field-ink)"
        fw={700}
        style={{ fontSize: "1.25rem", lineHeight: 1.25, letterSpacing: "-0.015em" }}
      >
        {section.heading}
      </Title>
      <Text c="var(--color-field-ink)" style={bodyTextStyle}>
        {section.lead}
      </Text>
      {section.blocks?.map((block, index) => (
        // Static copy in a fixed order, so the index is a stable key.
        <Block key={index} block={block} />
      ))}
    </Stack>
  );
}

/** Long-form how-to-play article (guide, tool explainers, FAQ). Header bar owned by the route. */
export function LearnArticle({ content }: { content: LearnPageContent }) {
  const meta = learnPageMeta(content.path);

  return (
    <Stack gap={28} component="article">
      <Stack gap={10}>
        <Title
          order={1}
          c="var(--color-field-ink)"
          fw={700}
          style={{ fontSize: "1.75rem", letterSpacing: "-0.03em", lineHeight: 1.15 }}
        >
          {meta.h1}
        </Title>
        <Text c="var(--color-field-ink)" fz="1.0625rem" style={bodyTextStyle}>
          {content.intro}
        </Text>
      </Stack>

      {content.sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}

      <Stack gap={8} component="nav" aria-label="Keep reading">
        <SectionLabel>Keep reading</SectionLabel>
        <InsetGroup>
          {content.related.map((path, index) => (
            <InsetRow
              key={path}
              showSeparator={index > 0}
              to={path}
              label={learnLinkLabel(path)}
              icon={<BookOpenTextIcon size={22} weight="regular" />}
            />
          ))}
        </InsetGroup>
      </Stack>

      <Stack gap={8}>
        <SectionLabel>Ready to play</SectionLabel>
        <InsetGroup>
          <InsetRow
            to="/join"
            label="Join session"
            icon={<SignInIcon size={22} weight="regular" />}
          />
          <InsetRow
            showSeparator
            to="/create"
            label="Create session"
            icon={<PlusCircleIcon size={22} weight="regular" />}
          />
        </InsetGroup>
        <Text size="sm" c="var(--color-field-ink)" px={4} style={bodyTextStyle}>
          {UNOFFICIAL_DISCLAIMER}
        </Text>
      </Stack>
    </Stack>
  );
}
