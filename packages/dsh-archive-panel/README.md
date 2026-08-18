# dsh-archive-panel

给 DSH Web GUI 加一个「归档」区域：侧边栏底部出现归档入口（带计数角标），点开后列出所有归档会话，可「恢复」或「恢复并打开」。

## 结构

- `lib/index.js`（宿主）：注册 loopback-only 的 `POST /api/dsh-archive/unarchive` 路由，
  把会话从 workspace 域的 `archivedSessionIds` 移除。
- `lib/client.js`（浏览器）：注册 `sidebar.footer.action` 入口 + 归档列表弹窗。

## 安装

```bash
dsh plugin --profile web add file:/绝对路径/dsh-archive-panel
```

安装后重启 `dsh web` 并刷新页面。

## 说明

- 归档数据本身（`archivedSessionIds`）前端本就同步得到，本插件只补「查看 + 恢复」入口。
- 「恢复」走宿主写路径并自动触发 `host/archived-sessions-changed`，前端列表即时更新，
  无需手动刷新。
