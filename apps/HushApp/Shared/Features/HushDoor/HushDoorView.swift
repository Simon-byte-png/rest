import SwiftUI

struct HushDoorView: View {
    let onCheckIn: () -> Void
    let onSurpriseMe: () -> Void
    let onSleepHandoff: () -> Void

    var body: some View {
        VStack(spacing: HushSpacing.xl) {
            Spacer(minLength: HushSpacing.lg)

            HushHeroMark()

            VStack(spacing: HushSpacing.sm) {
                Text("现在，先不用撑住。")
                    .font(HushType.hero)
                    .foregroundStyle(HushColor.textPrimary)
                    .multilineTextAlignment(.center)

                Text("用两三分钟，把注意力从任务里拿回来。")
                    .font(HushType.body)
                    .foregroundStyle(HushColor.textSecondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: HushSpacing.sm) {
                Button(action: onCheckIn) {
                    Label("说说我怎么累", systemImage: "text.bubble")
                }
                .buttonStyle(HushPrimaryButtonStyle())

                Button(action: onSurpriseMe) {
                    Label("直接来一个", systemImage: "sparkles")
                }
                .buttonStyle(HushSecondaryButtonStyle())
            }
            .hushPanel()

            Button(action: onSleepHandoff) {
                HStack(spacing: HushSpacing.sm) {
                    Image(systemName: "moon.stars")
                    VStack(alignment: .leading, spacing: 2) {
                        Text("我准备睡了")
                            .font(HushType.bodyStrong)
                        Text("把没做完的事先交出去")
                            .font(HushType.micro)
                            .foregroundStyle(HushColor.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                }
                .foregroundStyle(HushColor.textPrimary)
                .padding(HushSpacing.md)
                .background(
                    RoundedRectangle(cornerRadius: HushRadius.medium, style: .continuous)
                        .fill(Color.white.opacity(0.055))
                )
            }
            .buttonStyle(.plain)
            .accessibilityHint("进入睡前交接演示")

            Text("帮你选择一个安全、具体的暂停动作。")
                .font(HushType.micro)
                .foregroundStyle(HushColor.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, HushSpacing.sm)

            Spacer(minLength: HushSpacing.lg)
        }
    }
}
