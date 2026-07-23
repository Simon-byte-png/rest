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
│   ├── mail/                        # Gmail Owner: Gmail/OAuth/provider adapters
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

补充边界：

- `MailProvider` 端口定义在 `domain/`，由 W1 维护。
- Gmail 实现、OAuth 路由和 Gmail 集成测试位于 `mail/`，由 Gmail Owner 维护。
- Photon / Messaging 实现位于 `messaging/`，由 W2 维护。
- Provider 完成后统一由 W1 在 `composition.ts` 接线。
- W2 导出注册函数和 provider factory，W1 只在 `bootstrap.ts` 组合依赖。

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
