import { registerPlugin } from "@capacitor/core";
import type { JetlagLiveActivityPlugin } from "./definitions";

export * from "./definitions";

export const JetlagLiveActivity = registerPlugin<JetlagLiveActivityPlugin>(
  "JetlagLiveActivity",
  {
    web: () => import("./web").then((module) => new module.JetlagLiveActivityWeb()),
  },
);
