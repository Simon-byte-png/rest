import FamilyControls
import Foundation

@MainActor
final class FamilyActivitySelectionStore: ObservableObject {
    @Published var selection: FamilyActivitySelection {
        didSet {
            persistSelection()
        }
    }

    private static let appGroupIdentifier = "group.com.JenniferJi.Hush"
    private static let selectionKey = "familyActivitySelection"

    private let userDefaults: UserDefaults?

    init() {
        let userDefaults = UserDefaults(suiteName: Self.appGroupIdentifier)
        self.userDefaults = userDefaults

        if
            let data = userDefaults?.data(forKey: Self.selectionKey),
            let storedSelection = try? PropertyListDecoder().decode(
                FamilyActivitySelection.self,
                from: data
            )
        {
            selection = storedSelection
        } else {
            selection = FamilyActivitySelection()
        }
    }

    var selectedItemCount: Int {
        selection.applicationTokens.count
            + selection.categoryTokens.count
            + selection.webDomainTokens.count
    }

    var selectionSummary: String {
        guard selectedItemCount > 0 else {
            return "尚未选择 App、类别或网站"
        }

        return "已选择 \(selection.applicationTokens.count) 个 App、"
            + "\(selection.categoryTokens.count) 个类别、"
            + "\(selection.webDomainTokens.count) 个网站"
    }

    func clearSelection() {
        selection = FamilyActivitySelection()
    }

    private func persistSelection() {
        guard let data = try? PropertyListEncoder().encode(selection) else {
            return
        }

        userDefaults?.set(data, forKey: Self.selectionKey)
    }
}
