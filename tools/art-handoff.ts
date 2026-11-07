import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import type {Story} from '../src/schema';
export function reportConfirmedArt(root:string,data:Story,manifest:{entries:any[]}){
 const file=root+'/docs/剧本/已定素材剧情绑定.json';if(!existsSync(file))return;
 const bindings=JSON.parse(readFileSync(file,'utf8')).bindings;
 const rows=bindings.map((b:any)=>{const art=manifest.entries.find(a=>a.id===b.asset);const scenes=data.scenes.filter(s=>s.sourceNode===b.node),endings=data.endings.filter(e=>e.sourceNode===b.node);const refs=[...scenes.flatMap(s=>[{scene:s.id,sourceNode:s.sourceNode,shots:s.shots},...(s.choice?.options||[]).map(o=>({scene:s.id,sourceNode:s.sourceNode,choice:o.id,shots:o.shots||[]}))]),...endings.map(e=>({ending:e.id,sourceNode:e.sourceNode,shots:e.shots}))].flatMap(owner=>owner.shots.filter(sh=>[sh.cut,sh.video,sh.bg].includes(b.asset)).map(sh=>({...owner,shots:undefined,if:sh.if})));
  return {...b,assetRegistered:!!art,file:art?.file,fileExists:!!art?.file&&existsSync(root+'/assets/'+art.file),artStatus:art?.status,animationDelivered:Boolean(art?.preview_video||art?.file?.endsWith('.mp4')||art?.file?.endsWith('.gif')),runtimeMappings:refs,status:refs.length?'已映射正式sourceNode、条件及选择时点；浏览器结果见v2.2全网接入验收':'待正式场景sourceNode映射及条件镜头；未算接入'};});
 writeFileSync(root+'/docs/开发/五项已定美术绑定状态.json',JSON.stringify(rows,null,2));
 writeFileSync(root+'/docs/开发/五项已定美术绑定状态.md','# 五项已定美术绑定状态\n\n按编剧绑定单核对。正式运行场景与终局用sourceNode显式对应设计ID；画册注册不算剧情绑定。当前以显式适配器将原稿受限条件转换为安全条件树，不执行Python代码；按完整网实际节点播放。\n\n'+rows.map((r:any)=>`- ${r.asset} → ${r.node}${r.choice?'.'+r.choice:''} / ${r.phase}；条件：${r.when}；文件${r.fileExists?'已在':'缺失'}，${r.artStatus||'未登记'}；${r.animationDelivered?'已有动态文件':'当前未交动态文件'}；${r.status}。`).join('\n')+'\n\nTE_C退条款须真实胜利后；B05交印只给successor离任；B04收据只给实际征运；家信须受拘且通信成立。正式条件映射见tools/network.ts与v2.2全网接入验收.md；TE_B完整胜利后允许回望归民末镜。\n');
}
