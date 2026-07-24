# W2 / P3 Messaging Provider Kit

本文档面向 W1 / P2，说明如何把 W2 提供的消息模块接入 Hush Server。
当前实现不依赖 Photon SDK；`HttpMessagingChannel` 可以连接 Photon，也可以替换
成其他 iMessage Relay。

## 1. W2 已交付

模块统一从 `server/src/messaging/index.ts` 导出：

| 导出 | 用途 |
|---|---|
| `HttpMessagingChannel` | 通过 HTTP Relay 发送标准 `OutboundMessage` |
| `MessagingHandoffCompletionSink` | 将成功的 Handoff/Pause Receipt 转成 iMessage 通知 |
| `HmacWebhookSignatureVerifier` | 验证入站 Webhook 的 HMAC-SHA256 签名 |
| `MessagingWebhookMapper` | 将 Relay payload 转成 Domain `InboundMessage` |
| `registerMessagingRoutes` | 注册 `POST /v1/webhooks/photon` |

W2 没有修改 Domain Ports、Application、Contracts、Composition Root 或依赖。

## 2. W1 需要完成的接线

### 2.1 Outbound Channel

W1 在 `composition.ts` 中根据环境配置选择真实 Channel 或现有降级实现：

```ts
import {
  HttpMessagingChannel,
  MessagingHandoffCompletionSink
} from "./messaging/index.js";
import {
  NoopHandoffCompletionSink,
  UnavailableMessagingChannel
} from "./infra/provider-stubs.js";

const messaging = relayConfigured
  ? new HttpMessagingChannel({
      endpoint: relayEndpoint,
      authorizationToken: relayApiKey,
      lineId: relayLineId,
      timeoutMs: 8_000
    })
  : new UnavailableMessagingChannel();
```

`HttpMessagingChannel` 会：

- 把 `correlationId` 同时作为 Relay payload 和 `Idempotency-Key`。
- 使用有限超时。
- 在调用前已经取消时不发出网络请求。
- 将超时、网络及非 2xx 响应映射为
  `PHOTON_UNAVAILABLE / APP_ONLY`。

同一业务消息重试时必须复用原 `correlationId`。

### 2.2 Handoff Completion Sink

`HandoffService` 已经只在以下条件调用 completion sink：

- Job 成功完成；
- `response_channel === "imessage"`。

W1 需要提供内部账号到 Relay recipient ID 的解析函数：

```ts
const completionSink = relayConfigured
  ? new MessagingHandoffCompletionSink(
      messaging,
      async (record) =>
        accountLinkRepository.findMessagingRecipient(
          record.request.gmail_account_id
        )
    )
  : new NoopHandoffCompletionSink();
```

上例只说明依赖方向；请使用 W1 最终确定的 Hush account linkage，不要把手机号、
token 或 Relay SDK 对象写入 `HandoffStartRequest`。

Completion Sink 发送的内容只包括：

- 今晚/明天待处理数量；
- 已保存的 Gmail 草稿数量；
- 明天第一步；
- “草稿未发送”的明确提示。

它不会读取邮件，也不会调用 Gmail 发送接口。

### 2.3 Inbound Webhook

W1 在 API/Composition Root 中创建依赖并注册路由：

```ts
import {
  HmacWebhookSignatureVerifier,
  MessagingWebhookMapper,
  registerMessagingRoutes
} from "./messaging/index.js";

await registerMessagingRoutes(server, {
  verifier: new HmacWebhookSignatureVerifier(webhookSecret),
  mapper: new MessagingWebhookMapper(),
  deduplicator: inboundEventDeduplicator,
  onMessage: async (message) => {
    await intentRouter.handle(message);
  },
  dedupeTtlSeconds: 86_400
});
```

处理顺序固定为：

```text
exact raw body
  -> HMAC 验签
  -> 标准 InboundMessage 映射
  -> eventId 去重 claim
  -> W1 Intent/Application callback
```

重要：真实 Provider 上线前，W1 必须在 Fastify 安装 raw-body capture，使验签使用
请求的原始字节。当前注册函数中的 JSON 重序列化只能用于已确定规范化 JSON 的
本地/Mock 路径，不能作为真实 Photon 签名兼容性的承诺。

重复 `eventId` 返回 `202`，但不会再次执行 `onMessage`。

## 3. 配置建议

Contract v1 已预留：

```text
PHOTON_API_KEY
PHOTON_WEBHOOK_SECRET
PHOTON_LINE_ID
```

由于最终可能不使用 Photon，建议 W1 在配置层映射成内部的：

```text
relayEndpoint
relayApiKey
relayWebhookSecret
relayLineId
```

不要在 Domain、Application 或 Apple Client 暴露供应商配置。

## 4. Gmail 与 iMessage 的职责边界

```text
MailProvider.fetchUnread()
  -> Agent/Handoff 分类
  -> MailProvider.createDraft()
  -> HandoffSummary
  -> MessagingHandoffCompletionSink
  -> MessagingChannel.send()
```

- Gmail Owner 负责新邮件接收、正文规范化及草稿写入。
- W1 负责 Handoff 编排和最终 Composition Root。
- W2 只负责标准消息的收发 Adapter。
- 邮件草稿必须由用户审核；系统不自动发送邮件。
- iMessage 通知失败不得改变 Gmail 草稿的实际状态。

## 5. 降级行为

| 场景 | 行为 |
|---|---|
| Relay 未配置 | 使用 `UnavailableMessagingChannel` 或 No-op Sink |
| Outbound 超时/5xx | `PHOTON_UNAVAILABLE`，fallback=`APP_ONLY` |
| recipient 未绑定 | Completion Sink 不发送，App 内结果仍然可用 |
| Webhook 签名错误 | `401 PHOTON_SIGNATURE_INVALID` |
| Payload 无法映射 | `400 INVALID_REQUEST` |
| 重复 event ID | 返回 `202`，不重复进入 Application |

## 6. W1 合入前检查

1. 只由 W1 修改 `composition.ts`、`bootstrap.ts` 和 API 接线。
2. 未配置 Relay 时 Server 可以正常启动。
3. 真实 webhook 使用 exact raw body 验签。
4. recipient mapping 不使用手机号作为日志字段。
5. 相同 Handoff completion 重试沿用相同 correlation ID。
6. 消息失败时 App 内 Pause Receipt 仍可访问。
7. 不添加“自动发送 Gmail”的路径。

## 7. 验证命令

项目要求 Node 20：

```bash
cd server
corepack pnpm typecheck
corepack pnpm vitest run \
  tests/integration/photon-provider.test.ts \
  tests/integration/photon-handoff-sink.test.ts
corepack pnpm build
```

专项测试覆盖 Provider Contract、幂等 header、取消、失败降级、HMAC 验签、
Inbound 映射/去重，以及 Handoff 摘要到 iMessage 的安全通知。
