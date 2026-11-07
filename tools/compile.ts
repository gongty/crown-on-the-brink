import {existsSync,readFileSync,writeFileSync as writeRaw,renameSync,mkdirSync,readdirSync,cpSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {parse} from 'yaml';
import {execFileSync} from 'node:child_process';
import {validate} from './validate';
import {simulate} from './simulate';
import {reportView} from './report-view';
import {discover,loadContent} from './content';
import {attachRehearsals} from './rehearsals';
import {reportConfirmedArt} from './art-handoff';
import {attachContractPreview} from './contract-preview';
import {adaptNetwork} from './network';
import {writeFasterGif} from './gif-playback';
import {replayNetwork} from './network-regression';
import {campaign} from './campaign';
import type {Story} from '../src/schema';
const writeFileSync=(path:string,text:string)=>{const temporary=path+'.tmp';writeRaw(temporary,text);renameSync(temporary,path);};
const root=resolve(import.meta.dirname,'..');process.chdir(root);
const walk=(p:string):string[]=>existsSync(p)?readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]):[];
mkdirSync('src/generated',{recursive:true});mkdirSync('src/public/data',{recursive:true});mkdirSync('src/public/assets',{recursive:true});mkdirSync('docs/开发',{recursive:true});
let networkVersion='';let overlayDraft=false;let official:string[]=[],files:string[]=[],fatal='',sources:Record<string,string>={};
let d:Story={version:1,entry:'',variables:[],people:[],scenes:[],endings:[],history:[],rules:undefined!};
try{
 official=discover(root);if(process.env.GUANJIA_ARCHIVE!=='1'){const adapted=adaptNetwork(root);d=adapted.story;networkVersion=adapted.source.version;writeFileSync('src/public/data/network-source.json',JSON.stringify(adapted.source));writeFileSync('docs/开发/'+(networkVersion.startsWith('forward-v4.')?'v4':'v3.2')+'字段映射.json',JSON.stringify({version:networkVersion,sourceHash:adapted.hash,source:'docs/剧本/节点网设计.json',rawSidecar:'data/network-source.json',rootFields:Object.keys(adapted.source),nodeFields:[...new Set(adapted.source.nodes.flatMap(n=>Object.keys(n)))],choiceFields:[...new Set(adapted.source.nodes.flatMap(n=>n.choices.flatMap(c=>Object.keys(c))))],presentation:{variants:adapted.source.nodes.reduce((n,s)=>n+(s.variants?.length||0),0),beats:adapted.source.nodes.reduce((n,s)=>n+(s.beats?.length||0),0),reaction:adapted.source.nodes.flatMap(s=>s.choices).filter(c=>c.reaction).length,hazard:adapted.source.nodes.filter(s=>s.hazard).length,shots_outline:adapted.source.nodes.filter(s=>s.shots_outline?.length).length,epilogues:d.epilogues?.length,chronicle_entries:d.chronicle?.length}},null,2));files=['docs/剧本/节点网设计.json'];sources=Object.fromEntries([...d.scenes,...d.endings].map(n=>[n.id,files[0]+'#'+n.id]));}else{
 const index=existsSync('content/index.yaml')?parse(readFileSync('content/index.yaml','utf8')):undefined;
 if(index?.base!==undefined&&index.base!=='campaign-preview')throw Error('index.base仅支持campaign-preview');overlayDraft=index?.base==='campaign-preview';
 const preview=()=>{const base=loadContent(['src/sample.yaml']).story;const draft=campaign(root,base);const meta=draft.meta;attachRehearsals(draft,root);draft.meta={...meta!,revision:'runtime-v0.4+legacy-v0.3',rehearsals:draft.meta?.rehearsals};attachContractPreview(draft,root);return draft;};
 files=official.length?official:['src/sample.yaml'];
 if(official.length){({story:d,sources}=loadContent(files,overlayDraft?preview():undefined));d.meta??={id:'guanjia',name:'开局就亡国',mode:'official'};if(overlayDraft)d.meta={...d.meta!,mode:'preview',label:'三幕连续版｜编剧增量接入中'};}
 else {d=preview();const extras=walk('src/preview').filter(p=>/\.ya?ml$/.test(p)&&!p.includes('.draft.'));if(extras.length){files.push(...extras);({story:d,sources}=loadContent(extras,d));}}
 }for(const scene of d.scenes)sources['scenes:'+scene.id]??=scene.source||'tools/campaign.ts';
}catch(e){fatal=String(e);}
const manifest=JSON.parse(readFileSync('assets/manifest.json','utf8'));
if(d.rules?.network?.flow!=='forward')reportConfirmedArt(root,d,manifest);
const ids=new Set<string>(manifest.entries.map((e:any)=>e.id));
let issues;try{issues=fatal?[{code:'yaml',path:'root',message:fatal,severity:'error'}]:validate(d,ids);}catch(e){issues=[{code:'schema',path:'root',message:String(e),severity:'error'}];}
if(!networkVersion&&(!official.length||overlayDraft))issues=issues.map(i=>i.code==='length'&&i.path.startsWith('rehearsal.')?{...i,severity:'warning'}:i);
const missingFiles=manifest.entries.filter((e:any)=>e.file&&!existsSync(join('assets',e.file))).map((e:any)=>e.id);
const networkWitnesses=networkVersion?replayNetwork(root,d):[];for(const witness of networkWitnesses)if(!witness.passed)issues.push({code:'network-witness',path:witness.target,severity:'error',message:witness.error||'见证不符'});
let blocked=issues.some(i=>i.severity==='error');const bots=blocked?[]:simulate(d);if(bots.some(b=>b.errors.length)){issues.push({code:'bot-runtime',path:'bots',severity:'error',message:'整局模拟出现运行错误，保留上一可玩包'});blocked=true;}
const contractBots=blocked||!d.scenes.some(s=>s.id==='contract.start')?[]:simulate({...d,entry:'contract.start'},100);if(contractBots.some(b=>b.errors.length)){issues.push({code:'contract-bot',path:'contract',severity:'error',message:'新合同验证稿整局模拟有运行错误'});blocked=true;}
if(!blocked)reportView(d,bots);
const reached=new Set([...bots,...contractBots].flatMap(b=>[...Object.keys(b.distribution),...Object.keys(b.eventRuns)]));
const report={networkVersion,networkWitnesses,adaptationSources:!networkVersion&&(!official.length||overlayDraft)?Object.fromEntries(['主线大纲.md','人物卡.md','终局与事件迁移.json','灰盒张力表.md','失位之后的故事线.md'].map(p=>'docs/剧本/归档/节点网重构前-20261106/'+p).map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])):{},sources,createdAt:new Date().toISOString(),mode:networkVersion?'单向完整版正式节点稿接入':official.length&&!overlayDraft?'正式内容':'归档预览',files,issues,missingFiles,endings:d.endings.map(e=>({id:e.id,kind:e.kind||'terminal',ending_scope:e.ending_scope,valence:e.valence,botReached:reached.has(e.id),status:reached.has(e.id)?'已有种子见证':'未证明；不等于不可达'})),bots,contractBots};
writeFileSync('docs/开发/构建报告.json',JSON.stringify(report,null,2));
const scope={byScope:Object.fromEntries(['main','hidden','personal','branch'].map(scope=>[scope,d.endings.filter(e=>e.ending_scope===scope).map(e=>e.id)])),validation:d.endings.filter(e=>e.id.startsWith('contract.')).map(e=>({id:e.id,kind:e.kind})),terminal:d.endings.filter(e=>!['milestone','event','stage'].includes(e.kind||'')).map(e=>e.id),events:d.endings.filter(e=>['milestone','event','stage'].includes(e.kind||'')).map(e=>e.id),character:d.scenes.filter(s=>s.type==='closure').map(s=>s.id),rehearsals:d.meta?.rehearsals||[]};
writeFileSync('docs/开发/剧情覆盖分类.json',JSON.stringify(scope,null,2));
const random=bots.find(b=>b.bot==='随机');const hist=bots.find(b=>b.bot==='史书');
writeFileSync('docs/开发/构建报告.md',`# 构建报告

${report.createdAt} · ${report.mode}

${blocked?'构建阻止：有错误':'引擎编译与校验通过'}。${d.scenes.length}场非终局节点、${d.endings.length}终局；来源版本${networkVersion||'归档'}。

## 原稿因果见证重放
${networkWitnesses.filter(w=>w.passed).length}/${networkWitnesses.length}条完整入口路线与编剧见证逐步状态一致，终局真正停止。详见同名JSON，浏览器边界另见对应版本全网接入验收.md。

## 问题
${issues.map(i=>`- ${i.severity} ${i.code} ${i.path}：${i.message}`).join('\n')||'无'}

## 同一引擎模拟
新稿未标旧史书/享乐标签时，对应bot退回带种子的随机选择；该分布不是专门策略或平衡验收。
${bots.map(b=>`- ${b.bot} ${b.runs}局：${JSON.stringify(b.distribution)}；运行错误${b.errors.length}条`).join('\n')}

## 素材
manifest ${ids.size}项，文件缺失：${missingFiles.join('、')||'无'}。正式资源缺失会阻止构建，不以临时占位交付。美术状态单独统计，不将草稿或画册计为最终动画。

## 验收范围
设计试算、正式引擎逐步重放、浏览器及微信真机分别统计；本报告的引擎通过不冒充微信真机通过。
`);
if(blocked){console.error(issues);process.exit(1);}
writeFileSync('src/generated/story.json',JSON.stringify(d));writeFileSync('src/public/data/story.json',JSON.stringify(d));writeFileSync('src/generated/build.json',JSON.stringify({revision:createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0,16),storyVersion:d.meta?.revision,storyHash:d.rules.network?.hash,artBindingHash:d.rules.network?.artHash,nodeCount:d.scenes.length+d.endings.length,endingCount:d.endings.length,label:d.meta?.label}));
const all=Object.fromEntries(manifest.entries.map((e:any)=>{
 const poster=e.poster||(e.source_dir&&existsSync(join('assets',e.source_dir,'poster.webp'))?join(e.source_dir,'poster.webp'):undefined);
 return [e.id,{file:e.file,still:e.still||poster,w:e.w,h:e.h,poster,loop:e.loop,ms:e.ms,frames:e.frames,duration_ms:e.duration_ms,preview_video:e.preview_video,first_frame:e.first_frame,last_frame:e.last_frame,gif:e.gif,encoding_fps:e.encoding_fps,kind:e.id.split('.')[0],status:e.status,note:e.note||e.description||''}];}));
const used=new Set<string>(['end.21_jingkang']);
const refs=(shots:any[])=>{for(const sh of shots||[])for(const key of ['bg','cut','video','poster','left','right','center','prop'])if(typeof sh[key]==='string')used.add(sh[key]);};
for(const scene of d.scenes){refs(scene.shots);if(scene.resultBackground)used.add(scene.resultBackground);for(const o of scene.choice?.options||[])refs(o.shots||[]);}
for(const e of d.endings)refs(e.shots);
for(const m of d.rules.media||[])used.add(m.poster);
if(d.rules.network?.flow==='forward'){
 for(const id of ['ui.shishu_page','ui.tree_node.visited','ui.tree_node.unvisited','ui.gallery_locked','ui.gallery_cell','ui.timer_bar','map.strip','map.flag_jin','map.flag_song','icon.guan','icon.bing','icon.min','icon.qian','icon.shen'])used.add(id);
 for(const p of d.people)used.add('face.'+(p.face||p.id)+'.calm');
 for(const sc of d.scenes)for(const sh of sc.shots){if(!sh.say)continue;const p=d.people.find(p=>p.id===sh.say![0]);if(p){const base='face.'+(p.face||p.id)+'.'+(sh.expression||'calm');const side=sc.shots.some(frame=>frame.left?.startsWith('face.'+(p.face||p.id)+'.'))?'left':sh.side||'right',target=base+(side==='left'?'.right':'');if(all[target])used.add(target);else if(side!=='left'&&all[base])used.add(base);}}
}else{
 for(const id of Object.keys(all))if(id.startsWith('ui.')||id.startsWith('icon.')||id.startsWith('map.'))used.add(id);
 for(const p of d.people){const base=p.face||p.id;for(const id of Object.keys(all))if(id.startsWith('face.'+base+'.'))used.add(id);}
 for(const id of [...used])if(id.startsWith('bg.'))for(const variant of Object.keys(all))if(variant.startsWith(id+'.'))used.add(variant);
}
const index=Object.fromEntries([...used].filter(id=>all[id]).map(id=>[id,all[id]]));writeFileSync('src/generated/assets.json',JSON.stringify(index));
mkdirSync('src/public/data',{recursive:true});writeFileSync('src/public/data/assets-all.json',JSON.stringify(d.rules.network?.flow==='forward'?index:all));
const artReport={total:manifest.entries.length,runtimeIds:[...used].filter(id=>all[id]),directIds:[...new Set(d.scenes.flatMap(s=>s.shots.flatMap(sh=>[sh.bg,sh.cut,sh.video,sh.left,sh.right,sh.center,sh.prop])).filter(Boolean))],galleryIds:Object.keys(all),missingFiles,mode:d.meta?.mode};
writeFileSync('docs/开发/美术接入报告.json',JSON.stringify(artReport,null,2));
writeFileSync('docs/开发/美术接入报告.md',`# 美术接入报告

正式源${networkVersion}；manifest ${artReport.total}项，运行索引${artReport.runtimeIds.length}个ID（含表情与场景变体，不等于每局都播放）。

单向版只按节点与新版条件绑定播放，末镜替换对应outline位置；现代隐藏使用独立梦门、住宅、早餐、路口及现代沈青画像。美术包尚在扩充时，本报告仅说明编译引用，不代替最终视觉终审。精确浏览器素材事件与条件见对应版本全网接入验收.md。

视频与GIF维持用户指定的两倍速，原美术源不改、不插帧。正式游戏不显示开发画册、样稿试演、改值跳戏与回退按钮；部署包清除测试媒体、dev-status和未被运行索引引用的素材。

完整ID/文件/用途见同名JSON。字体源与发布子集均独立检查所有新稿及UI中文字，见对应版本字库覆盖.json；OFL随字体分发。
`);
// Copy only deliverable files, never art-src/ or source archives.
for(const e of manifest.entries)for(const key of ['file','still','poster','preview_video','first_frame','last_frame','gif'])if(e[key]&&existsSync(join('assets',e[key]))){const dest=join('src/public/assets',e[key]);mkdirSync(resolve(dest,'..'),{recursive:true});if(!existsSync(dest)||statSync(dest).size!==statSync(join('assets',e[key])).size||statSync(dest).mtimeMs<statSync(join('assets',e[key])).mtimeMs)cpSync(join('assets',e[key]),dest);}
for(const e of Object.values(all) as any[])if(e.poster&&existsSync(join('assets',e.poster))){const dest=join('src/public/assets',e.poster);mkdirSync(resolve(dest,'..'),{recursive:true});cpSync(join('assets',e.poster),dest);}
// Runtime GIF copies follow the same 2x playback setting as videos; originals remain untouched.
for(const file of new Set<string>(manifest.entries.flatMap((e:any)=>['file','still','gif'].map(k=>e[k]).filter((f:unknown)=>typeof f==='string'&&f.endsWith('.gif')))))writeFasterGif(join('assets',file),join('src/public/assets',file));
mkdirSync('src/public/fonts',{recursive:true});cpSync('proto/fonts/OFL.txt','src/public/fonts/OFL.txt');if(existsSync('proto/fonts/LICENSES'))cpSync('proto/fonts/LICENSES','src/public/fonts/LICENSES',{recursive:true});
const corpus=JSON.stringify(d)+(networkVersion?readFileSync('docs/剧本/节点网设计.json','utf8'):'')+walk('src').filter(p=>/\.(ts|css)$/.test(p)).map(p=>readFileSync(p,'utf8')).join('')+'开局就亡国魂穿宋钦宗离靖康还有356天改命架空：自你接位起，历史分岔官兵民钱身朝堂史书声音关闭继续从头再来回到上一步';
writeFileSync('src/generated/font-text.txt',corpus);
execFileSync('pyftsubset',['proto/fonts/fusion-pixel-12px.woff2','--text-file=src/generated/font-text.txt','--output-file=src/public/fonts/guanjia-pixel.woff2','--flavor=woff2','--name-IDs=*','--name-legacy','--name-languages=*']);
execFileSync('python3',['tools/check-font-coverage.py'],{stdio:'inherit'});
console.log(`编译完成：${files.length}份剧情源，${issues.length}提示，${bots.reduce((n,b)=>n+b.errors.length,0)} bot错误；报告 docs/开发/构建报告.md`);
