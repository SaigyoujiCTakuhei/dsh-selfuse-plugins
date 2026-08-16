# dsh-selfuse-plugins

在 dsh 上自用的各种插件仓库。

## 插件列表

- packages/dsh-everything-plugin — 通过 voidtools Everything SDK 做即时文件名/目录搜索（Windows），注册 everything_search 与 everything_status 工具。
- packages/dsh-cost-meter-cny — 实时 CNY 成本徽章（整会话 + 每回合），按北京时间峰谷双档计价，源自 DeepSeek 官方定价页。

## 安装

单个安装（github 远程，作为 profile 直接依赖，不触发 blockExoticSubdeps）：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

一次装齐（dsh plugin add 转发给 pnpm add，支持多包）：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

安装后重启对应的 web profile 并刷新页面。

## 结构

这是一个 pnpm workspace monorepo：

    packages/
      dsh-everything-plugin/
      dsh-cost-meter-cny/
