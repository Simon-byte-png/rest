import SwiftUI

struct SleepHandoffView: View {
    @Binding var openLoop: String
    @Binding var includeGmail: Bool
    let onStart: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: HushSpacing.lg) {
            VStack(alignment: .leading, spacing: HushSpacing.xs) {
                HushSectionLabel(text: "Sleep handoff")
                Text("今晚先到这里。")
                    .font(HushType.title)
                    .foregroundStyle(HushColor.textPrimary)
                Text("把脑子里还挂着的一件事交给明天。")
                    .font(HushType.body)
                    .foregroundStyle(HushColor.textSecondary)
            }

            VStack(alignment: .leading, spacing: HushSpacing.sm) {
                Text("还有什么没放下？")
                    .font(HushType.bodyStrong)
                    .foregroundStyle(HushColor.textPrimary)

                TextEditor(text: $openLoop)
                    .font(HushType.body)
                    .foregroundStyle(HushColor.textPrimary)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 100)
                    .padding(HushSpacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: HushRadius.medium, style: .continuous)
                            .fill(Color.black.opacity(0.18))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: HushRadius.medium, style: .continuous)
                            .stroke(HushColor.hairline, lineWidth: 1)
                    )
                    .accessibilityLabel("需要交接的事项")
            }
            .hushPanel()

            VStack(alignment: .leading, spacing: HushSpacing.md) {
                Toggle(isOn: $includeGmail) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("包含已授权 Gmail")
                            .font(HushType.bodyStrong)
                            .foregroundStyle(HushColor.textPrimary)
                        Text("只读未读邮件，并且最多创建草稿；永不自动发送。")
                            .font(HushType.caption)
                            .foregroundStyle(HushColor.textSecondary)
                    }
                }
                .tint(HushColor.indigo)

                Divider()
                    .overlay(HushColor.hairline)

                Label("Sample Mode 使用固定邮箱 fixture，不会访问真实账号。", systemImage: "testtube.2")
                    .font(HushType.caption)
                    .foregroundStyle(HushColor.warm)
            }
            .hushPanel()

            Button(action: onStart) {
                Label("交给 Hush", systemImage: "moon.fill")
            }
            .buttonStyle(HushPrimaryButtonStyle())
            .disabled(openLoop.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
    }
}

struct HandoffRunningView: View {
    let onShowResult: () -> Void

    private let stages = [
        ("读取已授权范围", "checkmark.circle.fill"),
        ("整理明天事项", "checkmark.circle.fill"),
        ("准备草稿建议", "ellipsis.circle.fill"),
        ("生成 Pause Receipt", "circle")
    ]

    var body: some View {
        VStack(spacing: HushSpacing.xl) {
            Spacer(minLength: HushSpacing.lg)

            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.08), lineWidth: 8)
                    .frame(width: 112, height: 112)
                Circle()
                    .trim(from: 0, to: 0.68)
                    .stroke(
                        AngularGradient(colors: [HushColor.cyan, HushColor.violet], center: .center),
                        style: StrokeStyle(lineWidth: 8, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .frame(width: 112, height: 112)
                Text("35s")
                    .font(.system(size: 26, weight: .medium, design: .rounded))
                    .foregroundStyle(HushColor.textPrimary)
            }
            .accessibilityLabel("模拟任务预计还需 35 秒")

            VStack(spacing: HushSpacing.xs) {
                Text("正在替你把边界说清楚")
                    .font(HushType.title)
                    .foregroundStyle(HushColor.textPrimary)
                Text("你可以先不管它。")
                    .font(HushType.body)
                    .foregroundStyle(HushColor.textSecondary)
            }

            VStack(alignment: .leading, spacing: HushSpacing.md) {
                ForEach(Array(stages.enumerated()), id: \.offset) { index, stage in
                    HStack(spacing: HushSpacing.sm) {
                        Image(systemName: stage.1)
                            .foregroundStyle(index < 2 ? HushColor.mint : (index == 2 ? HushColor.cyan : HushColor.textSecondary))
                        Text(stage.0)
                            .font(HushType.body)
                            .foregroundStyle(index <= 2 ? HushColor.textPrimary : HushColor.textSecondary)
                        Spacer()
                    }
                }
            }
            .hushPanel()

            Button(action: onShowResult) {
                Text("Demo：查看完成结果")
            }
            .buttonStyle(HushPrimaryButtonStyle())

            Text("这是 handoff-job-running fixture 的界面演示，没有读取或创建真实 Gmail 草稿。")
                .font(HushType.caption)
                .foregroundStyle(HushColor.textSecondary)
                .multilineTextAlignment(.center)

            Spacer(minLength: HushSpacing.lg)
        }
    }
}
