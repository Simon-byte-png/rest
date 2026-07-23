import FamilyControls
import SwiftUI

@main
struct HushApp: App {
    @UIApplicationDelegateAdaptor(HushAppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup {
            HushPlaceholderView()
        }
    }
}

private struct HushPlaceholderView: View {
    @State private var isShowingSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text(HushProduct.displayName)
                    .font(.largeTitle)
                    .fontWeight(.semibold)

                Text("我现在需要休息")
                    .font(.headline)
            }
            .padding()
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        isShowingSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("设置")
                }
            }
        }
        .sheet(isPresented: $isShowingSettings) {
            HushSettingsView()
        }
    }
}

private struct HushSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var authorization = FamilyControlsAuthorizationModel()
    @StateObject private var selectionStore = FamilyActivitySelectionStore()
    @StateObject private var monitoring = DeviceActivityMonitoringModel()
    @StateObject private var notifications = NotificationAuthorizationModel()
    @State private var isShowingActivityPicker = false

    var body: some View {
        NavigationStack {
            Form {
                Section("屏幕使用时间") {
                    Text(authorization.statusMessage)
                        .foregroundStyle(.secondary)

                    Button {
                        Task {
                            await authorization.requestAuthorization()
                        }
                    } label: {
                        if authorization.isRequestingAuthorization {
                            ProgressView()
                        } else {
                            Text("启用屏幕使用时间权限")
                        }
                    }
                    .disabled(authorization.isRequestingAuthorization)

                    if let errorMessage = authorization.errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }

                Section("关注范围") {
                    Text(selectionStore.selectionSummary)
                        .foregroundStyle(.secondary)

                    Button("选择要关注的 App") {
                        Task {
                            if !authorization.isAuthorized {
                                await authorization.requestAuthorization()
                            }

                            if authorization.isAuthorized {
                                isShowingActivityPicker = true
                            }
                        }
                    }
                    .disabled(authorization.isRequestingAuthorization)

                    if selectionStore.selectedItemCount > 0 {
                        Button("清除选择", role: .destructive) {
                            monitoring.stopMonitoring()
                            selectionStore.clearSelection()
                        }
                    }

                    Text("选择由 Apple 的系统页面完成。Hush 只在本机保存匿名令牌。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("设备活动监测") {
                    Text(monitoring.monitoringStatusMessage)
                        .foregroundStyle(.secondary)

                    Text(monitoring.lastThresholdMessage)
                        .font(.footnote)
                        .foregroundStyle(.secondary)

                    if monitoring.isMonitoring {
                        Button("停止监测", role: .destructive) {
                            monitoring.stopMonitoring()
                        }
                    } else {
                        Button("启动 5 分钟测试监测") {
                            monitoring.startMonitoring(selection: selectionStore.selection)
                        }
                        .disabled(
                            !authorization.isAuthorized
                                || selectionStore.selectedItemCount == 0
                        )
                    }

                    if let errorMessage = monitoring.errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Text("测试监测只记录阈值是否到达，不屏蔽 App、不调用网络。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("休息提醒") {
                    Text(notifications.statusMessage)
                        .foregroundStyle(.secondary)

                    if !notifications.isAuthorized {
                        Button {
                            Task {
                                await notifications.requestAuthorization()
                            }
                        } label: {
                            if notifications.isRequestingAuthorization {
                                ProgressView()
                            } else {
                                Text("启用休息提醒通知")
                            }
                        }
                        .disabled(notifications.isRequestingAuthorization)
                    }

                    Button("发送测试提醒") {
                        Task {
                            await notifications.sendTestReminder()
                        }
                    }
                    .disabled(!notifications.isAuthorized)

                    if let errorMessage = notifications.errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Text("达到监测阈值后，Hush 最多每 2 小时提醒一次，每天最多 3 次。")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("设置")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
            .task {
                authorization.refreshStatus()
                monitoring.refreshStatus()
                await notifications.refreshStatus()
            }
            .familyActivityPicker(
                headerText: "选择希望 Hush 关注的 App、类别或网站",
                footerText: "Hush 不会读取你的具体使用内容。",
                isPresented: $isShowingActivityPicker,
                selection: $selectionStore.selection
            )
            .onChange(of: isShowingActivityPicker) { _, isPresented in
                guard !isPresented else {
                    return
                }

                updateMonitoringAfterSelectionChange()
            }
        }
    }

    private func updateMonitoringAfterSelectionChange() {
        guard monitoring.isMonitoring else {
            return
        }

        if selectionStore.selectedItemCount == 0 {
            monitoring.stopMonitoring()
        } else {
            monitoring.startMonitoring(selection: selectionStore.selection)
        }
    }
}
