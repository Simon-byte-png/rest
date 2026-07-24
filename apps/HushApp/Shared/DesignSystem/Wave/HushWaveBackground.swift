import SwiftUI

struct HushWaveBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        ZStack {
            Color.black

            TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: reduceMotion)) { timeline in
                Canvas { context, size in
                    let elapsed = timeline.date.timeIntervalSinceReferenceDate
                    let phase = reduceMotion
                        ? 0.35
                        : elapsed.truncatingRemainder(dividingBy: 24) * 0.16
                    let breath = reduceMotion
                        ? 0.92
                        : 0.88 + sin(elapsed * .pi * 2 / 7.5) * 0.12
                    let centerY = size.height * 0.81
                    let amplitude = min(86, size.height * 0.12) * breath

                    drawWave(
                        context: &context,
                        size: size,
                        centerY: centerY,
                        amplitude: amplitude,
                        phase: phase,
                        lineWidth: 8,
                        opacity: 0.045
                    )

                    drawWave(
                        context: &context,
                        size: size,
                        centerY: centerY,
                        amplitude: amplitude,
                        phase: phase,
                        lineWidth: 1.15,
                        opacity: 0.88
                    )
                }
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }

    private func drawWave(
        context: inout GraphicsContext,
        size: CGSize,
        centerY: CGFloat,
        amplitude: CGFloat,
        phase: Double,
        lineWidth: CGFloat,
        opacity: Double
    ) {
        guard size.width > 0 else { return }

        var path = Path()
        let step = max(1.5, size.width / 260)

        for x in stride(from: 0.0, through: size.width, by: step) {
            let progress = x / size.width
            let envelope = pow(max(0, sin(.pi * progress)), 0.82)
            let mainWave = sin(progress * .pi * 6.3 + phase) * 0.72
            let unevenRise = sin(progress * .pi * 2.9 - phase * 0.36 + 0.8) * 0.22
            let fineMotion = sin(progress * .pi * 10.8 + phase * 0.28) * 0.06
            let y = centerY + (mainWave + unevenRise + fineMotion) * amplitude * envelope

            if x == 0 {
                path.move(to: CGPoint(x: x, y: y))
            } else {
                path.addLine(to: CGPoint(x: x, y: y))
            }
        }

        context.stroke(
            path,
            with: .color(Color.white.opacity(opacity)),
            style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round)
        )
    }
}
