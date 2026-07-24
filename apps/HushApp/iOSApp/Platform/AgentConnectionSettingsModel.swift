import Foundation

@MainActor
final class AgentConnectionSettingsModel: ObservableObject {
    @Published var baseURL: String {
        didSet {
            defaults?.set(baseURL.trimmingCharacters(in: .whitespacesAndNewlines), forKey: Self.baseURLKey)
        }
    }

    @Published var contextLabel: String {
        didSet {
            defaults?.set(
                contextLabel.trimmingCharacters(in: .whitespacesAndNewlines),
                forKey: Self.contextLabelKey
            )
        }
    }
    @Published private(set) var lastResultMessage: String?

    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let baseURLKey = "agent.baseURL"
    private static let contextLabelKey = "agent.userProvidedContextLabel"
    private static let lastDecisionKey = "agent.lastDecisionMessage"
    private static let lastErrorKey = "agent.lastErrorMessage"

    private let defaults: UserDefaults?

    init() {
        let defaults = UserDefaults(suiteName: Self.appGroupIdentifier)
        self.defaults = defaults
        baseURL = defaults?.string(forKey: Self.baseURLKey) ?? ""
        contextLabel = defaults?.string(forKey: Self.contextLabelKey) ?? ""
        refreshLastResult()
    }

    var isConfigured: Bool {
        guard
            let url = URL(
                string: baseURL.trimmingCharacters(in: .whitespacesAndNewlines)
            ),
            url.scheme?.lowercased() == "https",
            url.host != nil
        else {
            return false
        }

        return !contextLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var statusMessage: String {
        if baseURL.isEmpty && contextLabel.isEmpty {
            return "填写 HTTPS 服务地址和监测范围名称后才能启动。"
        }

        if !isConfigured {
            return "服务地址必须是 HTTPS，且监测范围名称不能为空。"
        }

        return "云端 Agent 已配置。具体 App 名称来自你的主动填写。"
    }

    func refreshLastResult() {
        if let error = defaults?.string(forKey: Self.lastErrorKey) {
            lastResultMessage = "最近请求：\(error)"
        } else if let decision = defaults?.string(forKey: Self.lastDecisionKey) {
            lastResultMessage = decision.isEmpty
                ? "最近请求成功，Agent 建议继续观察。"
                : "最近决策：\(decision)"
        } else {
            lastResultMessage = nil
        }
    }
}
