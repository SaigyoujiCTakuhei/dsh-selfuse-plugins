# dsh-archive-panel

给 DSH Web GUI 加一个「归档」区域：侧边栏底部出现归档入口（带计数角标），点开后列出所有归档会话，可「恢复」、「恢复并打开」、「查看内容」或「删除」。

## 会话列表信息

每个归档会话一行展示：

- **时间**：归档/创建时间（locale 格式 `YYYY-MM-DD HH:mm`）。
- **对话轮次**：会话日志中 `turn/start` 事件计数。
- **大小**：会话数据目录磁盘占用（`B` / `KB` / `MB` / `GB`）。
- **工作区**：所属工作区标题。

## 排序

弹窗顶部有「排序」工具栏：

- **默认（归档顺序 · 倒序）**：新归档的在前、旧的自动下移。核心 `archiveSession` 会把新会话追加到 `archivedSessionIds` 末尾（旧→新），客户端默认按倒序展示，即最新归档置顶。
- **时间**：按会话最近活跃时间（`updatedAt`）排序。
- **名称**：按标题（`displayTitle`）本地化排序。
- **日期**：按会话创建日期（`createdAt`，取自宿主持久化头）排序。
- **正序 / 倒序**：右侧按钮切换升降序（正序 ↑ / 倒序 ↓）。

排序偏好会持久化在浏览器 `localStorage`（键 `dsh-archive-panel:sort`），关闭弹窗或刷新页面后再次打开仍保持上次的排序键与方向。

## 搜索与筛选

- **搜索**：顶部搜索框按标题或工作区实时过滤。
- **筛选**：按工作区下拉过滤（「全部工作区」或具体工作区）。
- 搜索与筛选先于排序生效，三者可组合。

## 查看内容

每行「查看内容」按钮打开预览弹窗，从 `session.jsonl.zstd` 解压并抽取用户/助手消息卡片（自动剥离 `<system-reminder>` 与 `Current runtime context.` 运行期上下文，仅显示最近 50 / 共 N 条），便于在不恢复会话的情况下回顾归档内容。

## 全部删除

弹窗「全部删除」按钮（带二次 `confirm` 确认）会彻底删除所有归档会话（磁盘文件 + 注册表引用一并移除，不可恢复）。

## 结构

- `lib/index.js`（宿主）：注册 loopback-only 的
  `POST /api/dsh-archive/unarchive`（恢复）、`POST /api/dsh-archive/delete`（彻底删除）、
  `GET /api/dsh-archive/meta`（返回各归档会话的 `createdAt` / `turns` / `dataSize`）、
  `GET /api/dsh-archive/detail`（解压日志抽取对话内容）与
  `POST /api/dsh-archive/delete-all`（清空所有归档）路由。
- `lib/client.js`（浏览器）：注册 `sidebar.footer.action` 入口 + 归档列表弹窗（含排序工具栏、搜索/筛选、查看内容预览、全部删除）。

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
