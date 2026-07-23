import SwiftUI

struct BlueResetView: View {
    let card: HushBlueBoxCard
    let onDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: HushSpacing.lg) {
            VStack(alignment: .leading, spacing: HushSpacing.xs) {
                HushSectionLabel(text: "Blue reset")
                Text(card.title)
                    .font(HushType.title)
                    .foregroundStyle(HushColor.textPrimary)
                Text("五分钟，不需要主动改变呼吸。")
                    .font(HushType.body)
                    .foregroundStyle(HushColor.textSecondary)
            }

            VStack(alignment: .leading, spacing: HushSpacing.lg) {
                ForEach(Array(card.steps.enumerated()), id: \.offset) { index, step in
                    HStack(alignment: .top, spacing: HushSpacing.md) {
                        ZStack {
                            Circle()
                                .fill(HushColor.cyan.opacity(0.14))
                                .frame(width: 34, height: 34)
                            Text("\(index + 1)")
                                .font(HushType.caption)
                                .foregroundStyle(HushColor.cyan)
                        }

                        Text(step)
                            .font(.system(size: 18, weight: .medium, design: .rounded))
                            .foregroundStyle(HushColor.textPrimary)
                            .padding(.top, 6)
                    }
                }
            }
            .hushPanel(emphasized: true)

            Label(
                card.reviewedByBluebox ? "Blue Box 内容已审核" : "示例内容，待 Blue Box 审核",
                systemImage: card.reviewedByBluebox ? "checkmark.seal.fill" : "exclamationmark.triangle.fill"
            )
            .font(HushType.caption)
            .foregroundStyle(card.reviewedByBluebox ? HushColor.mint : HushColor.warm)

            Text("这是一段普通的注意力引导，不用于改善或治疗失眠、焦虑等医学问题。")
                .font(HushType.caption)
                .foregroundStyle(HushColor.textSecondary)

            Button(action: onDone) {
                Text("把手机放下")
            }
            .buttonStyle(HushPrimaryButtonStyle())
        }
    }
}
