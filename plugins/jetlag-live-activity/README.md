# Jetlag Live Activity plugin

Capacitor plugin for iOS Live Activities and Android ongoing session notifications.

## Boundaries

| Layer | Owns | App code may |
|-------|------|--------------|
| `plugins/jetlag-live-activity/src/definitions.ts` | Shared TS contract (method names + payloads) | Import types only via `src/services/core/liveActivity.ts` |
| `src/index.ts` + `src/web.ts` | Plugin registration + web no-op stub | — (use the app bridge) |
| `ios/Sources/…`, `ios/Widget/…` | iOS Live Activities + push-token events | — |
| `android/…/JetlagLiveActivityPlugin.java` | Android ongoing notifications | — |
| `src/services/core/liveActivity.ts` | Thin app re-export of the registered plugin | Import `JetlagLiveActivity` / types here |
| `src/services/core/notifications.ts` | Push/local registration + device upsert | Call bridge APIs; do not re-register the plugin |
| `src/hooks/sync/useLiveActivitySync.ts` | Session → Live Activity / ongoing notification sync | Import bridge only |

Do **not** deep-import `plugins/jetlag-live-activity/**` from routes, hooks, or components. Do **not** call `registerPlugin("JetlagLiveActivity")` outside the plugin package.

## Contract source of truth

`src/definitions.ts` is the API contract. Native methods must stay aligned:

- iOS: `pluginMethods` + `@objc` handlers in `ios/Sources/JetlagLiveActivityPlugin/JetlagLiveActivityPlugin.swift`
- Android: `@PluginMethod` handlers in `android/src/main/java/dev/gelbhart/jetlag/liveactivity/JetlagLiveActivityPlugin.java`
- Web: no-op implementations in `src/web.ts`

Methods: `startQuestionActivity`, `updateQuestionActivity`, `endQuestionActivity`, `startSessionTimerActivity`, `updateSessionTimerActivity`, `endSessionTimerActivity`, `showOngoingNotification`, `dismissOngoingNotification`, and the `activityPushToken` listener (iOS).

## When to rebuild `dist/`

The package `"main"` / `"module"` / `"types"` point at `dist/`. Rebuild **only** when you change plugin TypeScript under `src/` and need consumers that resolve the package entry (or Capacitor tooling that reads `dist`) to pick up those changes:

```bash
cd plugins/jetlag-live-activity && npm run build
```

Do **not** hand-edit `dist/**`. Prefer committing rebuilt `dist/` in the same change that updates `src/`, and only when that rebuild is required for the change to work. App code that imports through `src/services/core/liveActivity.ts` (relative to plugin `src/`) does not need a `dist/` rebuild for typecheck.

## Capacitor sync

After native plugin source changes (Swift / Java / widget), sync into the app shells:

```bash
npm run cap:sync
```

Then open the platform project if you need Xcode/Android Studio verification:

- iOS: `npx cap open ios` → `ios/App`
- Android: `npx cap open android`

## Platform entry points (app shell)

These are Capacitor host entry points; they do not contain Live Activity logic. Plugin code lives under `plugins/jetlag-live-activity/`.

| Platform | Entry |
|----------|--------|
| Android | `android/app/src/main/java/dev/gelbhart/jetlag/MainActivity.java` (`BridgeActivity`) |
| iOS | `ios/App/App/AppDelegate.swift` |

## iOS setup

1. Open `ios/App` in Xcode after `npm run cap:sync`.
2. Add a **Widget Extension** target named `JetlagWidgets`.
3. Include the Swift sources from `plugins/jetlag-live-activity/ios/Widget/` and share `JetlagQuestionAttributes` / `JetlagSessionTimerAttributes` from `ios/Sources/JetlagLiveActivityPlugin/JetlagLiveActivityPlugin.swift` with the widget target.
4. Enable **Push Notifications** and **Background Modes → Remote notifications** for the app target.
5. Upload your APNs key to Firebase Cloud Messaging for push delivery to devices and Live Activity updates.

## Android setup

1. Add `google-services.json` to `android/app/`.
2. Configure FCM in Firebase console for the Android app id `dev.gelbhart.jetlag`.

## Usage

The React app registers device tokens when notifications are enabled in map settings (`src/services/core/notifications.ts`). Session UI syncs Live Activities / ongoing notifications through `useLiveActivitySync`, which talks to the plugin only via `src/services/core/liveActivity.ts`. Cloud Functions send role-filtered FCM messages on question, timer, and chat events.
