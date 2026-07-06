import ActivityKit
import SwiftUI
import WidgetKit

@available(iOS 16.2, *)
struct JetlagQuestionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JetlagQuestionAttributes.self) { context in
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.toolLabel)
                    .font(.headline)
                Text(context.state.status == "walking" ? "Walking" : formatRemaining(context.state.remainingMs))
                    .font(.title2.monospacedDigit())
            }
            .padding(.horizontal, 8)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.attributes.toolLabel)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(formatRemaining(context.state.remainingMs))
                        .monospacedDigit()
                }
            } compactLeading: {
                Text(context.attributes.toolLabel.prefix(1))
            } compactTrailing: {
                Text(formatRemaining(context.state.remainingMs))
                    .monospacedDigit()
            } minimal: {
                Text("?")
            }
        }
    }

    private func formatRemaining(_ remainingMs: Int) -> String {
        let totalSeconds = max(0, remainingMs / 1000)
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }
}

@available(iOS 16.2, *)
struct JetlagSessionTimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JetlagSessionTimerAttributes.self) { context in
            VStack(alignment: .leading, spacing: 4) {
                Text(context.state.phaseLabel)
                    .font(.headline)
                Text(context.state.displayTime)
                    .font(.title2.monospacedDigit())
                Text(context.state.running ? "Running" : "Paused")
                    .font(.caption)
            }
            .padding(.horizontal, 8)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.phaseLabel)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.displayTime)
                        .monospacedDigit()
                }
            } compactLeading: {
                Text("⏱")
            } compactTrailing: {
                Text(context.state.displayTime)
                    .monospacedDigit()
            } minimal: {
                Text("⏱")
            }
        }
    }
}

@available(iOS 16.2, *)
@main
struct JetlagWidgetsBundle: WidgetBundle {
    var body: some Widget {
        JetlagQuestionLiveActivity()
        JetlagSessionTimerLiveActivity()
    }
}
