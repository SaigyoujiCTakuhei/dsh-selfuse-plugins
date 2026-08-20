# dsh-selfuse-plugins

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）上自用的插件仓库，采用 pnpm workspace monorepo 组织。

## 目录

- [是什么](#是什么)
- [插件列表](#插件列表)
- [快速开始](#快速开始)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [许可证](#许可证)

## 是什么

这个仓库收集我在 dsh 上自用的插件。所有插件都走官方 profile 机制挂载到 `dsh web`，不改 dsh 源码；可以逐个安装，也可以一条命令装齐。插件的安装 / 检查更新 / 卸载由官方 `@linxin666/dsh-client-ui-plugin-manager`（设置 › 插件的 Plugin manager 标签页）负责，本仓库只提供下面的功能型插件。

| 插件 | 作用 |
| --- | --- |
| dsh-everything-plugin | 全盘索引级文件名/文件夹即时搜索（Windows） |
| dsh-cost-meter-cny | 峰谷双档 ¥ 成本徽章（整会话 + 每回合） |
| dsh-archive-panel | 侧边栏归档面板：列出已归档会话并可一键恢复 |
| dsh-context-compression-status | 会话头部上下文压缩状态徽章（上限 / 用量 / 是否压缩 / 次数） |

## 插件列表

### dsh-everything-plugin

通过 [voidtools Everything](https://www.voidtools.com/) 官方 SDK 做全盘索引级即时搜索，只依赖运行中的 Everything 进程和随包打包的 SDK DLL，不需要 HTTP 服务器或 es.exe。注册两个工具：

- `everything_search` — 按文件名/目录即时搜索，返回完整路径、大小、修改时间。
- `everything_status` — 探测 SDK 是否加载、版本、数据库是否就绪。

详情见 [packages/dsh-everything-plugin/README.md](packages/dsh-everything-plugin/README.md)。

### dsh-cost-meter-cny

实时 CNY 成本徽章，按北京时间峰谷双档计价（对应 DeepSeek 官方 2026-08-17 生效的峰谷定价）：

- host 半注册 `sessionCostCny` 投影，按事件自身时间戳（`event.time`）判定高峰/空闲，纯函数 fold，checkpoint 重放不漂移。
- client 半在会话头部和每条助手消息尾部渲染 `¥` 徽章，hover 显示 input/output/cache-read/cache-write 明细和当前档位。

详情见 [packages/dsh-cost-meter-cny/README.md](packages/dsh-cost-meter-cny/README.md)。

### dsh-archive-panel

Web GUI 侧边栏的归档面板：列出已归档会话并支持一键恢复（unarchive）。

- host 半注册一个仅限 loopback 的 HTTP 路由 `/api/dsh-archive/unarchive`，幂等地把会话从工作区注册表的归档集合中移除（恢复）；通过注册表自身的序列化写路径保持一致，事件会自然推送到浏览器。
- client 半在侧边栏底部注入「归档」入口，弹窗列出已归档会话（标题 + 所属工作区），支持「仅恢复」或「恢复并打开」。

详情见 [packages/dsh-archive-panel/README.md](packages/dsh-archive-panel/README.md)。

### dsh-context-compression-status

Web GUI 会话头部的上下文压缩状态徽章：把 dsh 自动/手动压缩（compaction）的隐藏状态直观暴露出来。

- host 半在会话投影接缝注册 `contextCompaction` 单元，折叠日志统计成功的 `compaction/summary` 次数与最近一次细节。
- client 半在 `conversation.session.header.utilities` 槽位注册徽章，读取核心 `contextPressure` 投影（上下文上限与当前用量）与 `contextCompaction` 投影（是否压缩、压缩几次），hover 显示完整明细。

详情见 [packages/dsh-context-compression-status/README.md](packages/dsh-context-compression-status/README.md)。

## 快速开始

前置条件：官方 `dsh` CLI、`pnpm`；其中 `dsh-everything-plugin` 仅支持 Windows，且需要本机正在运行 voidtools Everything。

单个安装：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-archive-panel
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-context-compression-status

一次装齐（`dsh plugin add` 转发给 `pnpm add`，支持多包）：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-archive-panel github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-context-compression-status

更新到最新：

    dsh plugin --profile web update dsh-everything-plugin dsh-cost-meter-cny dsh-archive-panel dsh-context-compression-status

卸载：

    dsh plugin --profile web remove dsh-everything-plugin

安装后重启 `dsh web` 并刷新页面。

## 目录结构

    packages/
      dsh-everything-plugin/    # Everything 搜索
      dsh-cost-meter-cny/       # 峰谷双档成本徽章
      dsh-archive-panel/        # 归档面板
      dsh-context-compression-status/  # 上下文压缩状态徽章

每个子包都是独立的 dsh 插件包（`dsh.bundle` + 可选 `dsh.client`），通过 `#path:` 语法从本仓库单独引用。

## 常见问题

**装齐或更新后为什么不生效？**

插件的 host 半和 client 半都在 `dsh web` 启动时读取/扫描，改动依赖后必须重启并刷新页面。

**github 依赖和 supply-chain 限制的关系？**

两个插件作为 profile 的直接依赖使用 git 源是允许的——pnpm 的 `blockExoticSubdeps` 只限制传递依赖。不要把 git 源插件塞进另一个插件的 `dependencies` 里当传递依赖，否则会被 `ERR_PNPM_EXOTIC_SUBDEP` 拦截。

**更新后没变化？**

`github:...#path:...` 是浮动 spec，`pnpm update` 会重新解析到最新 commit；确认已 update 且重启了 `dsh web`。

## 许可证

[MIT](LICENSE)
