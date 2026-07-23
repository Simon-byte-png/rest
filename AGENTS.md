# AGENTS.md — Hush Coding Agent Rules

本文件对仓库内所有 Coding Agent 生效。除非任务卡明确授权，否则不得违反。

## 1. 项目目标

Hush 是一个环境式休息 Agent，Must 主线为：

`Hush Door → Name the Tiredness → Rest Quest → Rest Session → Feedback`

并包含：

`Sleep Handoff → Gmail 摘要/草稿 → Pause Receipt → Blue Reset`

Photon 只提供 Hush 自己的消息身份，不读取用户既有 iMessage、微信或邮箱。

## 2. 必读文件

- `docs/01_SCOPE_AND_FEATURE_FLOWS.md`
- `docs/02_SYSTEM_BOUNDARIES_AND_INTERFACES.md`
- `docs/04_TEAM_OWNERSHIP_AND_WORKSPACES.md`
- `docs/05_GIT_AND_INTEGRATION_PROTOCOL.md`
- `contracts/openapi.yaml`
- 对应的 `contracts/schemas/*.schema.json`
- 任务卡指定的 fixture

## 3. 绝对禁区

未经任务卡与 Owner 明确授权，不得：

- 修改 `apps/HushApp/Hush.xcodeproj/**`
- 修改任何 `.entitlements`、Signing、Bundle ID、App Group、Target
- 修改 `contracts/**`
- 修改根 `package.json`、`pnpm-lock.yaml`、Swift Package 依赖
- 新增第三方依赖
- 读取或提交 `.env`、OAuth token、refresh token、API key
- 调用 Gmail 发送接口
- 自动发送邮件或外部承诺性消息
- 让 LLM 自由生成 Rest Quest 动作
- 保存 Guided Drift 的用户答案
- 声称诊断疲劳、焦虑、失眠或其他医学状态
- 将 Mock 数据展示为真实数据
- 修改任务卡允许目录之外的文件

## 4. 所有外部能力必须可替换

必须通过协议访问：

- Usage Monitoring
- Agent Service
- Mail Provider
- Messaging Channel
- LLM Provider
- Rest Content Provider
- Session Controller

每个外部能力至少有：

- `Real...`
- `Mock...` 或 `Console...`
- 明确的失败路径

## 5. 数据契约规则

- 字段名、枚举、空值、时间格式以 `contracts/` 为准。
- 时间统一为 ISO 8601 且带时区。
- 未知或无法安全判断的优先级必须使用 `uncertain`，不得强制归类。
- 所有客户端入口只生成 `RestEntryContext`，不得复制业务流程。
- 后端返回 Quest 时优先返回 `quest_id`；步骤以固定内容库为准。

## 6. 完成前自检

提交前必须：

1. 只修改允许目录。
2. 编译/测试通过。
3. 使用指定 fixture 验证成功、空数据、超时和失败。
4. 不泄露密钥和个人数据。
5. 不改变既有契约。
6. 在 PR 中列出真实能力与 Mock 能力。
7. 给出复现命令。
8. 说明未完成或不确定之处。

## 7. Agent 任务卡最小格式

```markdown
## 任务
<一句话>

## Owner
P1/P2/P3/P4

## 允许修改目录
- ...

## 依赖契约
- contracts/...

## 输入 fixture
- contracts/fixtures/...

## 验收标准
1. ...
2. ...

## 禁止事项
- ...
```

没有完整任务卡时，不开始跨模块开发。
