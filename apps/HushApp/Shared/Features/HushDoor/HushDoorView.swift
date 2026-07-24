import SwiftUI

struct HushDoorView: View {
    let taskText: String
    let onOpenTask: () -> Void
    let onSettings: () -> Void

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topTrailing) {
                Button(action: onOpenTask) {
                    HushTypewriterText(text: taskText)
                        .frame(
                            width: min(290, geometry.size.width - 88),
                            alignment: .leading
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(taskText)
                .accessibilityHint("打开任务详情")
                .position(
                    x: geometry.size.width * 0.43,
                    y: geometry.size.height * 0.52
                )

                Button(action: onSettings) {
                    Image(systemName: "gearshape")
                        .font(.system(size: 15, weight: .regular))
                        .foregroundStyle(Color.white.opacity(0.78))
                        .frame(width: 34, height: 34)
                        .background(Circle().fill(Color.white.opacity(0.035)))
                        .overlay(Circle().stroke(Color.white.opacity(0.12), lineWidth: 0.8))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("设置")
                .padding(.top, HushSpacing.md)
                .padding(.trailing, HushSpacing.lg)
            }
        }
    }
}

private struct HushTypewriterText: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let text: String

    @State private var visibleText = ""

    var body: some View {
        Text(visibleText)
            .font(HushType.agentTask)
            .tracking(0.8)
            .lineSpacing(6)
            .foregroundStyle(Color.white.opacity(0.94))
            .multilineTextAlignment(.leading)
            .fixedSize(horizontal: false, vertical: true)
            .task(id: text) {
                await revealText()
            }
    }

    @MainActor
    private func revealText() async {
        visibleText = ""

        guard !reduceMotion else {
            visibleText = text
            return
        }

        for character in text {
            guard !Task.isCancelled else { return }
            visibleText.append(character)

            let delay: UInt64
            switch character {
            case "，", "、":
                delay = 220_000_000
            case "。", "！", "？":
                delay = 380_000_000
            default:
                delay = 92_000_000
            }

            do {
                try await Task.sleep(nanoseconds: delay)
            } catch {
                return
            }
        }
    }
}
