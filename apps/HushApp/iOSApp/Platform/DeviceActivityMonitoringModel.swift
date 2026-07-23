import DeviceActivity
import FamilyControls
import Foundation
import ManagedSettings

@MainActor
final class DeviceActivityMonitoringModel: ObservableObject {
    @Published private(set) var isMonitoring = false
    @Published private(set) var errorMessage: String?
    @Published private(set) var lastThresholdDate: Date?

    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let activityName = DeviceActivityName("hush.daily-monitor")
    private static let eventName = DeviceActivityEvent.Name("hush.one-hour-threshold")
    private static let lastThresholdKey = "deviceActivity.lastThresholdDate"
    private static let thresholdMinutes = 60
    private static let managedSettingsStore = ManagedSettingsStore(
        named: ManagedSettingsStore.Name("hush.interruption")
    )

    private let center = DeviceActivityCenter()
    private let userDefaults = UserDefaults(suiteName: appGroupIdentifier)

    init() {
        refreshStatus()
    }

    var monitoringStatusMessage: String {
        isMonitoring ? "1 小时使用监测已启用" : "尚未启动设备活动监测"
    }

    var lastThresholdMessage: String {
        guard let lastThresholdDate else {
            return "尚未收到阈值事件"
        }

        return "最近一次阈值事件：\(lastThresholdDate.formatted(date: .abbreviated, time: .shortened))"
    }

    func refreshStatus() {
        isMonitoring = center.activities.contains(Self.activityName)
        lastThresholdDate = userDefaults?.object(forKey: Self.lastThresholdKey) as? Date
    }

    func startMonitoring(selection: FamilyActivitySelection) {
        guard
            !selection.applicationTokens.isEmpty
                || !selection.categoryTokens.isEmpty
                || !selection.webDomainTokens.isEmpty
        else {
            errorMessage = "请先选择至少一个 App、类别或网站。"
            return
        }

        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )

        let event: DeviceActivityEvent

        if #available(iOS 17.4, *) {
            event = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: Self.thresholdMinutes),
                includesPastActivity: false
            )
        } else {
            event = DeviceActivityEvent(
                applications: selection.applicationTokens,
                categories: selection.categoryTokens,
                webDomains: selection.webDomainTokens,
                threshold: DateComponents(minute: Self.thresholdMinutes)
            )
        }

        do {
            center.stopMonitoring([Self.activityName])
            Self.managedSettingsStore.clearAllSettings()
            try center.startMonitoring(
                Self.activityName,
                during: schedule,
                events: [Self.eventName: event]
            )
            errorMessage = nil
            refreshStatus()
        } catch {
            errorMessage = "无法启动设备活动监测，请检查屏幕使用时间权限后重试。"
            refreshStatus()
        }
    }

    func stopMonitoring() {
        center.stopMonitoring([Self.activityName])
        Self.managedSettingsStore.clearAllSettings()
        errorMessage = nil
        refreshStatus()
    }
}
