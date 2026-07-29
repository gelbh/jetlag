import { registerPlugin } from "@capacitor/core";
import type { JetlagLiveActivityPlugin } from "./definitions";

export * from "./definitions";

/**
 * Sole `registerPlugin("JetlagLiveActivity")` call (includes web no-op stub).
 * App code must use `src/services/core/native/liveActivity.ts` instead of importing this
 * entry or registering the plugin again.
 */
export const JetlagLiveActivity = registerPlugin<JetlagLiveActivityPlugin>(
  "JetlagLiveActivity",
  {
    web: () => import("./web").then((module) => new module.JetlagLiveActivityWeb()),
  },
);
