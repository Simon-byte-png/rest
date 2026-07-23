# TASK-M2-P4：Mac SwiftUI、Design System、Rest Quest 内容与 Demo

## 背景

Hush 当前只有协议和目录骨架。P4 需要先提供一套不等待后端、可由 P1 接入 Mac 菜单栏 Target 的产品界面与 Sample Mode 主流程，并把所有现实动作固定在本地 JSON 内容库中。

## Owner

M2 / P4

## 允许修改

- `apps/HushApp/Shared/Features/**`
- `apps/HushApp/Shared/DesignSystem/**`
- `content/**`
- `docs/demo*`

## 禁止修改

- `apps/HushApp/Hush.xcodeproj/**`
- `apps/HushApp/**/*.entitlements`
- `apps/HushApp/Shared/Core/**`
- `apps/HushApp/iOSApp/**`
- `apps/HushApp/MacMenuBar/**`
- `contracts/**`
- 根依赖与 Swift Package 配置

## 依赖契约

- `contracts/schemas/common.schema.json`
- `contracts/schemas/fatigue-check-in.schema.json`
- `contracts/schemas/fatigue-reflection.schema.json`
- `contracts/schemas/rest-quest.schema.json`
- `contracts/schemas/rest-recommendation.schema.json`
- `contracts/schemas/rest-feedback.schema.json`
- `contracts/schemas/handoff-job.schema.json`
- `contracts/schemas/handoff-summary.schema.json`
- `contracts/schemas/pause-receipt.schema.json`

## 输入

- `contracts/fixtures/fatigue-check-in-cognitive.json`
- `contracts/fixtures/fatigue-reflection-follow-up.json`
- `contracts/fixtures/rest-recommendation-success.json`
- `contracts/fixtures/rest-quest-wash-face.json`
- `contracts/fixtures/handoff-job-running.json`
- `contracts/fixtures/handoff-summary-success.json`
- `content/*.sample.json`

## 输出

- 可跨 iOS/macOS 复用的 SwiftUI Design System。
- Mac 紧凑窗口可运行的 Sample Mode 主流程。
- Hush Door、疲惫描述、Rest Quest、Day Reset、双问反馈界面。
- Sleep Handoff、等待、Pause Receipt、Blue Reset 演示界面。
- 固定 Rest Quest、Guided Drift、Blue Reset 和安全规则 JSON。
- P1 接线与演示说明。

## 验收

1. Mac 紧凑窗口中可从 Hush Door 完整点通 `check-in → quest → session → feedback`。
2. 可从 Hush Door 点通 `sleep handoff → running → pause receipt → blue reset`。
3. Sample Mode 始终显示来源标识，不把模拟结果表述为真实 Gmail、LLM 或 Photon 结果。
4. Rest Quest 来自固定内容库，时长 1–6 分钟，不要求持续看屏幕，支持“换一个”。
5. Guided Drift 纯本地，一次一个问题，界面明确说明不保存答案。
6. Pause Receipt 明确展示已覆盖与未覆盖来源，并保留 `uncertain`。
7. Reduce Motion 开启后背景停止位移动画。
8. 只修改 P4 允许目录，不新增第三方依赖，不修改契约和 Xcode 工程。

## 测试命令

- `swiftc -typecheck` 检查 P4 Swift 源码。
- Python 标准库检查内容 JSON 可解析、ID 唯一、版本一致、时长及安全边界。
- 在有完整 Xcode 的 Mac 上编译并运行 standalone Sample Mode。

## 降级要求

- Bundle 内容缺失或解码失败时，只提供一个固定、低风险、无需移动的紧急 Quest，并在 Demo 中显示内容降级状态。
- 后端、Gmail、Photon 均不作为 P4 Demo 的运行前提。
- Blue Reset 未经 Blue Box 审核的内容必须显示“示例内容，待审核”，不得暗示医疗效果。

## 完成后报告

- 修改文件清单。
- Swift 编译与 JSON 校验结果。
- P1 需要完成的 Xcode 接线。
- 未解决问题与真实/Mock 能力边界。
