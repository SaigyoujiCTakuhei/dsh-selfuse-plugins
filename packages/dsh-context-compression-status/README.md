# dsh-context-compression-status

在 dsh Web GUI 的会话头部显示一个**上下文压缩状态**徽章，把 dsh 自动/手动压缩（compaction）的隐藏状态直观地暴露出来。

GUI 本身已经能显示上下文上限与当前用量（来自核心 `contextPressure` 投影，即会话头部的用量条），但「有没有被压缩过、压缩了几次」在 GUI 里看不到。本插件补齐这三件事：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| 上下文上限 | `contextPressure.contextWindow` | 最近一次路由告知的模型上下文窗口 |
| 当前已使用量 | `contextPressure.projectedTokens` | 下一次请求提示词的预估 token 数，压缩后会立刻反映 |
| 是否已被压缩 | `contextCompaction.compressed` | 会话日志里是否出现过成功的 `compaction/summary` |
| 压缩几次 | `contextCompaction.compactionCount` | 成功压缩次数（`compaction/summary` 计数） |

徽章常驻会话头部：未压缩时显示 `未压缩`，压缩过显示 `🗜 N×`（N 为次数）。鼠标悬停弹出完整明细：压缩状态、上下文上限、当前用量与占用百分比、最近一次压缩缩减的 token 数及所用模型。

## 实现

- host 半（`lib/index.js`）在会话投影接缝上注册一个 `contextCompaction` 投影单元，折叠整个会话日志，统计 `compaction/summary` 事件的次数与最近一次的细节（被遮蔽区间、token 数、provider/model）。
- client 半（`lib/client.js`）在 `conversation.session.header.utilities` 槽位注册一个徽章，读取 `useProjection("contextPressure")` 与 `useProjection("contextCompaction")`。

## 安装

```bash
dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-context-compression-status
```

安装后重启 `dsh web` 并刷新页面。
