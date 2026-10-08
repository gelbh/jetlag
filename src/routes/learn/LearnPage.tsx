import { LearnArticle } from "@/components/learn/LearnArticle";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import { learnPageContent } from "@/domain/learn/learnContent";
import { learnPageMeta } from "@/domain/learn/learnPageMeta";
import type { LearnRoutePath } from "@/domain/seo/learnRoutePaths";

/** Guide, question tool explainers and FAQ: one lazy chunk for every `LEARN_ROUTE_PATHS` page. */
export function LearnPage({ path }: { path: LearnRoutePath }) {
  const meta = learnPageMeta(path);
  return (
    <EntryRouteShell title={meta.headerTitle} backTo={meta.parent ?? "/"} titleIsHeading={false}>
      <LearnArticle content={learnPageContent(path)} />
    </EntryRouteShell>
  );
}
