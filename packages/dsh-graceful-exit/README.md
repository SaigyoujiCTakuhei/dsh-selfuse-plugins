# dsh-graceful-exit

dsh 自用插件：**优雅退出**。在 web UI **右下角**放一个常驻浮动按钮「⏻ 退出」（不随会话头拥挤，无会话时也在），点击后以与终端 `Ctrl+C` 完全等价的方式关闭 dsh 进程。

按钮挂在应用级槽位 `shell.overlay`（frame 级浮动层，在所有栏之上、滚动容器之外；层本身点击穿透，只有按钮本体可点），用 `position:fixed; right:16px; bottom:16px` 钉在视口右下角。

## 原理

dsh 的 profile 启动器自己注册了 `process.on("SIGINT", () => interrupt(130))`（abort + 逐层 dispose 应用 fiber + 退出码 130）。本插件做的事就是把这条既有的优雅退出路径暴露给网页：

1. 浏览器端按钮 `POST /api/dsh-graceful-exit/shutdown`（仅此一条路由）。
2. 宿主端校验请求来自 127.0.0.1 本机回环（跨站 / 非回环一律 403；非 POST 一律 405），先写回 `{ok:true}` 应答。
3. 150ms 后（留出应答冲刷时间）对本进程 `process.kill(process.pid, "SIGINT")` —— 与在终端按 Ctrl+C 走的是**同一个信号处理器、同一个退出码**。

POST-only 是刻意的：GET 一次链接预取就能杀掉 dsh，不可接受。

## 按钮

点击「⏻ 退出」弹出浏览器原生确认弹窗（与 New_Architecture_v00 dashboard 的退出模块同一交互）：

- 弹窗文案：**「确定要优雅退出 dsh 吗？（等价于终端 Ctrl+C，成功后本页显示告别屏）」**，取消则什么都不发生。
- 确认后按钮显示「正在退出…」，进程随即优雅退出（会话已持久化）。
- 请求失败（如服务已停）：按钮变红显示「退出失败」，4 秒后复原。

## 退出后的标签页行为

退出应答返回后，客户端会：

1. 尝试一次 `window.close()`。浏览器安全规则是 **JS 只能关闭由脚本开出来的标签页**（`window.open` / `target="_blank"`）——自己输入网址或书签打开的标签页一律关不掉，调用会被静默忽略。
2. 关不掉则整页接管，显示全屏告别页：「⏻ dsh 已优雅退出 / 服务已停止，此标签页可以关闭了 / 重新使用请到终端运行 dsh web」，避免页面滞留在断线重连的破碎状态。

即"关闭标签页"是尽力而为：脚本开的标签页直接关；用户开的标签页得到一个干净的告别页。

退出后需要重新启动 dsh（在终端重新 `dsh web`），与 Ctrl+C 后的行为一致。

## 手动验证

```sh
curl -X POST http://127.0.0.1:3080/api/dsh-graceful-exit/shutdown
# {"ok":true,"pid":<pid>,"signal":"SIGINT"} —— 随后 dsh 优雅退出
```

## 安装

```bash
dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-graceful-exit
```

安装后重启 `dsh web` 并刷新页面。

> 开发者本机软链方式（改 `lib/` 即源码，重启 `dsh web` 或 `/reload dsh-graceful-exit` 生效）：在 `~/.dsh/profiles/web/package.json` 的 `dependencies` 加 `"dsh-graceful-exit": "link:<本仓库>/packages/dsh-graceful-exit"`，并把 `"dsh-graceful-exit"` 加入 `dsh.profile.bundles`，然后 `dsh plugin --profile web install`。
