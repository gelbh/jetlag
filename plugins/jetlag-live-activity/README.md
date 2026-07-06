# Jetlag Live Activity plugin

Capacitor plugin for iOS Live Activities and Android ongoing session notifications.

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

The React app registers device tokens when notifications are enabled in map settings. Cloud Functions send role-filtered FCM messages on question, timer, and chat events.
