import DeviceActivity
import Foundation
import UserNotifications

final class HushDeviceActivityMonitor: DeviceActivityMonitor {
    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let thresholdEventName = DeviceActivityEvent.Name(
        "hush.five-minute-threshold"
    )
    private static let lastThresholdKey = "deviceActivity.lastThresholdDate"
    private static let reminderDatesKey = "deviceActivity.reminderDates"
    private static let reminderCooldown: TimeInterval = 2 * 60 * 60
    private static let dailyReminderLimit = 3

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

        let now = Date()
        let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)
        userDefaults?.set(now, forKey: Self.lastThresholdKey)

        scheduleReminderIfAllowed(now: now, userDefaults: userDefaults)
    }

    private func scheduleReminderIfAllowed(now: Date, userDefaults: UserDefaults?) {
        let storedDates = userDefaults?.array(forKey: Self.reminderDatesKey) as? [Date] ?? []
        let todayDates = storedDates.filter {
            Calendar.current.isDate($0, inSameDayAs: now)
        }

        guard todayDates.count < Self.dailyReminderLimit else {
            return
        }

        if
            let mostRecentDate = todayDates.max(),
            now.timeIntervalSince(mostRecentDate) < Self.reminderCooldown
        {
            return
        }

        let content = UNMutableNotificationContent()
        content.title = "Hush"
        content.body = "你已经专注了一会儿。现在休息一下吗？"
        content.sound = .default
        content.userInfo = ["hush_entry": "device_activity"]

        let request = UNNotificationRequest(
            identifier: "hush.device-activity.\(UUID().uuidString)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request) { error in
            guard error == nil else {
                return
            }

            userDefaults?.set(todayDates + [now], forKey: Self.reminderDatesKey)
        }
    }
}
