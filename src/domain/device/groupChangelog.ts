import type { ChangelogEntry } from "./changelog";

export type MinorGroupNode = {
  kind: "minorGroup";
  label: string;
  date: string;
  summary: string[];
  children: ChangelogEntry[];
};

export type MajorGroupNode = {
  kind: "majorGroup";
  label: string;
  date: string;
  summary: string[];
  children: MinorGroupNode[];
};

export type ChangelogNode =
  | { kind: "version"; entry: ChangelogEntry }
  | MinorGroupNode
  | MajorGroupNode;

type VersionParts = {
  major: number;
  minor: number;
  patch: number;
};

function parseVersionParts(version: string): VersionParts {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid changelog version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function minorKey(parts: Pick<VersionParts, "major" | "minor">): string {
  return `${parts.major}.${parts.minor}`;
}

export function filterUserFacingChangelog(
  entries: readonly ChangelogEntry[],
): ChangelogEntry[] {
  return entries
    .map((entry) => ({
      ...entry,
      sections: entry.sections.filter((section) => section.title !== "Technical"),
    }))
    .filter((entry) => entry.sections.length > 0);
}

export function buildGroupSummary(entries: readonly ChangelogEntry[]): string[] {
  const improvements: string[] = [];
  const fixes: string[] = [];

  for (const entry of entries) {
    for (const section of entry.sections) {
      if (section.title === "Improvements") {
        improvements.push(...section.items);
      } else if (section.title === "Fixes") {
        fixes.push(...section.items);
      }
    }
  }

  return [...improvements, ...fixes].slice(0, 5);
}

function createMinorGroup(
  label: string,
  children: ChangelogEntry[],
): MinorGroupNode {
  return {
    kind: "minorGroup",
    label,
    date: children[0]?.date ?? "",
    summary: buildGroupSummary(children),
    children,
  };
}

function createMajorGroup(
  label: string,
  children: MinorGroupNode[],
): MajorGroupNode {
  const allEntries = children.flatMap((group) => group.children);

  return {
    kind: "majorGroup",
    label,
    date: children[0]?.date ?? "",
    summary: buildGroupSummary(allEntries),
    children,
  };
}

export function groupChangelogEntries(
  entries: readonly ChangelogEntry[],
): ChangelogNode[] {
  const filtered = filterUserFacingChangelog(entries);
  if (filtered.length === 0) {
    return [];
  }

  const currentMinorKey = minorKey(parseVersionParts(filtered[0].version));
  const maxMajor = Math.max(
    ...filtered.map((entry) => parseVersionParts(entry.version).major),
  );

  const minorBuckets = new Map<string, ChangelogEntry[]>();
  for (const entry of filtered) {
    const key = minorKey(parseVersionParts(entry.version));
    const bucket = minorBuckets.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      minorBuckets.set(key, [entry]);
    }
  }

  const minorKeyOrder: string[] = [];
  for (const entry of filtered) {
    const key = minorKey(parseVersionParts(entry.version));
    if (!minorKeyOrder.includes(key)) {
      minorKeyOrder.push(key);
    }
  }

  const result: ChangelogNode[] = [];
  let index = 0;

  while (index < minorKeyOrder.length) {
    const key = minorKeyOrder[index];
    const bucketEntries = minorBuckets.get(key);
    if (!bucketEntries) {
      index += 1;
      continue;
    }

    if (key === currentMinorKey) {
      for (const entry of bucketEntries) {
        result.push({ kind: "version", entry });
      }
      index += 1;
      continue;
    }

    const major = parseVersionParts(bucketEntries[0].version).major;
    const shouldWrapMajor = major >= 1 && maxMajor > major;

    if (shouldWrapMajor) {
      const minorGroups: MinorGroupNode[] = [];
      while (index < minorKeyOrder.length) {
        const nextKey = minorKeyOrder[index];
        const nextEntries = minorBuckets.get(nextKey);
        if (!nextEntries || nextKey === currentMinorKey) {
          break;
        }

        const nextMajor = parseVersionParts(nextEntries[0].version).major;
        if (nextMajor !== major) {
          break;
        }

        minorGroups.push(createMinorGroup(nextKey, nextEntries));
        index += 1;
      }

      result.push(createMajorGroup(String(major), minorGroups));
      continue;
    }

    result.push(createMinorGroup(key, bucketEntries));
    index += 1;
  }

  return result;
}
