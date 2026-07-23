# Hush 开发协议总览 v1

# 00｜协议总览与优先级

## 目的

将产品功能文档转换为四人和 Coding Agent 可以直接执行的工程协议，避免以下问题：

- 前后端字段、枚举和错误处理不一致；
- Windows 后端等待 Apple UI，Apple UI 等待真实 API；
- 多人同时修改 Xcode 工程、共享模型或服务启动文件；
- Demo 因 Photon、Gmail、LLM、DeviceActivity 任一失败而中断；
- Coding Agent 自行修改契约或跨目录重构。

## 文档清单

| 文件 | 解决的问题 | Owner |
|---|---|---|
| `01_SCOPE_AND_FEATURE_FLOWS.md` | 做什么、不做什么、功能流程 | 全员确认，P4维护 |
| `02_SYSTEM_BOUNDARIES_AND_INTERFACES.md` | 客户端/后端/平台职责与功能接口映射 | P1+P2 |
| `03_RUNTIME_AND_FAILURE_PROTOCOL.md` | 超时、重试、幂等、降级、Demo Mode | P2 |
| `04_TEAM_OWNERSHIP_AND_WORKSPACES.md` | 四人分工、目录所有权、冲突规避 | 全员，P1维护 |
| `05_GIT_AND_INTEGRATION_PROTOCOL.md` | 分支、PR、合并、集成时点 | P3维护 |
| `06_ENVIRONMENT_SECRETS_AND_DEPLOYMENT.md` | 环境、密钥、部署、OAuth | P2+P3 |
| `07_PROJECT_STRUCTURE.md` | 基础目录与每层职责 | P1+P2 |
| `08_DEFINITION_OF_DONE_AND_TESTING.md` | 验收、测试和主线稳定性 | 全员 |
| `09_AGENT_TASK_PROTOCOL.md` | 如何给 Coding Agent 派活 | 各 Owner |
| `10_DECISION_LOG_TEMPLATE.md` | 重大改变如何记录 | P4 |
| `11_FIRST_3_HOURS_CHECKLIST.md` | 开工前 3 小时具体行动 | 全员 |
| `contracts/openapi.yaml` | HTTP 接口唯一事实源 | P2，P1审 |
| `contracts/schemas/` | 双端共享数据结构 | P2，P1审 |
| `contracts/fixtures/` | Mock 与契约测试唯一样例 | P2，P1/P4审 |

## 冲突时的优先级

1. `contracts/openapi.yaml` 与 `contracts/schemas/`
2. 本协议包中的工程协议
3. 产品 v3.0 功能文档
4. 临时口头约定
5. Coding Agent 的自行判断

若产品文档与已冻结契约冲突，不可静默修改；提交 Contract Change PR。


---

# 01｜产品范围与功能流程协议

## 1. Must 主线

### A. Day Reset

```text
Hush Door / 自动触发
→ 用户选择“说说我怎么累”或“直接来一个”
→ Name the Tiredness（最多一个 follow-up）
→ Rest Quest（固定安全内容库）
→ Rest Session（1–6 分钟）
→ Guided Drift 或安静
→ 双问反馈
```

### B. Sleep Handoff

```text
App / iMessage 发起“我准备睡了”
→ 用户主动交接未尽事项
→ 创建 Handoff Job
→ Gmail 拉取未读
→ LLM 分类与草稿建议
→ Gmail 创建草稿，永不自动发送
→ Pause Receipt：已接住、未覆盖、明天第一步
→ Blue Reset 枕上引导
```

### C. Hush Phone

```text
Photon 入站消息
→ Intent Router
→ check-in / recommend / handoff
→ 最多两轮消息
→ 给出具体 Rest Quest 或交班结果
```

## 2. 功能接口映射

| 功能 | 是否需要后端 | 工程入口 |
|---|---:|---|
| Hush Door | 否 | `RestEntryRouting` |
| Name the Tiredness | 是；失败可本地标签降级 | `POST /v1/rest/check-in` |
| Rest Quest | 本地内容为准；后端只选 ID | `POST /v1/rest/recommend` |
| Day Reset | Session 本地运行 | `RestSessionControlling` |
| Guided Drift | 否，纯本地 | `RestContentProvider` |
| AI Wait Reset | 使用 Handoff Job 预计等待 | `POST/GET /v1/handoff/...` |
| Sleep Handoff | 是 | Handoff Job + Gmail |
| Hush Phone | 是 | Photon webhook + 内部 Intent Router |
| Blue Reset | 否，纯本地内容 | `RestContentProvider` |
| Rest Memory | 优先本地；反馈可匿名提交 | `POST /v1/rest/feedback` |

## 3. Must / Should / Could / Won't

### Must

- iOS 主动入口。
- macOS 菜单栏主动入口。
- Name the Tiredness 最多两轮。
- Rest Quest 固定库。
- Day Reset 会话与反馈。
- Guided Drift 本地题库。
- Photon 可收发的 Hush 消息身份。
- Gmail Demo 账号真实读取和创建草稿。
- Sleep Handoff 与 Pause Receipt。
- Blue Reset 实体体验。
- 全链路 Sample Mode。

### Should

- DeviceActivity 真实阈值。
- Live Activity。
- AI Wait Reset。
- Rest Anchors。
- 次日晨间摘要。
- macOS NSWorkspace 自动监测。
- 语音识别。
- 轻量 Rest Memory。

### Could

- NFC 快捷指令。
- Widget / App Intent / Action Button。
- Photon 群聊。
- Live Activity 交互按钮。
- 非 Demo Gmail 用户 OAuth。

### Won't

- 医疗诊断。
- 读取用户既有 iMessage、微信或第三方 App 内手势。
- 自动发送邮件。
- Windows/Android 客户端。
- Apple Watch 生理数据。
- 系统级悬浮球。
- 永久后台录音。
- 复杂长期个性化模型。
- 让 LLM 自由生成任意现实动作。

## 4. 安全与产品语言

- “fatigue type”是推荐分类，不是诊断。
- Handoff 结论必须写明覆盖范围。
- 无法判断的邮件放入 `uncertain`。
- “今晚没有必须处理的事”只能表述为：
  “在已授权 Gmail 和你主动交接的事项中，没有发现必须今晚处理的内容。”
- Photon 是联系人，不是读取用户数据的后门。


---

# 02｜系统边界、职责与接口映射

## 1. 总体边界

```text
Apple Clients
  ├─ iOS/iPadOS App
  ├─ macOS MenuBar App
  ├─ DeviceActivity Extension
  └─ Live Activity Extension
          │ HTTPS / JSON
          ▼
Hush Backend
  ├─ REST API
  ├─ Rest Orchestrator
  ├─ Handoff Job
  ├─ Agent LLM Adapter
  ├─ Gmail Adapter
  ├─ Photon Adapter
  └─ Fixed Content Loader
```

## 2. Apple 客户端拥有最终控制权

客户端负责：

- 权限申请与本地隐私说明。
- Hush Door 与所有入口路由。
- 本地 Rest Quest / Guided Drift / Blue Box 内容。
- Rest Session 状态机与计时。
- Live Activity、通知、菜单栏。
- Sample Mode 明确标识。
- 冷却期、每日提醒上限、用户拒绝。
- 是否执行后端建议。
- 本地反馈和偏好。
- 网络失败降级。

后端不得直接：

- 开始或结束用户休息。
- 屏蔽应用。
- 打断用户。
- 修改 DeviceActivity。
- 自动发送 Gmail。
- 诊断用户。
- 保存 Guided Drift 答案。

## 3. 后端职责

后端负责：

- 将自然语言疲惫描述映射为可解释分类。
- 最多生成一个能改变推荐结果的 follow-up。
- 从固定 Rest Quest 库中选择 `quest_id`。
- Gmail OAuth、读取未读、创建草稿。
- 创建与运行 Handoff Job。
- 整理用户主动交接的 open loops。
- 生成覆盖范围明确的 Handoff Summary / Pause Receipt。
- Photon 入站路由与主动消息。
- LLM 输出的 Schema 校验。
- Real/Mock/Cached 来源标记。

## 4. 核心 Swift 协议

```swift
protocol RestEntryRouting {
    func open(_ context: RestEntryContext)
}

protocol UsageMonitoring {
    func requestAuthorization() async throws
    func startMonitoring(config: MonitorConfig) async throws
    var events: AsyncStream<UsageEvent> { get }
    func currentSummary() async -> UsageSummary
}

protocol RestAgentService {
    func evaluate(_ summary: UsageSummary) async throws -> RestSuggestion
    func checkIn(_ input: FatigueCheckIn) async throws -> FatigueReflection
    func recommend(_ input: RestRecommendationRequest) async throws -> RestQuestRecommendation
    func sendFeedback(_ feedback: RestFeedback) async throws
    func startHandoff(_ input: HandoffStartRequest) async throws -> HandoffJob
    func handoffStatus(_ id: String) async throws -> HandoffJobState
    func cancelHandoff(_ id: String) async throws
}

protocol RestContentProvider {
    var contentVersion: String { get }
    func quest(id: String) -> RestQuest?
    func quests(matching filter: RestQuestFilter) -> [RestQuest]
    func randomSafeQuest(_ filter: RestQuestFilter) -> RestQuest
    func driftPrompt(category: DriftCategory?) -> DriftPrompt
    func blueBoxCard(for context: SleepContext) -> BlueBoxCard
}

protocol RestSessionControlling {
    var state: AsyncStream<RestSessionState> { get }
    func start(quest: RestQuest) async throws
    func pause() async
    func resume() async
    func end(reason: RestEndReason) async
}

protocol RestPreferenceStoring {
    func load() async throws -> RestPreferences
    func save(_ preferences: RestPreferences) async throws
    func record(_ feedback: RestFeedback) async throws
}
```

建议实现：

```text
UsageMonitoring
├─ DeviceActivityUsageMonitor
├─ MacWorkspaceUsageMonitor
└─ MockUsageMonitor

RestAgentService
├─ HTTPRestAgentService
└─ MockRestAgentService

RestContentProvider
└─ BundledRestContentProvider

RestSessionControlling
└─ DefaultRestSessionController
```

## 5. 核心 TypeScript 接口

```typescript
interface MailProvider {
  fetchUnread(ctx: MailFetchContext): Promise<MailItem[]>;
  createDraft(input: DraftRequest): Promise<{ draftId: string }>;
}

interface MessagingChannel {
  send(input: OutboundMessage): Promise<void>;
  register(handler: InboundMessageHandler): void;
}

interface AgentLLM {
  reflectFatigue(input: FatigueCheckIn): Promise<FatigueReflection>;
  chooseQuest(
    input: RestRecommendationRequest,
    allowedQuests: RestQuest[]
  ): Promise<RestQuestRecommendation>;
  summarizeHandoff(input: HandoffAgentInput): Promise<HandoffSummaryDraft>;
}

interface RestContentRepository {
  contentVersion(): string;
  quests(): RestQuest[];
  questById(id: string): RestQuest | undefined;
  blueBoxCards(): BlueBoxCard[];
  safetyRules(): SafetyRule[];
}

interface HandoffJobRepository {
  create(input: HandoffStartRequest): Promise<HandoffJob>;
  get(id: string): Promise<HandoffJobState | null>;
  update(id: string, patch: HandoffJobPatch): Promise<void>;
}

interface IdempotencyStore {
  get(key: string): Promise<StoredResponse | null>;
  put(key: string, response: StoredResponse, ttlSeconds: number): Promise<void>;
}
```

实现：

```text
MailProvider
├─ GmailMailProvider
└─ MockMailProvider

MessagingChannel
├─ PhotonChannel
└─ ConsoleChannel

AgentLLM
├─ ClaudeLLM
└─ CannedLLM

HandoffJobRepository
├─ InMemoryHandoffJobRepository（黑客松默认）
└─ 可选持久化实现
```

## 6. 功能级接口说明

### Hush Door

- 不调用网络即可打开。
- 构造 `RestEntryContext`。
- “直接来一个”必须从本地安全 Quest 库选择。
- “说说我怎么累”调用 `/v1/rest/check-in`。

### Name the Tiredness

- 第一次请求可返回 `needs_follow_up=true`。
- 最多一个 follow-up。
- 第二次必须进入 Quest 推荐或 `unknown` 降级。
- 不输出医学术语和诊断结论。

### Rest Quest

- Canonical steps 位于 `content/rest-quests.json`。
- 后端只选择 `quest_id`，不替换步骤。
- 内容版本不匹配时，客户端使用本地 fallback Quest。

### Day Reset

- Rest Session 在客户端运行。
- 后端无权强制开始、暂停或结束。
- Feedback 可以本地先写，再异步提交。

### Guided Drift

- 全程本地。
- 不记录答案。
- 不调用 LLM。
- 只记录“选择了 Drift”及结束反馈，且默认匿名。

### Sleep Handoff

- `/handoff/start` 必须幂等。
- Gmail 草稿创建必须防重复。
- `uncertain` 必须保留。
- Pause Receipt 必须展示 `included_sources` 和 `excluded_sources`。
- Gmail 不可用时仍处理用户主动交接事项。

### Photon

- Webhook 必须校验签名；未验证前不得部署为公开生产路径。
- Photon payload 由 Adapter 转为内部 `InboundMessage`，业务层不依赖供应商结构。
- 消息对话最多两轮。
- 未知意图使用安全简短 fallback。


---

# 03｜运行时、错误、超时与降级协议

## 1. 通用请求头

客户端请求：

```text
X-Request-ID: <opaque unique request id>
X-Client-Version: <semver>
X-Contract-Version: 1.0
Idempotency-Key: <uuid>       # 仅需幂等的 POST
X-Hush-Demo-Token: <secret>   # 仅 Sample Mode
```

后端响应：

```text
X-Request-ID: <same uuid>
X-Hush-Data-Origin: real | mock | cached
X-Contract-Version: 1.0
```

客户端检测到 `mock` 时必须显示 `SAMPLE MODE`，不能伪装真实能力。

对于带 JSON body 的接口，body 中的 `request_id` 必须与 `X-Request-ID` 完全一致；不一致时返回 `INVALID_REQUEST`。响应 body 中的 `request_id` 与响应头始终回显当前 HTTP 请求 ID。Job 内部另行保存原始创建请求 ID，不将其混用为后续轮询请求 ID。

## 2. 超时

| 接口 | 客户端超时 |
|---|---:|
| `/health` | 3 秒 |
| `/rest/evaluate` | 8 秒 |
| `/rest/check-in` | 12 秒 |
| `/rest/recommend` | 8 秒 |
| `/rest/feedback` | 5 秒 |
| `/handoff/start` | 5 秒 |
| `/handoff/{id}` | 5 秒 |
| Gmail OAuth status | 5 秒 |

## 3. 重试

- `GET`：网络错误可自动重试 2 次，退避 1s/2s。
- `POST /rest/evaluate`、`check-in`、`recommend`：不自动重试；用户可手动重试。
- `POST /handoff/start`：仅使用同一 `Idempotency-Key` 重试。
- `POST /rest/feedback`：可使用同一幂等键后台重试一次。
- Gmail 草稿创建：必须使用内部 `draft_dedupe_key`，禁止因 Job 重试创建重复草稿。
- Photon webhook：按供应商事件 ID 去重。

## 4. Handoff Job 状态机

```text
queued
→ fetching_mail
→ classifying
→ creating_drafts
→ preparing_receipt
→ succeeded

任意阶段
→ failed
→ cancelled
```

轮询：

- 每 2 秒一次。
- 前台最多等待 60 秒。
- 60 秒后显示“仍在处理中，可以先休息”，Job 后台继续。
- 进入 `succeeded/failed/cancelled` 后停止轮询。
- App 重启后可通过 Job ID 恢复查询。

## 5. 错误响应

统一：

```json
{
  "schema_version": "1.0",
  "request_id": "req_xxx",
  "error": {
    "code": "GMAIL_UNAVAILABLE",
    "message": "Gmail 暂时不可用。",
    "retryable": true,
    "fallback": "OPEN_LOOPS_ONLY",
    "details": null
  }
}
```

错误码：

| 错误码 | 含义 | 推荐降级 |
|---|---|---|
| `INVALID_REQUEST` | 请求不符合契约 | 不重试，修复客户端 |
| `CONTRACT_VERSION_UNSUPPORTED` | 契约版本不支持 | 切 Sample Mode / 停止联调 |
| `CONTENT_VERSION_MISMATCH` | Quest 内容版本不一致 | 客户端本地选 Quest |
| `LLM_TIMEOUT` | 模型超时 | CannedLLM 或本地标签 |
| `LLM_INVALID_OUTPUT` | 结构化输出不合法 | CannedLLM |
| `GMAIL_NOT_CONNECTED` | 未授权 | 仅处理 open loops |
| `GMAIL_UNAVAILABLE` | Gmail 故障 | 仅处理 open loops |
| `GMAIL_RATE_LIMITED` | Gmail 限流 | 延迟处理 |
| `GMAIL_DRAFT_FAILED` | 草稿失败 | 摘要可用，标记草稿未保存 |
| `PHOTON_UNAVAILABLE` | Photon 故障 | App/Console 通道 |
| `PHOTON_SIGNATURE_INVALID` | Webhook 签名错误 | 401 丢弃 |
| `JOB_NOT_FOUND` | Job 不存在 | 重新开始 |
| `JOB_FAILED` | Job 执行失败 | 展示可解释失败 |
| `DEMO_MODE_DISABLED` | 服务端未允许 Sample Mode | 不尝试伪造 |
| `INTERNAL_ERROR` | 未分类错误 | 安全通用提示 |

## 6. 功能降级矩阵

| 故障 | 用户仍能完成什么 |
|---|---|
| 后端完全不可用 | Hush Door、Surprise Me、本地 Quest、Guided Drift、Blue Reset |
| LLM 不可用 | 本地疲劳标签 + 规则选 Quest；Handoff 使用 CannedLLM |
| Gmail 不可用 | Job 继续成功完成；仅处理用户主动交接事项，并在 Pause Receipt 中明确 Gmail 未覆盖 |
| Photon 不可用 | App 内完成全部流程；ConsoleChannel 联调 |
| DeviceActivity 不可用 | iOS 主动入口 + 调试触发 |
| Live Activity 不可用 | App 内本地计时 |
| macOS 自动监测未完成 | 菜单栏主动入口仍可用 |
| Blue Box 知识未获得 | 仅使用已审核的通用安全卡并如实标注 |
| 无网络 | Sample Mode + 本地内容 |
| 语音识别未完成 | 文本输入；Listening 动效仅作视觉状态 |

## 7. Demo Mode 安全

禁止仅凭 `X-Demo-Mode: 1` 对公网开启 Mock。

必须同时满足：

```text
服务端 HUSH_DEMO_MODE=true
+
请求带正确 X-Hush-Demo-Token
```

并要求：

- 服务端日志标记 `data_origin=mock`。
- 客户端界面显示 `SAMPLE MODE`。
- 录屏和提交材料明确哪些是真实能力。
- Demo token 不写进公开仓库。


---

# 04｜四人分工、工作区与冲突规避协议

## 1. 角色

| 角色 | 设备 | 主责 |
|---|---|---|
| **M1 / P1** | Mac | Apple Platform、Xcode、Shared Core、Session、最终集成 |
| **M2 / P4** | Mac | SwiftUI Feature、Design System、内容、Demo |
| **W1 / P2** | Windows | REST API、Agent、Handoff Job、契约实现、服务组合根 |
| **Gmail Owner** | Windows | 仅 Gmail Provider、OAuth Adapter 与 Gmail 联调 |
| **W2 / P3** | Windows | 仅 Photon / Messaging Provider、Webhook Adapter 与 Photon 联调 |

## 2. 唯一所有权

### M1 / P1 独占

```text
apps/HushApp/Hush.xcodeproj/**
apps/HushApp/**/*.entitlements
apps/HushApp/Shared/Core/**
apps/HushApp/iOSApp/App/**
apps/HushApp/iOSApp/Platform/**
apps/HushApp/MacMenuBar/App/**
apps/HushApp/MacMenuBar/Platform/**
apps/HushApp/DeviceActivityMonitorExt/**
apps/HushApp/RestLiveActivityWidget/**
```

只有 M1 可以：

- 修改 Target、Signing、Capabilities、App Group、Bundle ID。
- 新增 Swift Package。
- 修改 Xcode Scheme。
- 接入 Real/Mock 依赖注入。
- 修改共享 Domain Model 的 Swift 镜像。

### M2 / P4 独占

```text
apps/HushApp/Shared/Features/**
apps/HushApp/Shared/DesignSystem/**
content/**
docs/demo*
docs/pitch*
```

M2 不修改：

- `.xcodeproj`
- `.entitlements`
- `Shared/Core/Domain`
- Networking 接线
- contracts

### W1 / P2 独占

```text
server/src/api/**
server/src/application/rest/**
server/src/application/handoff/**
server/src/domain/**
server/src/agent/**
server/src/jobs/**
server/src/content/**
server/src/infra/**
server/tests/contracts/**
server/tests/provider-contracts/**
contracts/**
```

根 `server/package.json`、锁文件、`server/src/composition.ts` 和
`server/src/bootstrap.ts` 由 W1 独占。Provider Owner 需要依赖时开 Issue，
由 W1 添加。

W1 在 `server/src/domain/**` 中定义 `MailProvider`、`MessagingChannel`、
Inbound mapper 与 dedupe 等供应商无关端口，但不实现 Gmail OAuth、Gmail
Provider、Photon Provider 或 Photon Webhook。

### Gmail Owner 独占

```text
server/src/mail/**
server/tests/integration/gmail*
scripts/seed-gmail.*
scripts/clear-demo-drafts.*
docs/gmail/**
```

### W2 / P3 独占

```text
server/src/messaging/**
server/tests/integration/photon*
scripts/gen-qr.*
docs/photon/**
```

W2 不直接修改：

- `server/src/bootstrap.ts`
- `server/src/composition.ts`
- `contracts/**`
- `server/src/agent/**`
- `server/src/application/**`
- `server/src/domain/**`
- `server/src/mail/**`

Gmail Owner 仅通过 `server/src/mail/**` 提供 Gmail factory/route；W2 仅通过
`server/src/messaging/**` 提供 Photon/Messaging factory/route。两者均不得修改
Domain、Application、contracts 或 Composition Root，最终由 W1 接线。

## 3. 公共区域规则

| 区域 | Owner | 必须 Reviewer |
|---|---|---|
| `contracts/**` | W1 | M1 + 受影响方 |
| `Shared/Core/Domain/**` | M1 | W1 |
| `server/src/bootstrap.ts` | W1 | W2 |
| Xcode project / entitlement | M1 | M2 |
| `content/**` | M2 | W1（若后端消费） |
| `AGENTS.md` | M1 | 全员 |

冻结后修改公共契约必须：

1. 新建 `contract-change/*` 分支。
2. 更新 OpenAPI/Schema/fixture。
3. 同一 PR 更新 TS Zod 与 Swift Codable 镜像，或明确拆成两个阻塞 PR。
4. 合约版本递增。
5. 双端契约测试通过。
6. M1 与 W1批准。

## 4. 开发顺序

```text
M2：内容 JSON + UI Mock
        ↓
W1：契约 + fixtures + Server skeleton
        ↓
M1：Swift 镜像 + Client Mock + Session
W2：Photon Adapter + Console Adapter
        ↓
W1：Real LLM + Handoff 编排
Gmail Owner：Real Gmail
W2：Real Photon
        ↓
M1：切换 Real Service
        ↓
四人：端到端 + 断网降级
```

## 5. 工作区规则

- 每个人使用自己的 feature branch。
- 每台机器只运行一个主工作目录。
- Coding Agent 若需并行任务，必须使用独立 `git worktree`，不得在人的未提交工作区运行。
- Agent worktree 命名：
  `../hush-agent-<owner>-<task>`
- 任务结束后先由人审 diff，再合并或 cherry-pick。
- 不把未提交修改交给另一个 Agent 接管。
- 不在 `main` 上运行自动重构。

## 6. 开发锁

无需维护容易冲突的共享锁文件。使用 GitHub Issue：

```text
标题：[LOCK] contracts/rest-quest schema
Assignee：W1
状态：In Progress
预计释放：18:30
```

修改以下区域前必须建立 LOCK Issue：

- contracts
- Shared/Core/Domain
- Xcode project / entitlement
- server bootstrap / package lock
- content JSON schema

完成后关闭 Issue。


---

# 05｜Git、PR 与集成协议

## 1. 分支模型

只使用：

```text
main
feat/<owner>/<short-name>
fix/<owner>/<short-name>
contract-change/<short-name>
```

示例：

```text
feat/m1/rest-session
feat/m2/siri-wave-ui
feat/w1/gmail-provider
feat/w2/photon-webhook
```

禁止：

- 所有人直接提交同一个 `dev` 分支。
- 长期保留超过半天的 feature branch。
- 未 rebase 最新 main 就合并。
- 在 main 上直接运行 Coding Agent。

## 2. main 标准

`main` 必须始终：

- Server tests 通过。
- Contracts/fixtures 校验通过。
- Apple App 至少 Sample Mode 可编译运行。
- Demo 主流程不因真实服务不可用而中断。
- 不包含密钥。
- 不包含未标识的 Mock。

## 3. PR 规则

每个 PR：

- 尽量只解决一个任务。
- 修改文件最好少于 20 个；生成文件除外。
- 写明允许目录与实际目录是否一致。
- 列出真实/Mock 能力。
- 给出测试命令。
- 说明是否改变契约、环境变量或权限。
- 截图/录屏只在 UI PR 必须。

合并策略：**Squash Merge**。

## 4. 集成时点

建议固定：

- Day 1：14:00、19:00、23:00
- Day 2：14:00、19:00、24:00
- Day 3：最终提交前

每次集成：

1. 10 分钟停止新增开发。
2. 各分支 rebase main。
3. 依次合并 contracts → backend → Apple Core → UI → Photon。
4. Server 运行 test。
5. Apple 运行 Sample Mode。
6. 非团队手机验证 Photon（需要时）。
7. 跑一次 Demo 主线。
8. main 打标签：`integration-d1-2300` 等。

## 5. 紧急热修

Demo 冻结后只允许：

- `fix/*` 分支。
- 不新增依赖。
- 不改契约，除非主线完全无法运行。
- 每次修复后立即录制新备份视频。

## 6. 提交信息

```text
feat(rest): add local surprise-me quest selection
fix(handoff): dedupe gmail drafts by idempotency key
docs(contract): clarify uncertain mail category
test(photon): add webhook signature fixture
```

## 7. 跨平台文本设置

所有成员执行：

```bash
git config core.autocrlf false
git config pull.rebase true
git config rerere.enabled true
```

仓库通过 `.gitattributes` 强制 LF。

## 8. Xcode 冲突规则

- `project.pbxproj` 只由 M1修改。
- 不为 `.pbxproj` 配置 `merge=union`。
- M2 只在已建立的 synchronized folder 中新增 Swift 文件。
- 新 Target、Capability、SPM 依赖都由 M1完成。
- 若 Xcode 文件冲突，放弃自动拼接，由 M1从 main 重做目标设置。


---

# 06｜环境、密钥、OAuth 与部署协议

## 1. 固定版本

- Node.js 20.x
- pnpm 9.x
- TypeScript 5.x
- Swift 5.10+
- Xcode 16
- iOS Deployment Target：由 M1 开工前冻结
- Contract Version：`1.0`

## 2. 后端环境变量

见根 `.env.example`。

规则：

- `.env`、OAuth token、refresh token 不提交。
- Photon API key 不进入 Apple 客户端。
- Claude API key 不进入 Apple 客户端。
- Gmail client secret 不进入 Apple 客户端。
- Demo Gmail 账号密码不进仓库和群聊明文。
- 生产/演示 token 使用托管平台 Secret。
- 服务器日志不得打印邮件正文、OAuth token、Guided Drift 内容。

## 3. Gmail

黑客松默认：

- 预先准备 Demo Gmail 账号。
- 现场前完成 OAuth 授权和 refresh token 保存。
- Scopes 以实际实现为准；代码路径只创建草稿，不调用发送。
- Seed script 必须可清理并重建演示邮件。
- 草稿标题加固定 Demo 前缀，便于去重和清理。
- 用户设备现场不依赖访问 Google OAuth 页面。

## 4. Photon

Day 1 冻结：

- 实际 line 类型。
- Webhook URL。
- 签名验证方式。
- 事件 ID 和重试行为。
- 中国区 iPhone 实测结论。
- 主动外发限制。
- 备用 ConsoleChannel / Telegram 结论。

供应商原始 payload 只能存在 adapter 与 fixture 中，业务层统一使用内部模型。

## 5. 部署

建议环境：

```text
demo
```

单独于本地开发。

部署要求：

- HTTPS。
- `/v1/health` 可外部访问。
- Photon webhook 可达。
- Sample Mode 需要 Secret。
- 每次部署保留上一可用版本。
- Demo 前冻结部署；Photon line 与 webhook 路由不再修改。
- 保存一份本地 ConsoleChannel 启动方式。

## 6. 日志

允许：

- request_id
- endpoint
- duration_ms
- status
- data_origin
- job stage
- provider error code

禁止：

- 邮件正文
- Gmail token
- Photon 私人消息全文（除临时调试且必须删除）
- Guided Drift 答案
- API key
- 用户健康推断

## 7. 本地端口

建议：

```text
Backend: 3000
Contract docs: 3001（可选）
Apple Client: 连接配置中的 base URL
```

实际端口在开工时冻结。


---

# 07｜基础项目目录与模块职责

## 1. 总目录

```text
hush/
├── README.md
├── AGENTS.md
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .env.example
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md
│   ├── ISSUE_TEMPLATE/
│   └── workflows/
├── docs/
├── contracts/
│   ├── openapi.yaml
│   ├── schemas/
│   └── fixtures/
├── apps/HushApp/
├── server/
├── content/
└── scripts/
```

## 2. Apple App

```text
apps/HushApp/
├── Hush.xcodeproj/                  # M1 only
├── Shared/
│   ├── Core/
│   │   ├── Domain/                  # Codable models/enums
│   │   ├── Protocols/               # service abstractions
│   │   ├── Routing/                 # RestEntryRouter
│   │   ├── Session/                 # Day Reset state machine
│   │   ├── Networking/              # HTTP client, contract decoding
│   │   ├── Storage/                 # local preferences/feedback
│   │   └── Mock/                    # fixture-backed services
│   ├── Features/
│   │   ├── HushDoor/
│   │   ├── FatigueCheckIn/
│   │   ├── RestQuest/
│   │   ├── DayReset/
│   │   ├── GuidedDrift/
│   │   ├── SleepHandoff/
│   │   └── Feedback/
│   └── DesignSystem/
│       ├── Wave/
│       ├── Typography/
│       ├── Color/
│       └── Motion/
├── iOSApp/
│   ├── App/                         # composition root
│   └── Platform/                    # notification, deep link
├── MacMenuBar/
│   ├── App/
│   └── Platform/                    # MenuBarExtra, optional NSWorkspace
├── DeviceActivityMonitorExt/
└── RestLiveActivityWidget/
```

### 规则

- Feature 只依赖 Core Protocol，不直接依赖 HTTP、Gmail、Photon。
- Platform 层不得包含产品决策。
- `Shared/Core/Domain` 必须镜像 contracts。
- Mock 服务从 `contracts/fixtures` 的资源副本读取。
- iOS 与 Mac 共享同一 Feature 和 Session 流程，不复制业务代码。

## 3. 后端

```text
server/
├── package.json                     # W1 only
├── pnpm-lock.yaml                   # W1 only
├── src/
│   ├── bootstrap.ts                 # W1 composition root
│   ├── config.ts
│   ├── api/
│   │   └── routes/
│   ├── application/
│   │   ├── rest/
│   │   └── handoff/
│   ├── domain/
│   ├── agent/
│   │   ├── prompts/
│   │   └── providers/
│   ├── mail/
│   │   └── providers/
│   ├── jobs/
│   ├── messaging/
│   │   ├── providers/
│   │   └── intents/
│   ├── content/
│   └── infra/
└── tests/
    ├── contracts/
    └── integration/
```

### 分层依赖

```text
api → application → domain
application → interfaces
infra/providers → interfaces
bootstrap → concrete implementations
```

禁止：

- Route 直接调用 Claude/Gmail/Photon SDK。
- Agent prompt 直接创建 Gmail 草稿。
- Photon handler 复制一套 check-in 业务。
- Domain 依赖 Fastify 或供应商 SDK。

## 4. contracts

```text
contracts/
├── openapi.yaml
├── schemas/
│   ├── common.schema.json
│   ├── usage-summary.schema.json
│   ├── fatigue-check-in.schema.json
│   ├── fatigue-reflection.schema.json
│   ├── rest-quest.schema.json
│   ├── rest-recommendation.schema.json
│   ├── handoff-start-request.schema.json
│   ├── handoff-job.schema.json
│   ├── handoff-summary.schema.json
│   ├── pause-receipt.schema.json
│   ├── rest-feedback.schema.json
│   └── error-response.schema.json
└── fixtures/
```

fixtures 必须覆盖：

- 成功。
- 无需提醒。
- follow-up。
- unknown fatigue。
- Quest 推荐。
- Handoff running/succeeded/failed。
- Gmail 未连接。
- uncertain 邮件。
- Photon webhook 样例。
- LLM 非法输出。
- 超时。

## 5. content

```text
content/
├── rest-quests.json
├── drift-prompts.json
├── bluebox-cards.json
├── safety-rules.json
└── content-manifest.json
```

`content-manifest.json`：

```json
{
  "version": "1.0.0",
  "rest_quests": "1.0.0",
  "drift_prompts": "1.0.0",
  "bluebox_cards": "1.0.0"
}
```

## 6. scripts

- `seed-gmail.ts`：重建 Demo 邮件。
- `clear-demo-drafts.ts`：清理重复草稿。
- `gen-qr.ts`：生成 Photon 联系二维码。
- `validate-contracts.ts`：校验 fixture。
- `smoke-test.sh/ps1`：后端 smoke test。
- `deploy.sh`：演示环境部署。


---

# 08｜Definition of Done 与测试协议

## 1. 全局 DoD

任何任务完成必须满足：

- 只修改任务允许目录。
- 对应成功和失败路径已测试。
- 不改契约，或已通过 Contract Change。
- Real/Mock 均可注入。
- 错误可被用户理解。
- 无密钥、隐私内容或未清理调试日志。
- PR 描述包含复现方法。
- main Sample Mode 主线未被破坏。

## 2. 功能验收

### Hush Door

- iOS App 和 Mac 菜单栏均可主动进入。
- 不需要网络。
- 可选择 check-in 或 Surprise Me。
- 所有入口最终使用同一 `RestEntryRouter`。

### Name the Tiredness

- 支持五类疲劳与 `unknown`。
- 最多一个 follow-up。
- 失败时可用本地快捷标签继续。
- 不出现诊断性语言。

### Rest Quest

- 返回的 `quest_id` 在本地库存在。
- Quest 1–6 分钟、无需持续看屏幕。
- 支持换一个。
- 不生成危险动作或无边界家务。

### Day Reset

- start/pause/resume/end 工作。
- App 退出/锁屏后状态可合理恢复。
- Live Activity 若启用，不残留。
- 结束后双问反馈。

### Guided Drift

- 纯本地。
- 不保存答案。
- 一次只显示一个问题。
- Reduce Motion 正常。

### Sleep Handoff

- Demo Gmail 能读取。
- 至少创建一个真实草稿且不发送。
- 重试不创建重复草稿。
- `uncertain` 可见。
- Pause Receipt 展示覆盖与未覆盖来源。
- Gmail 失败仍能保存 open loops。

### Photon

- 非团队 iPhone 可入站。
- 两轮内给出 Quest 或进入 Handoff。
- Webhook 去重。
- 签名失败返回 401。
- ConsoleChannel 可替代真实 Photon 联调。

## 3. 契约测试

W1：

- 每个 fixture 通过 JSON Schema。
- OpenAPI 可解析。
- Zod schema 与 fixtures 相容。

M1：

- Swift Codable 能解码同一 fixture。
- 枚举和 null 处理一致。
- 错误 fixture 能映射为用户状态。

冻结契约后，CI 必须阻止不兼容 fixture 合并。

## 4. Demo Smoke Test

至少连续 5 次：

```text
1. iOS/Mac 主动入口
2. check-in
3. quest
4. session
5. feedback
6. iMessage 发“我准备睡了”
7. handoff job
8. Gmail 草稿
9. pause receipt
10. blue reset
```

额外测试：

- 拔网线。
- 开启 Sample Mode。
- Gmail 未连接。
- LLM 超时。
- Photon 不可用。
- DeviceActivity 不触发。
- App 后台再回来。
- Handoff 超过 60 秒。

## 5. 真实/模拟能力清单

提交前维护一张只读页面：

| 能力 | REAL | MOCK | 现场状态 |
|---|---:|---:|---|
| iOS 主动入口 | ✅ | — | |
| Mac 菜单栏 | ✅ | — | |
| DeviceActivity | | ✅ | |
| Claude | | ✅ | |
| Gmail 读取 | | ✅ | |
| Gmail 草稿 | | ✅ | |
| Photon iMessage | | ✅ | |
| Blue Box 内容 | | ✅ | |

不得把 MOCK 勾成 REAL。


---

# 09｜Coding Agent 任务协议

## 1. 原则

Coding Agent 适合：

- 独占目录内的小功能。
- 基于冻结契约生成模型、Mock、测试。
- 编写 UI Feature 或 provider 实现。
- 补充单元测试与错误状态。
- 修复明确可复现 Bug。

Coding Agent 不适合自行决定：

- 产品范围。
- 数据契约。
- Xcode target/capability。
- Gmail scope。
- Photon line 配置。
- 新依赖。
- 跨目录重构。
- Demo 真实性表述。

## 2. 标准任务卡

```markdown
# TASK-<编号>：<名称>

## 背景
<为什么做>

## Owner
M1 / M2 / W1 / W2

## 允许修改
- path/**

## 禁止修改
- contracts/**
- apps/HushApp/Hush.xcodeproj/**
- ...

## 依赖契约
- contracts/schemas/...
- contracts/fixtures/...

## 输入
- ...

## 输出
- ...

## 验收
1. ...
2. ...
3. ...

## 测试命令
- ...

## 降级要求
- ...

## 完成后报告
- 修改文件
- 测试结果
- 未解决问题
```

## 3. Agent 工作区

若一个成员并行使用 Agent：

```bash
git worktree add ../hush-agent-m2-wave -b feat/m2/wave-ui main
```

规则：

- 一个 worktree 对应一个任务。
- Agent 不访问人的主工作区。
- 不让两个 Agent 修改同一目录。
- 完成后由人查看 `git diff`。
- 验证后 squash/cherry-pick。
- 删除 worktree 前确认无未提交内容。

## 4. 审查清单

- 是否越界修改？
- 是否修改了 schema/枚举？
- 是否硬编码 API key/URL？
- 是否跳过 Mock？
- 是否让 LLM 生成自由动作？
- 是否保存私人输入？
- 是否新增了依赖？
- 是否破坏 macOS/iOS 共享 Feature？
- 是否有编译或契约测试证据？
- 是否诚实说明失败？

## 5. 禁止的模糊任务

不要给 Agent：

- “把后端做完”
- “做完整 iOS”
- “优化整个架构”
- “把所有接口接好”
- “随便设计一个数据库”
- “修复所有 Bug”

必须拆成一个目录、一个契约、一个验收。


---

# 11｜开工前 3 小时清单

## 0–30 分钟：范围冻结

- [ ] 四人确认 Must 主线。
- [ ] 确认 DeviceActivity 是 Spike，不阻塞主动入口。
- [ ] 确认 Guided Drift 不保存答案。
- [ ] 确认 Gmail 永不自动发送。
- [ ] 确认 Photon 不能读取用户既有消息。
- [ ] 填写真实 GitHub 用户名和 CODEOWNERS。

## 30–75 分钟：契约冻结草案

- [ ] 逐项过 `openapi.yaml`。
- [ ] 确认所有枚举。
- [ ] 确认 `uncertain`。
- [ ] 确认 Handoff open loops。
- [ ] 确认 Pause Receipt coverage。
- [ ] 确认 Sample Mode 头和 Secret。
- [ ] Swift/TS 各自解码至少 3 个 fixture。

## 75–105 分钟：项目骨架

M1：

- [ ] 建 Xcode targets。
- [ ] 建 synchronized folders。
- [ ] 配权限与 App Group。
- [ ] 创建 MockRestAgentService。

W1：

- [ ] Fastify skeleton。
- [ ] `/health`。
- [ ] contract validation。
- [ ] CannedLLM。

W2：

- [ ] Photon spike。
- [ ] ConsoleChannel。
- [ ] 部署 skeleton。

M2：

- [ ] Siri 式首屏。
- [ ] Mock 主流程。
- [ ] 内容 JSON 初版。

## 105–135 分钟：Git 与环境

- [ ] main protected。
- [ ] CODEOWNERS 生效。
- [ ] PR template 生效。
- [ ] 全员设置 LF/rebase/rerere。
- [ ] `.env.example` 完成。
- [ ] Secret 未进入 Git history。

## 135–180 分钟：并行演练

每个人必须回答：

1. 我只改哪些目录？
2. 我需要谁的契约？
3. 我提供给谁什么产物？
4. 我的 Real/Mock 是什么？
5. 我的失败如何降级？
6. 哪些文件我绝对不能改？
7. 我今天 14:00 的最小交付是什么？

答不清楚则不能开始大规模 Coding Agent 开发。
