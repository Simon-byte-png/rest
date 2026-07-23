# M2 / P4 Mac Demo 运行与接线

## 当前交付

P4 已提供两个可点通的 Sample Mode 流程：

```text
Hush Door
→ Name the Tiredness
→ 固定 fixture 反映
→ Rest Quest
→ Day Reset + 可选 Guided Drift
→ 双问反馈
```

```text
Hush Door
→ Sleep Handoff
→ Handoff Running
→ Pause Receipt
→ Blue Reset
```

所有页面共享 `HushWaveBackground`。背景由三层不同频率的曲线构成，会缓慢律动；系统开启 Reduce Motion 后停在静态帧。

## P1 接入 Xcode

P4 不修改 `.xcodeproj`。请由 P1 完成以下接线：

1. 将 `apps/HushApp/Shared/DesignSystem/**` 加入 iOS App 与 Mac MenuBar 的 synchronized folder。
2. 将 `apps/HushApp/Shared/Features/**` 加入 iOS App 与 Mac MenuBar 的 synchronized folder。
3. 将以下文件作为 Bundle Resource 加入两个 App Target：
   - `content/content-manifest.json`
   - `content/rest-quests.json`
   - `content/drift-prompts.json`
   - `content/bluebox-cards.json`
   - `content/safety-rules.json`
4. 在 Mac 的 composition root 中使用 `HushDemoRootView()` 作为 Sample Mode 内容。
5. 正式服务接通后，由 P1 用 Shared Core 的 Domain Model、`RestAgentService` 与 `RestSessionControlling` 替换 `HushDemoStore` 的固定状态；P4 View 不直接访问 HTTP、Gmail 或 Photon。

紧凑 Mac 窗口建议默认尺寸为 `420 × 700`，最小尺寸不要低于 `380 × 580`。

## 不依赖 Xcode 工程的本地 Demo

仓库根目录执行：

```bash
find apps/HushApp/Shared/DesignSystem apps/HushApp/Shared/Features \
  -name '*.swift' -print0 \
  | xargs -0 swiftc -parse-as-library -D HUSH_DEMO_STANDALONE -o /tmp/HushDemo

HUSH_CONTENT_ROOT="$PWD/content" /tmp/HushDemo
```

这个入口只用于 P4 预览，不写入 Xcode Project，也不新增 Target。

## 演示顺序

### Day Reset

1. 首屏确认右上方显示 `SAMPLE MODE`。
2. 点“说说我怎么累”。
3. 选“脑子很满”，保持 3 分钟。
4. 点“继续”，确认反映下方写着“固定 fixture，不是实时 LLM 判断”。
5. 选“让身体动一下”。
6. 检查 Quest 的时长、三步动作与“不用盯屏幕”。
7. 点“换一个”，确认只在固定本地库中切换。
8. 开始计时，验证暂停、继续、提前结束。
9. 打开“一个轻问题”，确认页面写着“不保存答案”。
10. 完成双问反馈。

### Sleep Handoff

1. 首屏点“我准备睡了”。
2. 输入一个主动交接事项。
3. 保持“包含已授权 Gmail”开启，确认页面写着 Sample Mode 不访问真实账号。
4. 点“交给 Hush”，进入模拟 running 状态。
5. 查看 Pause Receipt：
   - `uncertain` 项可见；
   - 已授权 Gmail 与主动交接事项列为已覆盖；
   - 微信、电话和其他渠道列为未覆盖；
   - 页面明确说明数据来自 fixture。
6. 进入 Blue Reset，确认未审核卡片显示“示例内容，待 Blue Box 审核”。

## 真实与 Mock 边界

| 能力 | REAL | MOCK | 当前说明 |
|---|---:|---:|---|
| SwiftUI 产品界面 | ✅ | — | iOS/macOS 共享 View |
| 律动曲线与 Design System | ✅ | — | Reduce Motion 可停 |
| 固定 Rest Quest 内容 | ✅ | — | 本地 JSON |
| Guided Drift 内容 | ✅ | — | 本地 JSON，不保存答案 |
| Session 锁屏恢复 | — | ✅ | 当前仅界面内计时，待 P1 Controller |
| fatigue 反映 | — | ✅ | 固定 contract fixture 语义 |
| Gmail 读取与草稿 | — | ✅ | 只展示 fixture 状态 |
| Photon | — | ✅ | P4 Demo 不访问 Photon |
| Blue Reset 内容审核 | — | ✅ | 明确标记待 Blue Box 审核 |

## 已知边界

- 当前仓库没有 `Hush.xcodeproj`，所以 P4 无权也无法验证 Target、Signing、MenuBarExtra 或 Bundle Resource 接线。
- `HushDemoStore` 是 Sample Mode 演示状态机，不替代 P1 的 Shared Core Session 与网络层。
- Blue Reset 当前是占位内容，不可在路演中表述为已完成医学或 Blue Box 专业审核。
