# 字宝宝 Zi · micro.blog 静态页插件

把 iOS 应用 [字宝宝](../minimaxi/)（Zi）的第一期核心体验搬到 Web：查一个字，
看超大字、听读音、看笔顺，收进字本子。
以 micro.blog plugin 的形式发布，安装后就是一个静态页面
`https://你的域名/zi/`，同时也是一个可安装、可离线的 PWA。

设计沿用 iOS 版的「暖纸 + 天蓝 + 字宝宝」设计系统（`Theme.swift` 的 token
逐项搬进 CSS 变量）；与 [bigtext](../microblog-bigtext/) 插件同一套发布模式。

## 功能

- `说给我听`：Web Speech API（zh-CN）语音查字，2.2 秒静音自动结束；
  浏览器不支持或拒绝权限时自动隐藏语音入口，文字/拼音输入始终兜底
  （iOS 主屏 PWA 模式下的麦克风可用性需真机验证）
- `画给我看`：手指在田字格画布上写，停笔 600ms 后离线识别——
  移植 iOS `OfflineHandwriteRecognitionService` 的归一化 + 重采样 + 加权打分，
  4.2MB 索引首次使用时才加载（之后由 Service Worker 缓存）；
  没认出来就给"试试拼音输入"金色兜底
- `查一查`：输入汉字或拼音前缀（如 `hua`），候选列表带声调拼音
- `大字详情`：田字格超大字、标调拼音、释义、朗读（Web Speech zh-CN）
- `笔顺演示`：[hanzi-writer](https://hanziwriter.org)（MIT）逐笔播放，
  淡底字轮廓 + 田字格参考线，状态文案与写完的墨点庆祝沿用 iOS 版
- `练一练`：hanzi-writer 描红测验——笔顺**和方向**判定、错两次出天蓝色
  提示、写完整字闪绿 + 墨点庆祝、完成统计小失误次数
- `字本子`：按课程顺序的贴纸货架（刚认识 / 常说常用 / 身边看到 / 继续探索），
  看过的字点亮成贴纸，收藏带 ♥，进度条统计
- `今日一字`、`最近查过`（首页）
- PWA：添加到主屏幕后全屏运行，离线可用（笔顺 JSON 与手写索引按需缓存）
- 拼音一律转成标调形式显示（`sha4ng` → `shàng`，轻声 `men5` → `men`），
  比 iOS 版（去数字）对家长更友好
- `?char=字` 直达详情页（替代 iOS 版的 Siri/快捷指令入口）

相对 iOS 版的取舍：不做触感反馈；练习判定由 hanzi-writer 承担
（比 iOS 自研的 `StrokePracticeService` 多了方向判定与自动提示）；
手写识别输入坐标在打分前先做 y 翻转对齐索引方向
（iOS 版少了这一步，属于待回报上游的已知隐患）。

## 技术栈与目录结构

TypeScript + esbuild + [hanzi-writer](https://github.com/chanind/hanzi-writer)（笔顺动画与测验，MIT），
无其他运行时依赖；构建产物提交进仓库，
micro.blog 从 GitHub 拉取后原样发布 `static/`。

```text
plugin.json          micro.blog 插件清单
scripts/build-data.py
                     从 iOS 仓库（../minimaxi）转换数据：SQLite 查字表、
                     词语/例句/补充/课程 JSON、522 个笔顺 JSON（原样复制）、
                     手写识别索引（首次使用懒加载）
src/
  main.ts            路由分发、?char= 直达、Service Worker 注册
  router.ts          hash 路由（#/、#/book、#/search、#/handwrite、
                     #/detail/字、#/strokes/字、#/practice/字）
  data.ts            数据加载、查字、拼音搜索、标调转换、课程分架
  handwrite.ts       手写识别（OfflineHandwriteRecognitionService 的 TS 移植）
  voice.ts           语音识别状态机（Web Speech API，2.2s 静音自动停）
  library.ts         字本子状态（localStorage，对应 LibraryStore）
  speech.ts          朗读（speechSynthesis zh-CN, rate 0.45）
  types.ts           CharacterInfo / LibraryState / HandwriteCandidate 等
  ui.ts              公共 DOM 小件
  components/
    writer.ts        hanzi-writer 实例工厂（主题色落地、charDataLoader 走本地数据）
    stroke-view.ts   田字格参考线 + 墨点庆祝
    mascot.ts        字宝宝吉祥物 SVG
  screens/           home / search / handwrite / detail / strokes / practice / book
static/zi/           可直接发布的成品（构建产物 + 数据，均已提交）
  index.html / styles.css / app.js / manifest.webmanifest / service-worker.js
  icons/             PWA 图标（取自 iOS App Icon）
  data/              build-data.py 的产物（strokes/ 按字懒加载，
                     handwrite_index.json 进手写屏时才拉取）
```

hanzi-writer 的数据与 iOS 版同源（都来自 Make Me a Hanzi / Arphic 授权），
`charDataLoader` 直接指向本地 `data/strokes/字.json`，离线可用、无 CDN 依赖。

## 本地开发

```sh
npm install
npm run data     # 从 ../minimaxi 重新生成 static/zi/data/
npm run build    # tsc --noEmit + esbuild → static/zi/app.js
npm run serve    # http://localhost:8765/zi/
```

注意：必须通过 `/zi/` 子路径访问，模拟 Micro.blog 部署路径。
改代码用 `npm run watch` 配合 `npm run serve`。

## 发布到 Micro.blog

1. 把本仓库推送到 GitHub（`static/zi/` 是构建产物，随仓库一起提交）。
2. 在 Micro.blog 的 Plug-ins 页面从 GitHub 安装本仓库。
3. 访问 `https://你的域名/zi/` 使用。

所有资源都是相对路径，放在任何子路径下都能工作。
改了代码需要更新时：`npm run build` 后连同产物一起推送，
再到 Micro.blog 里重新拉取插件；如果页面行为没变，
先把浏览器缓存/旧版 Service Worker 注销再试。

改了文件结构记得把 `static/zi/service-worker.js` 的 `CACHE_NAME` 升一位。

## 数据来源与许可

与 iOS 版一致：笔顺数据来自 Make Me a Hanzi（SVG 路径 + 中线点），
查字表为项目自建 SQLite，词语/例句/补充/课程为项目自撰的第一版内容；
HSKHSK 等第三方词表仅作研究参考，未打包。详见 iOS 仓库 README 的 Data Notes。

## 与 iOS 版的关系

iOS 原版见 [minimaxi](../minimaxi/) 仓库（SwiftUI + SQLite.swift）。
本插件是其 Web 移植版，四期功能已全部对齐：

1. ✅ 查字 → 大字详情 → 笔顺演示 → 字本子
2. ✅ 练一练（hanzi-writer 描红测验，替代自研 `StrokePracticeService` 移植）
3. ✅ 画给我看（`OfflineHandwriteRecognitionService` 移植 + 索引懒加载）
4. ✅ 说给我听（Web Speech API，不支持/拒绝权限时文字兜底；
   iOS 主屏 PWA 模式下的真机验证仍是遗留 QA 项）
