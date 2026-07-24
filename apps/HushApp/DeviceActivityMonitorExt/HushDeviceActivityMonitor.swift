import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings
import UserNotifications

final class HushDeviceActivityMonitor: DeviceActivityMonitor {
    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let selectionKey = "familyActivitySelection"
    private static let interruptionModeKey = "deviceActivity.interruptionMode"
    private static let agentBaseURLKey = "agent.baseURL"
    private static let contextLabelKey = "agent.userProvidedContextLabel"
    private static let lastCompletedRestDateKey = "restSession.lastCompletedDate"
    private static let lastThresholdKey = "deviceActivity.lastThresholdDate"
    private static let lastAgentDecisionKey = "agent.lastDecisionMessage"
    private static let lastAgentErrorKey = "agent.lastErrorMessage"
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

        guard let checkpointMinutes = Self.checkpointMinutes(from: event) else {
            return
        }

        let now = Date()
        let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)
        userDefaults?.set(now, forKey: Self.lastThresholdKey)

        requestAgentDecision(
            checkpointMinutes: checkpointMinutes,
            now: now,
            userDefaults: userDefaults
        )
    }

    private func requestAgentDecision(
        checkpointMinutes: Int,
        now: Date,
        userDefaults: UserDefaults?
    ) {
        guard
            let baseURL = userDefaults?.string(forKey: Self.agentBaseURLKey),
            let contextLabel = userDefaults?.string(forKey: Self.contextLabelKey),
            !contextLabel.isEmpty
        else {
            recordAgentError("云端 Agent 尚未配置。", userDefaults: userDefaults)
            return
        }

        let minutesSinceLastRest = Self.minutesSinceLastRest(
            now: now,
            userDefaults: userDefaults
        )

        Task {
            do {
                let provider = try HTTPRestDecisionProvider(
                    baseURLString: baseURL
                )
                let decision = try await provider.evaluate(
                    checkpointMinutes: checkpointMinutes,
                    contextLabel: contextLabel,
                    minutesSinceLastRest: minutesSinceLastRest
                )
                userDefaults?.removeObject(forKey: Self.lastAgentErrorKey)
                userDefaults?.set(
                    decision.message,
                    forKey: Self.lastAgentDecisionKey
                )

                guard decision.shouldOfferRest else {
                    return
                }

                if userDefaults?.string(
                    forKey: Self.interruptionModeKey
                ) == "firm" {
                    applyFirmInterruption(userDefaults: userDefaults)
                }

                scheduleReminder(
                    contextLabel: contextLabel,
                    agentMessage: decision.message
                )
            } catch {
                recordAgentError(
                    "无法连接云端 Agent，本次未执行打断。",
                    userDefaults: userDefaults
                )
            }
        }
    }

    private static func checkpointMinutes(
        from event: DeviceActivityEvent.Name
    ) -> Int? {
        let prefix = "hush.checkpoint."
        guard event.rawValue.hasPrefix(prefix) else {
            return nil
        }

        return Int(event.rawValue.dropFirst(prefix.count))
    }

    private static func minutesSinceLastRest(
        now: Date,
        userDefaults: UserDefaults?
    ) -> Int {
        guard
            let lastRestDate = userDefaults?.object(
                forKey: Self.lastCompletedRestDateKey
            ) as? Date
        else {
            return 180
        }

        return max(
            0,
            Int(now.timeIntervalSince(lastRestDate) / 60)
        )
    }

    private func applyFirmInterruption(userDefaults: UserDefaults?) {
        guard
            let data = userDefaults?.data(forKey: Self.selectionKey),
            let selection = try? PropertyListDecoder().decode(
                FamilyActivitySelection.self,
                from: data
            )
        else {
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

    private func scheduleReminder(
        contextLabel: String,
        agentMessage: String
    ) {
        let content = UNMutableNotificationContent()
        content.title = "Hush"
        content.body = agentMessage.isEmpty
            ? "已经使用了一会儿 \(contextLabel)。现在把一分钟留给自己吧。"
            : agentMessage
        content.sound = .default
        content.userInfo = ["hush_entry": "device_activity"]

        let request = UNNotificationRequest(
            identifier: "hush.device-activity.\(UUID().uuidString)",
            content: content,
            trigger: nil
        )

        UNUserNotificationCenter.current().add(request)
    }

    private func recordAgentError(
        _ message: String,
        userDefaults: UserDefaults?
    ) {
        userDefaults?.set(message, forKey: Self.lastAgentErrorKey)
    }
}
