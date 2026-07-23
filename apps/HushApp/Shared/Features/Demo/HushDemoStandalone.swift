#if HUSH_DEMO_STANDALONE && os(macOS)
import SwiftUI

@main
struct HushDemoStandaloneApp: App {
    var body: some Scene {
        WindowGroup("Hush") {
            HushDemoRootView()
        }
        .windowStyle(.hiddenTitleBar)
        .defaultSize(width: 420, height: 700)
    }
}
#endif
