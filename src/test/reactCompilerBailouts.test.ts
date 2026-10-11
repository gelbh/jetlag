import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "oxc-transform-react";
import { describe, expect, it } from "vitest";

// Files React Compiler currently skips in production builds. Delete a line once its file
// compiles; never add one (fix the bailout, or opt out with "use no memo" and a reason).
// Sweep plan: .superpowers/plans/2026-10-11-react-compiler-bailout-sweep.md
const KNOWN_BAILOUTS = new Set([
  "src/App.tsx",
  "src/components/admin/incident/AdminIncidentActions.tsx",
  "src/components/admin/incident/AdminIncidentCursorLaunch.tsx",
  "src/components/admin/incident/AdminIncidentInbox.tsx",
  "src/components/admin/ops/AdminPreloadRequestInbox.tsx",
  "src/components/auth/AccountSignInGate.tsx",
  "src/components/auth/UsernameSetupGate.tsx",
  "src/components/billing/OAuthSignInButton.tsx",
  "src/components/friends/useFriendsPanelModel.ts",
  "src/components/incident/HostConfirmSheet.tsx",
  "src/components/incident/ReportProblemSheet.tsx",
  "src/components/presets/RequestPreloadSection.tsx",
  "src/components/session/settings/RolePasscodeSettings.tsx",
  "src/components/ui/banners/AppUpdateProvider.tsx",
  "src/components/ui/feedback/AppCheckProbeGate.tsx",
  "src/components/ui/feedback/ClientMinVersionGate.tsx",
  "src/hooks/admin/useAdminJoinSession.ts",
  "src/hooks/admin/useAdminSessionList.ts",
  "src/hooks/forms/useSubmitLock.ts",
  "src/hooks/incident/useIncidentThread.ts",
  "src/hooks/incident/useSupportThread.ts",
  "src/hooks/session/useContinueActiveSession.ts",
  "src/routes/AdminMapScreen.tsx",
  "src/routes/PremiumPageContent.tsx",
  "src/routes/create-session/GameAreaSection.tsx",
  "src/routes/create-session/useCreateSession.ts",
  "src/routes/join-session/useJoinSession.ts",
]);

const repoRoot = join(import.meta.dirname, "../..");
const srcDir = join(repoRoot, "src");

function sourceFiles(): string[] {
  return readdirSync(srcDir, { recursive: true, encoding: "utf8" })
    .filter((path) => /\.tsx?$/.test(path) && !/\.(test|d)\.tsx?$/.test(path))
    .filter((path) => !path.startsWith("test/"))
    .map((path) => `src/${path.split("\\").join("/")}`)
    .sort();
}

async function compilerErrors(path: string): Promise<string[]> {
  const code = readFileSync(join(repoRoot, path), "utf8");
  const result = await transform(path, code, {
    jsx: { runtime: "automatic" },
    reactCompiler: { panicThreshold: "all_errors" },
    sourcemap: false,
  });
  return result.errors.map((error) => error.message.split("\n")[0] ?? "");
}

describe("React Compiler coverage", () => {
  it("only known files bail out, and known files still do", { timeout: 60_000 }, async () => {
    const newBailouts: string[] = [];
    const nowCompiling: string[] = [];
    for (const path of sourceFiles()) {
      const errors = await compilerErrors(path);
      if (errors.length > 0 && !KNOWN_BAILOUTS.has(path)) {
        newBailouts.push(`${path}: ${errors.join("; ")}`);
      } else if (errors.length === 0 && KNOWN_BAILOUTS.has(path)) {
        nowCompiling.push(path);
      }
    }
    expect({ newBailouts, nowCompiling }).toEqual({ newBailouts: [], nowCompiling: [] });
  });
});
