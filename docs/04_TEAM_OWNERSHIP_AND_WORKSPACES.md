# 04｜四人分工、工作区与冲突规避协议

## 1. 角色

| 角色 | 设备 | 主责 |
|---|---|---|
| **M1 / P1** | Mac | Apple Platform、Xcode、Shared Core、Session、最终集成 |
| **M2 / P4** | Mac | SwiftUI Feature、Design System、内容、Demo |
| **W1 / P2** | Windows | REST API、Agent、Handoff Job、Domain Ports、契约实现、最终 Composition Root |
| **Gmail Owner** | Windows | 仅 Gmail Provider、OAuth Adapter 与 Gmail 联调 |
| **W2 / P3** | Windows | 仅 Photon / Messaging Provider、Webhook Adapter 与 Photon 联调 |

`Gmail Owner` 是严格受限的能力 Owner。即使由现有成员兼任，也必须使用
Gmail 专用任务卡和分支，不因此获得 W1 或 W2 目录的修改权。

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
`server/src/bootstrap.ts` 由 W1 独占。Provider Owner 需要依赖或接线时开
Issue，由 W1 添加或完成。

W1 在 `server/src/domain/ports.ts` 中定义并维护：

- `MailProvider`、`MailItem`、`DraftRequest`
- `MessagingChannel`、`InboundMessageMapper`
- `InboundEventDeduplicator`
- 供应商无关的超时、取消、幂等与去重边界

W1 不实现 Gmail Provider、Gmail OAuth、Photon Provider、Photon SDK 或
Webhook Adapter。Provider 完成后，最终由 W1 在
`server/src/composition.ts` 接线。

### Gmail Owner 独占

```text
server/src/mail/**
server/tests/integration/gmail*
scripts/seed-gmail.*
scripts/clear-demo-drafts.*
docs/gmail/**
```

Gmail Owner 只能修改以上路径，不得顺便修改 Domain Ports、Application
Services、contracts、package/lock 或 Composition Root。需要契约变化时先发起
Contract Change PR。

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

W2 通过导出的 `registerMessagingRoutes()`、`MessagingChannel` 和
`InboundMessageMapper` 实现交给 W1 接线。W2 不实现 Gmail。

### Provider Owner 共同禁区

Gmail Owner 与 W2 均不得修改：

```text
server/src/domain/ports.ts
server/src/application/**
contracts/**
server/src/composition.ts
server/src/bootstrap.ts
```

唯一例外是先发起并通过 Contract Change PR；仅在评审批准后，由对应 Owner
或 W1 执行约定修改。

## 3. 公共区域规则

| 区域 | Owner | 必须 Reviewer |
|---|---|---|
| `contracts/**` | W1 | M1 + 受影响方 |
| `Shared/Core/Domain/**` | M1 | W1 |
| `server/src/composition.ts`、`server/src/bootstrap.ts` | W1 | Gmail Owner + W2 |
| `server/tests/provider-contracts/**` | W1 | Gmail Owner + W2 |
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
Gmail Owner：Gmail Adapter + OAuth Adapter
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
