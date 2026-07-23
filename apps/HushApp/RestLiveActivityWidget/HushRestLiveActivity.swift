import ActivityKit
import SwiftUI
import WidgetKit

struct HushRestAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var message: String
    }

    var sessionName: String
}

struct HushRestLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: HushRestAttributes.self) { context in
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.sessionName)
                    .font(.headline)
                Text(context.state.message)
                    .font(.subheadline)
            }
            .padding()
            .activityBackgroundTint(.blue.opacity(0.15))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "moon.zzz")
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.sessionName)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.message)
                }
            } compactLeading: {
                Image(systemName: "moon.zzz")
            } compactTrailing: {
                Text("休息")
            } minimal: {
                Image(systemName: "moon.zzz")
            }
        }
    }
}

@main
struct HushRestLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        HushRestLiveActivity()
    }
}
