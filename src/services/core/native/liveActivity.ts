/**
 * App-facing bridge for the Capacitor Live Activity plugin.
 *
 * App code must import the plugin (and its types) from this module only —
 * not from `plugins/jetlag-live-activity/**` or by calling `registerPlugin`
 * again. The plugin package owns registration, including the web no-op stub.
 */
export {
  JetlagLiveActivity,
  type JetlagLiveActivityPlugin,
  type LiveActivityKind,
  type OngoingNotificationInput,
  type QuestionActivityInput,
  type QuestionActivityUpdate,
  type SessionTimerActivityInput,
  type SessionTimerActivityUpdate,
} from "../../../../plugins/jetlag-live-activity/src/index";
