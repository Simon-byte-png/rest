import SwiftUI

struct HushWaveBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [HushColor.midnight, HushColor.dusk, HushColor.midnight],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RadialGradient(
                colors: [HushColor.indigo.opacity(0.22), .clear],
                center: UnitPoint(x: 0.14, y: 0.05),
                startRadius: 8,
                endRadius: 360
            )

            TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: reduceMotion)) { timeline in
                Canvas { context, size in
                    let elapsed = timeline.date.timeIntervalSinceReferenceDate
                    let phase = reduceMotion ? 0.7 : elapsed.truncatingRemainder(dividingBy: 12) * 0.52
                    let centerY = size.height * 0.53

                    drawWave(
                        context: &context,
                        size: size,
                        centerY: centerY,
                        amplitude: min(72, size.height * 0.11),
                        frequency: 2.35,
                        phase: phase,
                        lineWidth: 2.2,
                        colors: [HushColor.cyan.opacity(0.14), HushColor.cyan.opacity(0.88), HushColor.violet.opacity(0.24)]
                    )

                    drawWave(
                        context: &context,
                        size: size,
                        centerY: centerY + 7,
                        amplitude: min(52, size.height * 0.08),
                        frequency: 2.9,
                        phase: -phase * 0.72 + 1.4,
                        lineWidth: 1.5,
                        colors: [HushColor.violet.opacity(0.10), HushColor.violet.opacity(0.78), HushColor.cyan.opacity(0.18)]
                    )

                    drawWave(
                        context: &context,
                        size: size,
                        centerY: centerY - 12,
                        amplitude: min(34, size.height * 0.055),
                        frequency: 3.5,
                        phase: phase * 0.45 + 2.2,
                        lineWidth: 1,
                        colors: [.clear, Color.white.opacity(0.34), .clear]
                    )
                }
            }
            .opacity(0.92)

            LinearGradient(
                colors: [.clear, HushColor.midnight.opacity(0.08), HushColor.midnight.opacity(0.72)],
                startPoint: .top,
                endPoint: .bottom
            )
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }

    private func drawWave(
        context: inout GraphicsContext,
        size: CGSize,
        centerY: CGFloat,
        amplitude: CGFloat,
        frequency: Double,
        phase: Double,
        lineWidth: CGFloat,
        colors: [Color]
    ) {
        guard size.width > 0 else { return }

        var path = Path()
        let step = max(1.5, size.width / 260)

        for x in stride(from: 0.0, through: size.width, by: step) {
            let progress = x / size.width
            let envelope = pow(max(0, sin(.pi * progress)), 1.35)
            let harmonic = sin(progress * .pi * 2 * frequency + phase)
            let undertone = sin(progress * .pi * 5.2 - phase * 0.48) * 0.18
            let y = centerY + (harmonic + undertone) * amplitude * envelope

            if x == 0 {
                path.move(to: CGPoint(x: x, y: y))
            } else {
                path.addLine(to: CGPoint(x: x, y: y))
            }
        }

        context.stroke(
            path,
            with: .linearGradient(
                Gradient(colors: colors),
                startPoint: CGPoint(x: 0, y: centerY),
                endPoint: CGPoint(x: size.width, y: centerY)
            ),
            style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
        )
    }
}
