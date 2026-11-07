import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('dist/.vite/manifest.json','utf8'));const entry=Object.values(manifest).find(x=>x.isEntry);const files=[...new Set([entry.file,...(entry.css||[]),...readdirSync('dist/assets').filter(p=>p.endsWith('.woff2')).map(p=>'assets/'+p)])];
// Initial HTML+all entry JS/CSS/fonts+title image. All other art is scene-lazy.
const m=JSON.parse(readFileSync('src/generated/assets.json','utf8'));const initialIds=['end.21_jingkang','icon.guan','icon.bing','icon.min','icon.qian','icon.shen','map.flag_jin','map.flag_song'];const initialFiles=[...new Set(initialIds.map(id=>m[id]?.file).filter(Boolean))];
const bytes=statSync('dist/index.html').size+files.reduce((n,p)=>n+statSync('dist/'+p).size,0)+initialFiles.reduce((n,p)=>n+statSync('dist/assets/'+p).size,0);
const text=`\n首屏静态上界（HTML+入口代码/CSS/字体（剧情代码点击后加载）+标题及五方地图素材，未压缩）：${bytes} bytes / 409600 bytes。${bytes<=409600?'通过':'未通过'}。运行时真实请求见验收记录。\n`;
writeFileSync('docs/开发/首屏预算.md',text);console.log(text);if(bytes>409600)process.exit(1);
