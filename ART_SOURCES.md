# 美术与声音来源

本游戏采用 AI 生成、项目内参考复用、本地像素处理和程序绘制组合制作视觉资源。素材使用范围见 [ASSET_LICENSE.md](ASSET_LICENSE.md)，代码与剧本文本范围见 [LICENSE_SCOPE.md](LICENSE_SCOPE.md)。

| 范围 | 已记录的制作方式 | 参考与归属边界 |
| --- | --- | --- |
| 首批场景、人物及换装 | 客户端内置 image_gen 生成基础关键帧；本地缩放、锁色板量化、清理像素；局部表情和环境动画由程序处理 | 换装使用项目内对应人物图作身份参考，并非每项都是独立生成 |
| 后续人物、图鉴与色板版本 | 基于已有源图裁切、人物局部修复、肖像派生、色板替换与导出 | 多个资源项可能共享一张源图；不将派生项表述为新增独立作品 |
| v3 新增场景和现代沈青肖像 | 内置 image_gen 静帧生成，本地裁切/缩放/调色板量化和导出 | 使用项目既有场景或人物作风格、身份参考；这一批制作记录未使用外部图库素材 |
| 既有剧情动画与传位片段 | 记录包含原生动画来源、时间表、裁切、缩放、调色板转换、拼接和编码 | 本说明不据文件名推断确切生成模型或模型版本 |
| 像素界面 | 确定性程序绘制、文字栅格化和像素处理 | 使用的 Fusion Pixel 字体及上游归属另见第三方声明 |

早期本地来源清单记录了 1091 个 manifest 资源项（1066 个保留项及 v3 新增 25 项）；该数值是历史快照，不是最终 v4 发布资源数量。最终资源文件列表及校验值以同次发布的 `assets/manifest.json` 和公开发布资源清单为准。旧清单中的 `source_model_sha256` 指剧本内容哈希，不表示图片模型版本。已有制作记录未完整记录的模型、供应方或独立作者不作补写。

音乐和音效通过浏览器 Web Audio 实时合成：`src/music.ts` 根据 `src/music-cues.json` 中五组音符与节奏参数产生振荡器、噪声激励拨弦及鼓声；没有随这套音频实现引入外部录音、音色采样包或在线音乐文件。此处确认的是源代码的实现与输入范围，不宣称已对所有旋律做独创性鉴定。合成代码与参数按项目 MIT 许可提供。

公开说明只保留与分发相关的来源事实，不包含本地机器路径、生成账户、私有任务地址或内部聊天。制作原图、提示词和制作过程日志不属于默认运行资源；本说明不要求将这些私人制作材料一并公开。

## Art and audio provenance (English)

Visuals combine AI generation, references reused within the project, local pixel processing, and procedural drawing. Asset permissions are in [ASSET_LICENSE.md](ASSET_LICENSE.md); code and story licensing is in [LICENSE_SCOPE.md](LICENSE_SCOPE.md).

| Material | Recorded production and reference use |
| --- | --- |
| Initial scenes, characters, and costumes | Built-in client image_gen keyframes, followed by local resizing, fixed-palette quantization, and pixel cleanup. Costume variants use project character images as identity references. Local expressions and environmental animation are processed in code. |
| Later portraits, albums, and palette variants | Cropping, localized portrait repairs, derivatives, palette substitution, and export from existing source images. Multiple entries can share a source; derivatives are not counted as independently generated works. |
| v3 additions and modern Shen Qing portraits | Built-in image_gen stills with local crop/resize/quantization/export. Existing project scenes or characters provide style or identity references. Records for this batch state no external stock imagery was used. |
| Existing story animation and succession clips | Recorded animation sources and timing, crop, resize, palette conversion, assembly, and encoding. File names do not establish an exact generating model or model version. |
| Pixel interface | Deterministic drawing, text rasterization, and pixel processing. Fusion Pixel and upstream font attribution is retained separately. |

An earlier provenance snapshot recorded 1,091 manifest entries: 1,066 retained entries and 25 v3 additions. This is a historical count, not the final v4 release count. The final file inventory and checksums are defined by the same release's `assets/manifest.json` and public release asset inventory. The older `source_model_sha256` field identifies story-content data, not an image model version. Missing model, provider, or individual-author details are not inferred.

Music and sound effects are synthesized in the browser with Web Audio. `src/music.ts` uses five sets of notes and rhythm parameters in `src/music-cues.json` to generate oscillators, noise-excited plucked strings, and percussion. This implementation introduces no external recordings, sample libraries, or online music files. This describes the implementation and its inputs; it is not a determination that every melody is independently original. The synthesis code and parameters are provided under the project MIT License.

Public provenance records retain distribution-relevant facts without local machine paths, generation accounts, private task URLs, or internal conversations. Original generation images, prompts, and production logs are not default runtime assets and are not required to be published by this notice.
