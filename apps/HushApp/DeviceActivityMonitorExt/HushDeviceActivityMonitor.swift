import DeviceActivity
import Foundation

final class HushDeviceActivityMonitor: DeviceActivityMonitor {
    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let thresholdEventName = DeviceActivityEvent.Name(
        "hush.five-minute-threshold"
    )
    private static let lastThresholdKey = "deviceActivity.lastThresholdDate"

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
    }

    override func eventDidReachThreshold(
        _ event: DeviceActivityEvent.Name,
        activity: DeviceActivityName
    ) {
        super.eventDidReachThreshold(event, activity: activity)

        guard event == Self.thresholdEventName else {
            return
        }

        UserDefaults(suiteName: Self.appGroupIdentifier)?
            .set(Date(), forKey: Self.lastThresholdKey)
    }
}
