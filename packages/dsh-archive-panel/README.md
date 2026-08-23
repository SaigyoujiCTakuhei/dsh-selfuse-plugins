# dsh-archive-panel

给 DSH Web GUI 加一个「归档」区域：侧边栏底部出现归档入口（带计数角标），点开后列出所有归档会话，可「恢复」、「恢复并打开」或「删除」。

## 排序

弹窗顶部有「排序」工具栏：

- **默认（归档顺序 · 倒序）**：新归档的在前、旧的自动下移。核心 `archiveSession` 会把新会话追加到 `archivedSessionIds` 末尾（旧→新），客户端默认按倒序展示，即最新归档置顶。
- **时间**：按会话最近活跃时间（`updatedAt`）排序。
- **名称**：按标题（`displayTitle`）本地化排序。
- **日期**：按会话创建日期（`createdAt`，取自宿主持久化头）排序。
- **正序 / 倒序**：右侧按钮切换升降序（正序 ↑ / 倒序 ↓）。

排序偏好会持久化在浏览器 `localStorage`（键 `dsh-archive-panel:sort`），关闭弹窗或刷新页面后再次打开仍保持上次的排序键与方向。

## 结构

- `lib/index.js`（宿主）：注册 loopback-only 的 `POST /api/dsh-archive/unarchive`（恢复）、
  `POST /api/dsh-archive/delete`（彻底删除）与 `GET /api/dsh-archive/meta`（返回各归档会话的
  `createdAt`，供「日期」排序使用）路由。
- `lib/client.js`（浏览器）：注册 `sidebar.footer.action` 入口 + 归档列表弹窗（含排序工具栏）。

## 彻底删除做了什么

1. 从 `archivedSessionIds` 移除（等同恢复）；
2. 从所属工作区的 `sessionIds` 账目摘除；
3. 删除 `~/.dsh/sessions/.../<session-id>/` 下的会话日志与本地产物；
4. 清理 workspace 注册表里该会话的缓存引用。

运行中的会话拒绝删除（HTTP 409）。

## 安装

```bash
dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-archive-panel
```

安装后重启 `dsh web` 并刷新页面。
