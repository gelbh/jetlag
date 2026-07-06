import Foundation
import ActivityKit
import Capacitor

@available(iOS 16.2, *)
struct JetlagQuestionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var remainingMs: Int
        var status: String
    }

    var sessionId: String
    var toolLabel: String
    var deadlineAt: String
}

@available(iOS 16.2, *)
struct JetlagSessionTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var phaseLabel: String
        var displayTime: String
        var running: Bool
    }

    var sessionId: String
}

@available(iOS 16.2, *)
@objc(JetlagLiveActivityPlugin)
public class JetlagLiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JetlagLiveActivityPlugin"
    public let jsName = "JetlagLiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startQuestionActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateQuestionActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endQuestionActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startSessionTimerActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateSessionTimerActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endSessionTimerActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showOngoingNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "dismissOngoingNotification", returnType: CAPPluginReturnPromise),
    ]

    private var questionActivity: Activity<JetlagQuestionAttributes>?
    private var sessionTimerActivity: Activity<JetlagSessionTimerAttributes>?
    private var pushTokenObserver: Task<Void, Never>?

    deinit {
        pushTokenObserver?.cancel()
    }

    @objc func startQuestionActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        guard
            let sessionId = call.getString("sessionId"),
            let toolLabel = call.getString("toolLabel"),
            let deadlineAt = call.getString("deadlineAt")
        else {
            call.reject("Missing question activity fields")
            return
        }

        let status = call.getString("status") ?? "pending"
        let attributes = JetlagQuestionAttributes(
            sessionId: sessionId,
            toolLabel: toolLabel,
            deadlineAt: deadlineAt
        )
        let state = JetlagQuestionAttributes.ContentState(
            remainingMs: max(0, remainingMs(until: deadlineAt)),
            status: status
        )

        Task {
            await endQuestionActivityInternal()
            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: .token
                )
                self.questionActivity = activity
                self.observePushToken(for: activity)
                call.resolve()
            } catch {
                call.reject("Failed to start question activity", nil, error)
            }
        }
    }

    @objc func updateQuestionActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }

        guard
            let remainingMs = call.getInt("remainingMs"),
            let status = call.getString("status"),
            let activity = questionActivity
        else {
            call.reject("Missing question update fields")
            return
        }

        Task {
            let state = JetlagQuestionAttributes.ContentState(
                remainingMs: remainingMs,
                status: status
            )
            await activity.update(.init(state: state, staleDate: nil))
            call.resolve()
        }
    }

    @objc func endQuestionActivity(_ call: CAPPluginCall) {
        Task {
            await endQuestionActivityInternal()
            call.resolve()
        }
    }

    @objc func startSessionTimerActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }

        guard
            let sessionId = call.getString("sessionId"),
            let phaseLabel = call.getString("phaseLabel"),
            let displayTime = call.getString("displayTime")
        else {
            call.reject("Missing session timer activity fields")
            return
        }

        let running = call.getBool("running") ?? false
        let attributes = JetlagSessionTimerAttributes(sessionId: sessionId)
        let state = JetlagSessionTimerAttributes.ContentState(
            phaseLabel: phaseLabel,
            displayTime: displayTime,
            running: running
        )

        Task {
            await endSessionTimerActivityInternal()
            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: nil),
                    pushType: .token
                )
                self.sessionTimerActivity = activity
                self.observePushToken(for: activity)
                call.resolve()
            } catch {
                call.reject("Failed to start session timer activity", nil, error)
            }
        }
    }

    @objc func updateSessionTimerActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }

        guard
            let phaseLabel = call.getString("phaseLabel"),
            let displayTime = call.getString("displayTime"),
            let activity = sessionTimerActivity
        else {
            call.reject("Missing session timer update fields")
            return
        }

        let running = call.getBool("running") ?? false

        Task {
            let state = JetlagSessionTimerAttributes.ContentState(
                phaseLabel: phaseLabel,
                displayTime: displayTime,
                running: running
            )
            await activity.update(.init(state: state, staleDate: nil))
            call.resolve()
        }
    }

    @objc func endSessionTimerActivity(_ call: CAPPluginCall) {
        Task {
            await endSessionTimerActivityInternal()
            call.resolve()
        }
    }

    @objc func showOngoingNotification(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func dismissOngoingNotification(_ call: CAPPluginCall) {
        call.resolve()
    }

    @available(iOS 16.2, *)
    private func endQuestionActivityInternal() async {
        guard let activity = questionActivity else {
            return
        }

        await activity.end(nil, dismissalPolicy: .immediate)
        questionActivity = nil
    }

    @available(iOS 16.2, *)
    private func endSessionTimerActivityInternal() async {
        guard let activity = sessionTimerActivity else {
            return
        }

        await activity.end(nil, dismissalPolicy: .immediate)
        sessionTimerActivity = nil
    }

    @available(iOS 16.2, *)
    private func remainingMs(until deadlineAt: String) -> Int {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var deadline = formatter.date(from: deadlineAt)
        if deadline == nil {
            formatter.formatOptions = [.withInternetDateTime]
            deadline = formatter.date(from: deadlineAt)
        }
        guard let deadline else {
            return 0
        }
        return Int(deadline.timeIntervalSinceNow * 1000)
    }

    @available(iOS 16.2, *)
    private func observePushToken<A: ActivityAttributes>(for activity: Activity<A>) {
        pushTokenObserver?.cancel()
        pushTokenObserver = Task {
            for await tokenData in activity.pushTokenUpdates {
                let token = tokenData.map { String(format: "%02x", $0) }.joined()
                notifyListeners("activityPushToken", data: ["token": token])
            }
        }
    }
}
