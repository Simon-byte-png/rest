import SwiftUI

struct HushDemoRootView: View {
    @StateObject private var store: HushDemoStore
    @State private var isShowingSettings = false

    @MainActor
    init(
        provider: any HushRestContentProviding = BundledHushRestContentProvider.automatic,
        initialQuestID: String? = nil
    ) {
        _store = StateObject(
            wrappedValue: HushDemoStore(
                provider: provider,
                initialQuestID: initialQuestID
            )
        )
    }

    var body: some View {
        ZStack {
            HushWaveBackground()

            if store.route == .door {
                HushDoorView(
                    taskText: agentTaskText,
                    onOpenTask: store.openCurrentQuest,
                    onSettings: {
                        isShowingSettings = true
                    }
                )
                .transition(.opacity)
            } else {
                VStack(spacing: 0) {
                    topBar
                        .padding(.horizontal, HushSpacing.lg)
                        .padding(.top, HushSpacing.md)

                    ScrollView {
                        routeContent
                            .frame(maxWidth: 460)
                            .padding(.horizontal, HushSpacing.lg)
                            .padding(.top, HushSpacing.lg)
                            .padding(.bottom, HushSpacing.xl)
                    }
                    .scrollIndicators(.hidden)

                }
            }
        }
        .frame(minWidth: 380, idealWidth: 420, minHeight: 580, idealHeight: 700)
        .preferredColorScheme(.dark)
        .sheet(isPresented: $isShowingSettings) {
            HushSettingsView(
                degraded: store.content.status.isFallback,
                onSwapTask: {
                    store.swapQuest()
                    isShowingSettings = false
                },
                onCheckIn: {
                    store.startCheckIn()
                    isShowingSettings = false
                },
                onSleepHandoff: {
                    store.startSleepHandoff()
                    isShowingSettings = false
                },
                onDismiss: {
                    isShowingSettings = false
                }
            )
        }
    }

    private var agentTaskText: String {
        let steps = store.currentQuest.steps.prefix(2)
        let task = steps.isEmpty ? store.currentQuest.title : steps.joined(separator: "\n")
        return task.hasSuffix("。") ? task : "\(task)。"
    }

    private var topBar: some View {
        HStack(spacing: HushSpacing.sm) {
            Group {
                if store.route == .door {
                    Color.clear
                } else {
                    Button(action: store.goBack) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(HushColor.textPrimary)
                            .frame(width: 30, height: 30)
                            .background(Circle().fill(Color.white.opacity(0.08)))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("返回")
                }
            }
            .frame(width: 30, height: 30)

            Spacer(minLength: HushSpacing.xs)

            HushSampleModeBadge(degraded: store.content.status.isFallback)

            Spacer(minLength: HushSpacing.xs)

            Button(action: store.reset) {
                Image(systemName: "arrow.counterclockwise")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(HushColor.textSecondary)
                    .frame(width: 30, height: 30)
                    .background(Circle().fill(Color.white.opacity(0.06)))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("重置演示")
        }
    }

    @ViewBuilder
    private var routeContent: some View {
        switch store.route {
        case .door:
            EmptyView()
        case .checkIn:
            FatigueCheckInView(
                description: $store.fatigueDescription,
                availableMinutes: $store.availableMinutes,
                onContinue: store.submitCheckIn
            )
        case .reflection:
            FatigueReflectionView(onChoose: store.choosePreference)
        case .quest:
            RestQuestView(
                quest: store.currentQuest,
                canSwap: store.content.quests.count > 1,
                onSwap: store.swapQuest,
                onStart: store.startSession
            )
        case .session:
            DayResetView(
                quest: store.currentQuest,
                prompt: store.currentDriftPrompt,
                onFinish: store.showFeedback
            )
        case .feedback:
            RestFeedbackView(onSubmit: store.completeReset)
        case .completed:
            RestCompletionView(onDone: store.reset)
        case .sleepHandoff:
            SleepHandoffView(
                openLoop: $store.openLoop,
                includeGmail: $store.includeGmail,
                onStart: store.submitHandoff
            )
        case .handoffRunning:
            HandoffRunningView(onShowResult: store.showPauseReceipt)
        case .pauseReceipt:
            PauseReceiptView(onBlueReset: store.startBlueReset)
        case .blueReset:
            BlueResetView(card: store.currentBlueBoxCard, onDone: store.reset)
        }
    }
}

private struct HushSettingsView: View {
    let degraded: Bool
    let onSwapTask: () -> Void
    let onCheckIn: () -> Void
    let onSleepHandoff: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(alignment: .leading, spacing: HushSpacing.lg) {
                HStack {
                    Text("设置")
                        .font(HushType.title)
                        .foregroundStyle(HushColor.textPrimary)

                    Spacer()

                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(HushColor.textSecondary)
                            .frame(width: 32, height: 32)
                            .overlay(Circle().stroke(HushColor.hairline, lineWidth: 0.8))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("关闭设置")
                }

                HStack(spacing: HushSpacing.xs) {
                    Circle()
                        .fill(Color.white.opacity(0.82))
                        .frame(width: 6, height: 6)
                    Text(degraded ? "演示模式 · 备用内容" : "演示模式")
                        .font(HushType.micro)
                        .tracking(0.4)
                        .foregroundStyle(HushColor.textSecondary)
                }

                Divider()
                    .overlay(HushColor.hairline)

                VStack(spacing: 0) {
                    settingsRow("换一个任务", systemImage: "arrow.triangle.2.circlepath", action: onSwapTask)
                    settingsRow("描述我的疲惫", systemImage: "text.bubble", action: onCheckIn)
                    settingsRow("睡前交接", systemImage: "moon", action: onSleepHandoff)
                }
            }
            .padding(HushSpacing.xl)
        }
        .frame(minWidth: 340, idealWidth: 380, minHeight: 300)
        .preferredColorScheme(.dark)
    }

    private func settingsRow(
        _ title: String,
        systemImage: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: HushSpacing.sm) {
                Image(systemName: systemImage)
                    .frame(width: 20)
                Text(title)
                    .font(HushType.body)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(HushColor.textSecondary)
            }
            .foregroundStyle(HushColor.textPrimary)
            .padding(.vertical, HushSpacing.md)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

#if DEBUG
struct HushDemoRootView_Previews: PreviewProvider {
    static var previews: some View {
        HushDemoRootView()
            .frame(width: 420, height: 700)
    }
}
#endif
