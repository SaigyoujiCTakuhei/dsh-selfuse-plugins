# dsh-context-compression-status

在 dsh Web GUI 的会话头部显示一个**上下文压缩状态**徽章，把 dsh 自动/手动压缩（compaction）的隐藏状态直观地暴露出来。

GUI 本身已经能显示上下文上限与当前用量（来自核心 `contextPressure` 投影，即会话头部的用量条），但「有没有被压缩过、压缩了几次」在 GUI 里看不到。本插件补齐这三件事：

| 字段 | 来源 | 说明 |
| --- | --- | --- |
| 上下文上限 | `contextPressure.contextWindow` | 最近一次路由告知的模型上下文窗口 |
| 当前已使用量 | `contextPressure.projectedTokens` | 下一次请求提示词的预估 token 数，压缩后会立刻反映 |
| 是否已被压缩 | `contextCompaction.compressed`（经 HTTP 路由） | 会话日志里是否出现过成功的 `compaction/summary` |
| 压缩几次 | `contextCompaction.compactionCount`（经 HTTP 路由） | 成功压缩次数（`compaction/summary` 计数） |

徽章常驻会话头部：未压缩时显示 `未压缩`，压缩过显示 `🗜 N×`（N 为次数）。鼠标悬停弹出完整明细：压缩状态、上下文上限、当前用量与占用百分比、最近一次压缩缩减的 token 数及所用模型。

## 实现

- host 半（`lib/index.js`）在会话投影接缝上注册一个 `contextCompaction` 投影单元，折叠整个会话日志，统计 `compaction/summary` 事件的次数与最近一次的细节（被遮蔽区间、token 数、provider/model）。
- 该投影键是**自定义**的，而 `dsh-client-connection` 只会把一组固定的核心投影键（如 `contextPressure`）转发到浏览器，自定义键不会下发，所以 client 半无法用 `useProjection("contextCompaction")` 读到它。为此 host 半额外注册一个仅限 loopback 的 HTTP 路由 `/api/dsh-context-compression/status?sessionId=...`，把投影值返回给前端（与 `dsh-archive-panel` 的路由模式一致）。
- client 半（`lib/client.js`）在 `conversation.session.header.utilities` 槽位注册一个徽章：上限/用量读 `useProjection("contextPressure")`（核心键，实时下发）；压缩状态/次数按会话轮询上面的 HTTP 路由（每 3 秒），会话 id 来自 `useSession(s => s.sessionId)`。
- 该 HTTP 路由由 host 半在 `dsh web` 启动时注册，所以**改完代码后必须重启 `dsh web`** 才会生效；client 半按需从源码加载，刷新页面即可。

## 安装

```bash
dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-context-compression-status
```

安装后重启 `dsh web` 并刷新页面。
