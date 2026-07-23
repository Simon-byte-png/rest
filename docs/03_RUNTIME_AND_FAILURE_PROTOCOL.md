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
