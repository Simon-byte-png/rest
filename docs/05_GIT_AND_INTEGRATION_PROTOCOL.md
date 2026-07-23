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
