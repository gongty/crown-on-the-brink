import {readFileSync,existsSync} from 'node:fs';
import type {Story,Scene,Shot,Person} from '../src/schema';
// Read the writer's text verbatim. This is an audition adapter, never a formal script generator.
export function attachRehearsals(d:Story,root:string){
 const file='docs/剧本/归档/节点网重构前-20261106/关键选择与结局样稿.md';if(!existsSync(`${root}/${file}`))return;
 const text=readFileSync(`${root}/${file}`,'utf8');const sections=[...text.matchAll(/^## S(\d+) · (.+)\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)];
 const people:Record<string,[string,string,string]>={'高俅':['gao_qiu','other','高太尉'],'太上皇':['taishang','other','太上皇'],'种师道':['zhong_shidao','military','老将'],'李邦彦':['li_bangyan','civil','宰相'],'阿桂':['agui','consort','许氏·阿桂（成年虚构）'],'朱后':['zhu_hou','empress','皇后'],'李纲':['li_gang','civil','李纲'],'内侍':['neishi_young','other','内侍']};
 const bg=['bg.court','bg.city_wall','bg.harem_fei','bg.study','bg.cuju','bg.study'];
 const notes=[['官 -小','钱 -中','民 +小'],['官 +小','钱 -中','兵 +小'],['官 +小','官 -小','agui.权 +小'],['官 -中','li_gang.权 -小','li_gang.好感 -小'],['身 +小','官 +小','钱 -小'],['官 -小','民 +小','官 +小']];
 const scenarios:string[]=[];
 for(const [index,m] of sections.entries()){
  const id=`rehearsal.S${m[1]}`,name=m[2].split('（')[0],body=m[3].split('钩子')[0];const cast=new Set<string>(),shots:Shot[]=[{card:{title:name.length>12?name.slice(0,12):name,note:'编剧样稿 · 独立试演，非正式时间线'}}];
  shots.push({bg:bg[index]||'bg.court',place:'样稿试演',time:'昼',music:index===4?'cue.market':index===2?'cue.harem':'cue.court'});
  for(const line of body.split('\n')){
   if(line.startsWith('紫字：')){for(const t of split(line.slice(3)))shots.push({think:t});continue;}
   const speech=line.match(/^([^：|#]{1,20})：“([^”]+)”/);if(!speech)continue;
   const who=Object.keys(people).find(p=>speech[1].startsWith(p));if(who){const [pid,kind,office]=people[who];cast.add(pid);if(!d.people.some(p=>p.id===pid)){const p:Person={id:pid,name:who,camp:pid,tier:'B',kind,favor:50,power:35,status:'在朝',office,adult:true,fictional:pid==='agui',face:pid==='agui'?'fei_xin':pid};if(kind==='consort')p.temperament='心机';d.people.push(p);}
    for(const t of split(speech[2]))shots.push({say:[pid,t],expression:'calm'});
   }else if(speech[1]==='你'){for(const t of split(speech[2]))shots.push({say:['官家',t],right:null});}
  }
  let choices=[...body.matchAll(/^\| “([^”]+)” \|/gm)].map(x=>x[1]);
  if(!choices.length){const choiceLines=body.split('\n').filter(l=>/^选择/.test(l)).join('\n');choices=[...choiceLines.matchAll(/“([^”]+)”/g)].map(x=>x[1]);}
  if(choices.length<2)continue;
  const prop=['prop.tiger_tally','prop.secret_letter','prop.scroll','prop.memorial','prop.cuju','prop.jade_seal'][index];if(prop){const anchor=shots.slice().reverse().find(sh=>sh.think||sh.say);if(anchor)anchor.prop=prop;}
  const scene:Scene={contract:1,id,name,source:`${file}#S${m[1]}`,act:index===5?3:1,type:'rehearsal',period:'rehearsal',weight:1,once:false,cast:[...cast],tension:[7,8,7,5,2,6][index]||5,beat:index===4?'喘息':'两难',shots,choice:{options:choices.slice(0,3).map((text,i)=>({id:`pick${i+1}`,text,goto:'@complete',effects:[notes[index]?.[i]||'官 +小']}))}};
  d.scenes.push(scene);scenarios.push(id);
 }
 d.meta={id:'guanjia',name:'开局就亡国',mode:'sample',label:'程序联调卷 · 编剧样稿试演',rehearsals:scenarios};
}
function split(text:string){const chars=[...text];const out:string[]=[];while(chars.length)out.push(chars.splice(0,42).join(''));return out;}
