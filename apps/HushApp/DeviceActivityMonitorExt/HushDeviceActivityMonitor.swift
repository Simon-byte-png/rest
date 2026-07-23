import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import UserNotifications

final class HushDeviceActivityMonitor: DeviceActivityMonitor {
    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let thresholdEventName = DeviceActivityEvent.Name(
        "hush.one-hour-threshold"
    )
    private static let selectionKey = "familyActivitySelection"
    private static let interruptionModeKey = "deviceActivity.interruptionMode"
    private static let lastThresholdKey = "deviceActivity.lastThresholdDate"
    private static let reminderDatesKey = "deviceActivity.reminderDates"
    private static let reminderCooldown: TimeInterval = 2 * 60 * 60
    private static let dailyReminderLimit = 3
    private static let managedSettingsStore = ManagedSettingsStore(
        named: ManagedSettingsStore.Name("hush.interruption")
    )

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        Self.managedSettingsStore.clearAllSettings()
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

        applyFirmInterruptionIfNeeded(userDefaults: userDefaults)
        scheduleReminderIfAllowed(now: now, userDefaults: userDefaults)
    }

    private func applyFirmInterruptionIfNeeded(userDefaults: UserDefaults?) {
        guard
            userDefaults?.string(forKey: Self.interruptionModeKey) == "firm",
            let data = userDefaults?.data(forKey: Self.selectionKey),
            let selection = try? PropertyListDecoder().decode(
                FamilyActivitySelection.self,
                from: data
            )
        else {
            Self.managedSettingsStore.clearAllSettings()
            return
        }

        let store = Self.managedSettingsStore
        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil
            : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil
            : .specific(selection.categoryTokens)
        store.shield.webDomainCategories = selection.categoryTokens.isEmpty
            ? nil
            : .specific(selection.categoryTokens)
        store.shield.webDomains = selection.webDomainTokens.isEmpty
            ? nil
            : selection.webDomainTokens
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
        content.body = "已经使用一小时了。现在把这一分钟留给自己吧。"
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
