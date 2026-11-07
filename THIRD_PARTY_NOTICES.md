# 第三方归属

本项目源码与剧本文本采用 MIT；下列第三方组件保持各自许可，完整原文位于 `licenses/`。本说明不会将第三方组件改为项目 MIT 许可。

## Fusion Pixel Font 2026.10.25

游戏输入字体为 **Fusion Pixel 12px Prop zh-Hans Regular**，作者 TakWolf。项目中的 `proto/fonts/fusion-pixel-12px.woff2` 与[官方 2026.10.25 发布包](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25)内 `fusion-pixel-12px-proportional-zh_hans.otf.woff2` 逐字节一致。构建时使用 fontTools 做字符子集，产物名为 `guanjia-pixel.woff2`。

Copyright (c) 2022, TakWolf (https://takwolf.com).

字体采用 SIL Open Font License 1.1。按这一个实际发布包完整保留以下四份声明；这些文件不仅是链接，均随仓库提供原文：

| 文件 | 归属内容 |
| --- | --- |
| [OFL.txt](licenses/fusion-pixel/OFL.txt) | Fusion Pixel Font，TakWolf |
| [Ark Pixel OFL](licenses/fusion-pixel/LICENSES/ark-pixel/OFL.txt) | Ark Pixel Font，TakWolf |
| [Cubic 11 notices](licenses/fusion-pixel/LICENSES/cubic-11/OFL.txt) | Cubic 11 及该文件所列上游字体、作者和各自声明；保留整份原文 |
| [Galmuri license](licenses/fusion-pixel/LICENSES/galmuri/LICENSE.txt) | Galmuri，Lee Minseo |

实际发布包只附上述三个上游目录；没有把上游其他尺寸字体的依赖误列为本项目所用 12px 字体。输入与子集字体分发时都应保留这四份文件。字体不能因子集化而改授 MIT。完整校验依据见 [font-verification.json](font-verification.json)。

## npm 构建与测试依赖

`package.json` 没有生产 npm 依赖；开发、测试、构建使用以下锁定组件。Vite 生成的运行辅助代码也保持其适用许可。`package-lock.json` 锁定实际安装版本；[dependency-licenses.json](dependency-licenses.json)列出全部 96 个锁文件包条目（含可选平台包）。仓库不分发 `node_modules`。

| 组件 | 锁定版本 | 许可 |
| --- | --- | --- |
| TypeScript | 5.9.3 | Apache-2.0；附其 ThirdPartyNoticeText |
| Vite | 6.4.5 | MIT；附其完整 bundled licenses |
| tsx | 4.23.15 | MIT |
| yaml | 2.9.1 | ISC |
| @types/node / @types/estree | 22.20.5 / 1.0.10 | MIT |
| esbuild（含对应平台包） | 0.28.2、0.25.12 | MIT |
| Rollup（含对应平台包） | 4.67.5 | MIT；附其完整声明 |
| fdir / fsevents | 6.5.0 / 2.3.3 | MIT |
| nanoid / picomatch / postcss | 3.3.20 / 4.0.7 / 8.5.32 | MIT |
| tinyglobby / undici-types | 0.2.17 / 6.21.0 | MIT |
| picocolors | 1.1.1 | ISC |
| source-map-js | 1.2.2 | BSD-3-Clause |

原始许可证及附加声明按包与版本保存在 `licenses/npm/`。平台专用 esbuild/Rollup 包归属分别随其主包声明保留；完整原文中还包含相关组件自己的归属，不以表中的简写替代。

Python 构建工具由使用者从依赖配置另行安装，仓库和游戏页面不捆绑这些工具：fontTools 4.58.5（MIT）与 Brotli 1.1.0（MIT）。安装包自带各自完整声明。它们处理输出字体并不会改变该字体的 OFL 许可。

## Third-party notices (English)

The project code and story text use MIT. Third-party components retain their own licenses, with original notices supplied in `licenses/`; they are not relicensed under the project's MIT License.

### Font

The input font is **Fusion Pixel 12px Prop zh-Hans Regular**, by TakWolf, version **2026.10.25**. `proto/fonts/fusion-pixel-12px.woff2` is byte-identical to `fusion-pixel-12px-proportional-zh_hans.otf.woff2` in the [official release](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25). fontTools subsets it during the build to produce `guanjia-pixel.woff2`.

Copyright (c) 2022, TakWolf (https://takwolf.com).

Fusion Pixel is licensed under SIL Open Font License 1.1. The following four original notices from that exact release are included and should accompany both the input font and distributed subsets:

- [Fusion Pixel OFL](licenses/fusion-pixel/OFL.txt): TakWolf.
- [Ark Pixel OFL](licenses/fusion-pixel/LICENSES/ark-pixel/OFL.txt): TakWolf.
- [Cubic 11 notices](licenses/fusion-pixel/LICENSES/cubic-11/OFL.txt): Cubic 11 and all upstream authors, fonts, and terms recorded in that complete file.
- [Galmuri license](licenses/fusion-pixel/LICENSES/galmuri/LICENSE.txt): Lee Minseo.

These are the three upstream notice directories included in the actual 12px release package. Dependencies exclusive to other font sizes are not attributed to this input. Subsetting does not convert the font license to MIT. Verification details are in [font-verification.json](font-verification.json).

### Build and test dependencies

`package.json` declares no production npm dependencies. Build, development, and test dependencies retain their licenses; any runtime helper code emitted by Vite also retains its applicable license. The version/license table above lists the locked components. [dependency-licenses.json](dependency-licenses.json) contains all 96 lockfile package entries, including optional platform packages. `node_modules` is not distributed in the repository.

Original licenses and additional notices are in `licenses/npm/`, organized by package and version. TypeScript's Apache-2.0 license and ThirdPartyNoticeText, Vite's MIT license and bundled notices, and Rollup's complete notices are retained. esbuild/Rollup platform-package attribution is retained with the respective main-package notices. Other licenses are MIT, ISC, or BSD-3-Clause as specified in the table and inventory. The abbreviated table does not replace the original terms or upstream attributions.

Users install Python build tools separately from the dependency configuration: fontTools 4.58.5 (MIT) and Brotli 1.1.0 (MIT). They are not bundled with the repository or game site; their installation packages supply their own full notices. Processing a font with these tools does not alter its OFL license.
