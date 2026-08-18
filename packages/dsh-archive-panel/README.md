# dsh-archive-panel

给 DSH Web GUI 加一个「归档」区域：侧边栏底部出现归档入口（带计数角标），点开后列出所有归档会话，可「恢复」、「恢复并打开」或「删除」。

## 结构

- `lib/index.js`（宿主）：注册 loopback-only 的 `POST /api/dsh-archive/unarchive`（恢复）与
  `POST /api/dsh-archive/delete`（彻底删除）路由。
- `lib/client.js`（浏览器）：注册 `sidebar.footer.action` 入口 + 归档列表弹窗。

## 彻底删除做了什么

1. 从 `archivedSessionIds` 移除（等同恢复）；
2. 从所属工作区的 `sessionIds` 账目摘除；
3. 删除 `~/.dsh/sessions/.../<session-id>/` 下的会话日志与本地产物；
4. 清理 workspace 注册表里该会话的缓存引用。

运行中的会话拒绝删除（HTTP 409）。

## 安装

```bash
dsh plugin --profile web add file:/绝对路径/dsh-archive-panel
```

安装后重启 `dsh web` 并刷新页面。
