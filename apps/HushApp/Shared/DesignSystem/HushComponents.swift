import SwiftUI

struct HushPanelModifier: ViewModifier {
    var emphasized = false

    func body(content: Content) -> some View {
        content
            .padding(HushSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: HushRadius.large, style: .continuous)
                    .fill(emphasized ? HushColor.panelStrong : HushColor.panel)
                    .overlay(
                        RoundedRectangle(cornerRadius: HushRadius.large, style: .continuous)
                            .stroke(HushColor.hairline, lineWidth: 1)
                    )
            )
            .shadow(color: .black.opacity(0.14), radius: 28, y: 14)
    }
}

extension View {
    func hushPanel(emphasized: Bool = false) -> some View {
        modifier(HushPanelModifier(emphasized: emphasized))
    }
}

struct HushPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(HushType.bodyStrong)
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 48)
            .padding(.horizontal, HushSpacing.md)
            .background(
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [HushColor.indigo, HushColor.violet],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            )
            .overlay(Capsule().stroke(Color.white.opacity(0.18), lineWidth: 1))
            .shadow(
                color: HushColor.violet.opacity(configuration.isPressed ? 0.12 : 0.28),
                radius: configuration.isPressed ? 6 : 15,
                y: configuration.isPressed ? 2 : 8
            )
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .opacity(isEnabled ? 1 : 0.38)
            .animation(.easeOut(duration: 0.16), value: configuration.isPressed)
    }
}

struct HushSecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(HushType.bodyStrong)
            .foregroundStyle(HushColor.textPrimary)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 46)
            .padding(.horizontal, HushSpacing.md)
            .background(Capsule().fill(Color.white.opacity(configuration.isPressed ? 0.15 : 0.08)))
            .overlay(Capsule().stroke(HushColor.hairline, lineWidth: 1))
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .opacity(isEnabled ? 1 : 0.38)
            .animation(.easeOut(duration: 0.16), value: configuration.isPressed)
    }
}

struct HushCompactButtonStyle: ButtonStyle {
    var selected = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(HushType.caption)
            .foregroundStyle(selected ? Color.white : HushColor.textSecondary)
            .padding(.horizontal, HushSpacing.sm)
            .frame(minHeight: 34)
            .background(
                Capsule()
                    .fill(selected ? HushColor.indigo.opacity(0.74) : Color.white.opacity(0.07))
            )
            .overlay(Capsule().stroke(HushColor.hairline, lineWidth: 1))
            .opacity(configuration.isPressed ? 0.72 : 1)
    }
}

struct HushSampleModeBadge: View {
    var degraded = false

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(degraded ? HushColor.warm : HushColor.mint)
                .frame(width: 6, height: 6)
            Text(degraded ? "SAMPLE · FALLBACK" : "SAMPLE MODE")
                .font(HushType.eyebrow)
                .tracking(0.8)
        }
        .foregroundStyle(HushColor.textSecondary)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Capsule().fill(Color.black.opacity(0.18)))
        .overlay(Capsule().stroke(HushColor.hairline, lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel(degraded ? "Sample Mode，内容已降级" : "Sample Mode，当前为模拟演示")
    }
}

struct HushSectionLabel: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(HushType.eyebrow)
            .tracking(1.2)
            .foregroundStyle(HushColor.textSecondary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct HushSourcePill: View {
    let text: String
    var included = true

    var body: some View {
        Label(text, systemImage: included ? "checkmark.circle.fill" : "minus.circle")
            .font(HushType.caption)
            .foregroundStyle(included ? HushColor.mint : HushColor.textSecondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Capsule().fill(Color.white.opacity(0.06)))
    }
}

struct HushHeroMark: View {
    var body: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [HushColor.cyan.opacity(0.35), HushColor.violet.opacity(0.16), .clear],
                        center: .center,
                        startRadius: 2,
                        endRadius: 52
                    )
                )
                .frame(width: 104, height: 104)

            Image(systemName: "waveform.path")
                .font(.system(size: 36, weight: .light))
                .symbolRenderingMode(.palette)
                .foregroundStyle(HushColor.cyan, HushColor.violet)
        }
        .accessibilityHidden(true)
    }
}
