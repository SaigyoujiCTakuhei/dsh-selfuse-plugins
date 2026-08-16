# dsh-selfuse-plugins-all

dsh-selfuse-plugins 仓库的聚合插件：一次性安装并挂载该仓库下的全部插件。

## 聚合安装（本地 file:，supply-chain 安全）

本包用 file: 协议引用兄弟插件，属于 pnpm 认可的 local-filesystem 可信源，
因此无需关闭 blockExoticSubdeps：

    dsh plugin --profile web add file:E:/Codes/AI Related/dsh-selfuse-plugins/packages/dsh-selfuse-plugins-all

或者直接把下面这行写进 profile 的 package.json dependencies，再 pnpm install：

    "dsh-selfuse-plugins-all": "file:E:/Codes/AI Related/dsh-selfuse-plugins/packages/dsh-selfuse-plugins-all"

注意：monorepo 必须保持在上述本地路径（或改成你实际的 clone 路径）。

## 单个安装（仍然可用，github 远程）

单个插件作为 profile 的直接依赖使用 git 源是被允许的（blockExoticSubdeps
只限制传递依赖）：

    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-everything-plugin
    dsh plugin --profile web add github:SaigyoujiCTakuhei/dsh-selfuse-plugins#path:packages/dsh-cost-meter-cny

## 当前聚合内容

- dsh-everything-plugin — Everything SDK 即时文件名/目录搜索
- dsh-cost-meter-cny — 峰谷双档 CNY 成本徽章
