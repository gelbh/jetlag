/**
 * After `changeset publish` tags a private root package, create a GitHub Release
 * whose body is the dated (or undated) CHANGELOG section for that version.
 *
 * changesets/action's built-in release body matcher only accepts undated
 * `## X.Y.Z` headings; Jetlag stamps dates for in-app sync, so we own Release
 * creation here (`create-github-releases: false` on the action).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { extractChangelogReleaseBody } from "./changelog-release-body.mjs";

const projectRoot = resolve(import.meta.dirname, "..");

function isCliMain() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return resolve(entry) === resolve(import.meta.filename);
}

async function createGithubRelease({ owner, repo, tag, name, body, token }) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tag_name: tag,
      name,
      body,
      draft: false,
      prerelease: false,
    }),
  });

  if (response.status === 422) {
    const payload = await response.json().catch(() => ({}));
    const message = String(payload.message ?? "");
    if (/already_exists/i.test(message) || /already exists/i.test(message)) {
      console.info(`GitHub Release for ${tag} already exists; skipping.`);
      return;
    }
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create GitHub Release ${tag}: ${response.status} ${text}`);
  }

  console.info(`Created GitHub Release ${tag}.`);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    console.info(
      "GITHUB_TOKEN or GITHUB_REPOSITORY unset; skipping GitHub Release create (local/dev).",
    );
    return;
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8"));
  const version = packageJson.version;
  const tag = `v${version}`;
  const markdown = readFileSync(resolve(projectRoot, "CHANGELOG.md"), "utf8");
  const body = extractChangelogReleaseBody(markdown, version);
  if (!body) {
    throw new Error(`No CHANGELOG.md section found for ${version} (dated or undated ## heading).`);
  }

  await createGithubRelease({
    owner,
    repo,
    tag,
    name: tag,
    body,
    token,
  });
}

if (isCliMain()) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
