# dsh-selfuse-plugins

在 dsh 上自用的各种插件仓库。

## 插件列表

- packages/dsh-everything-plugin — 通过 voidtools Everything SDK 做即时文件名/目录搜索（Windows），注册 everything_search 与 everything_status 工具。
- packages/dsh-cost-meter-cny — 实时 CNY 成本徽章（整会话 + 每回合），按北京时间峰谷双档计价，源自 DeepSeek 官方定价页。
- packages/dsh-selfuse-plugins-all — 聚合插件：一次性安装并挂载本仓库全部插件。

## 安装

### 一键安装全部（本地 file:，supply-chain 安全）

聚合包用 file: 协议引用兄弟插件，属于 pnpm 认可的 local-filesystem 可信源，
无需关闭 blockExoticSubdeps（保持默认 supply-chain 策略）：

    dsh plugin --profile web add file:E:/Codes/AI Related/dsh-selfuse-plugins/packages/dsh-selfuse-plugins-all

或写入 profile 的 package.json：

    "dsh-selfuse-plugins-all": "file:E:/Codes/AI Related/dsh-selfuse-plugins/packages/dsh-selfuse-plugins-all"

### 单个安装（仍然可用，github 远程）

单个插件作为 profile 的直接依赖使用 git 源是被允许的（blockExoticSubdeps
只限制传递依赖）：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

安装后重启对应的 web profile 并刷新页面。

## 结构

这是一个 pnpm workspace monorepo：

    packages/
      dsh-everything-plugin/
      dsh-cost-meter-cny/
      dsh-selfuse-plugins-all/
