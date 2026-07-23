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
- [ ] MailProvider / MessagingChannel 端口。
- [ ] Handoff Job 内存仓库与幂等端口。

W2：

- [ ] Photon spike。
- [ ] ConsoleChannel。
- [ ] Gmail OAuth / provider spike。
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
