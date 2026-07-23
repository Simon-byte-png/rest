import SwiftUI

struct HushDemoRootView: View {
    @StateObject private var store: HushDemoStore

    @MainActor
    init(provider: any HushRestContentProviding = BundledHushRestContentProvider.automatic) {
        _store = StateObject(wrappedValue: HushDemoStore(provider: provider))
    }

    var body: some View {
        ZStack {
            HushWaveBackground()

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

                if let fallbackMessage = store.content.status.message {
                    Text("本地内容降级：\(fallbackMessage)")
                        .font(HushType.caption)
                        .foregroundStyle(HushColor.warm)
                        .lineLimit(2)
                        .padding(.horizontal, HushSpacing.lg)
                        .padding(.bottom, HushSpacing.sm)
                }
            }
        }
        .frame(minWidth: 380, idealWidth: 420, minHeight: 580, idealHeight: 700)
        .preferredColorScheme(.dark)
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
            HushDoorView(
                onCheckIn: store.startCheckIn,
                onSurpriseMe: store.surpriseMe,
                onSleepHandoff: store.startSleepHandoff
            )
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

#if DEBUG
struct HushDemoRootView_Previews: PreviewProvider {
    static var previews: some View {
        HushDemoRootView()
            .frame(width: 420, height: 700)
    }
}
#endif
