from pathlib import Path
from fontTools.ttLib import TTFont
import json
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'docs/剧本/节点网设计.json').read_text())
text=(root/'src/generated/font-text.txt').read_text()
chars={c for c in text if '\u3400'<=c<='\u9fff' or '\U00020000'<=c<='\U0002ffff'}
fonts=[]
for path in ['proto/fonts/fusion-pixel-12px.woff2','src/public/fonts/guanjia-pixel.woff2']:
 cmap=TTFont(root/path).getBestCmap()
 fonts.append(dict(file=path,glyphs=len(cmap),requiredHan=len(chars),missing=''.join(sorted(c for c in chars if ord(c)not in cmap))))
report=dict(version=source['version'],scope='完整源JSON、适配演出及全部运行UI；正文/选项/变体/自动反应/终局/史臣曰/隐藏均参与子集；Han码点覆盖，不替代逐屏排版检查',fonts=fonts)
(root/('docs/开发/'+('v4' if source['version'].startswith('forward-v4.') else 'v3.2')+'字库覆盖.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2))
if any(row['missing']for row in fonts):raise SystemExit('字体缺字：'+json.dumps(fonts,ensure_ascii=False))
print('字体源与发布子集覆盖全部'+str(len(chars))+'个所需汉字')
