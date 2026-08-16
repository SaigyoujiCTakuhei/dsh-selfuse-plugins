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

这个仓库收集我在 dsh 上自用的插件。所有插件都走官方 profile 机制挂载到 `dsh web`，不改 dsh 源码；可以逐个安装，也可以一条命令装齐。

| 插件 | 作用 |
| --- | --- |
| dsh-everything-plugin | 全盘索引级文件名/文件夹即时搜索（Windows） |
| dsh-cost-meter-cny | 峰谷双档 ¥ 成本徽章（整会话 + 每回合） |

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

## 快速开始

前置条件：Windows（Everything 插件需要 Everything 正在运行）、官方 `dsh` CLI、`pnpm`。

单个安装：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

一次装齐（`dsh plugin add` 转发给 `pnpm add`，支持多包）：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

更新到最新：

    dsh plugin --profile web update dsh-everything-plugin dsh-cost-meter-cny

卸载：

    dsh plugin --profile web remove dsh-everything-plugin

安装后重启 `dsh web` 并刷新页面。

## 目录结构

    packages/
      dsh-everything-plugin/    # Everything 搜索
      dsh-cost-meter-cny/       # 峰谷双档成本徽章

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
