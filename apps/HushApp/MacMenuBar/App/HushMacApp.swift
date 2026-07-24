import SwiftUI

@main
struct HushMacApp: App {
    var body: some Scene {
        MenuBarExtra(HushProduct.displayName, systemImage: "moon.zzz") {
            Button("现在休息一下") {
                // Product flow wiring belongs to a later task.
            }

            Divider()

            Button("退出 Hush") {
                NSApplication.shared.terminate(nil)
            }
        }
    }
}
