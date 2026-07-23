import SwiftUI

@main
struct HushApp: App {
    var body: some Scene {
        WindowGroup {
            HushPlaceholderView()
        }
    }
}

private struct HushPlaceholderView: View {
    var body: some View {
        VStack(spacing: 20) {
            Text(HushProduct.displayName)
                .font(.largeTitle)
                .fontWeight(.semibold)

            Text("我现在需要休息")
                .font(.headline)
        }
        .padding()
    }
}
