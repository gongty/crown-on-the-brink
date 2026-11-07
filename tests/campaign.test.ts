import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {fileURLToPath} from 'node:url';
import {campaign} from '../tools/campaign';
import {Engine,clone} from '../src/engine';
import {resolveClip} from '../src/art';
import type {State,Story} from '../src/schema';
const root=fileURLToPath(new URL('..',import.meta.url));
const story=()=>campaign(root,parse(readFileSync(root+'/src/sample.yaml','utf8')) as Story);
export function runCampaign(policy:(s:State,e:Engine)=>string|undefined,seed='complete'){
 const d=story(),e=new Engine(d),s=e.initial(seed);e.enter(s,d.entry);
 for(let step=0;step<500;step++){
  if(s.ending){if(e.endings[s.ending].kind==='event'){const prior=clone(s);assert.ok(!s.seen.includes(s.ending));e.continue(s);assert.equal(s.rng,prior.rng);continue;}return {s,e};}
  const options=e.options(s);if(!options.length){e.afterScene(s);continue;}
  const pick=policy(s,e)||options.find(o=>o.tags?.some(t=>['史书','基线'].includes(t)))?.id||options[0].id;e.choose(s,pick);
 }
 throw Error('500步仍未结束');
}
export const completeChoices:Record<string,string>={'main.M02':'history','main.M03':'plan_a','main.M04':'history','main.M05':'history','main.M06':'history','main.M07':'plan_a','main.M08':'history','main.M09':'history','main.M10':'history','main.M11':'history','main.M12':'history','main.M13':'history','main.M14':'plan_a','main.M15':'plan_a','main.M16':'plan_a','main.M17':'plan_a','main.A2.01':'baseline','main.A2.02':'plan_a','main.A2.03':'baseline','main.A2.04':'baseline','main.A2.05':'plan_a','main.A2.06':'baseline','main.A3.01':'baseline','main.A3.02':'baseline','main.A3.03':'baseline','main.A3.04':'baseline','main.A3.05':'baseline'};
export function completePolicy(s:State){if(s.current.startsWith('interlude.'))return Number(s.values.官)<25?'visit':Number(s.values.钱)<45?'account':'rest';return completeChoices[s.current];}
test('原史20场走到北去后继续囚居，只有实际病逝才写前世',()=>{const {s,e}=runCampaign(()=>undefined,'historical');assert.equal(s.ending,'end.E103');for(let n=1;n<=20;n++)assert.ok(s.played['main.M'+String(n).padStart(2,'0')]!==undefined);assert.ok(s.completed?.includes('event.N21'));assert.ok(s.played['life.R02.3']!==undefined);assert.deepEqual(s.seen,['end.E103']);assert.equal(e.endings[s.ending!].kind,'terminal');assert.equal(s.dead,true);assert.equal(s.values.身,0);});
test('守城后连续经过第二幕六场与第三幕五场，不用跳戏或改值',()=>{const {s}=runCampaign(completePolicy);assert.equal(s.ending,'end.E33');for(const id of [...Array.from({length:17},(_,i)=>'main.M'+String(i+1).padStart(2,'0')),...Array.from({length:6},(_,i)=>'main.A2.0'+(i+1)),...Array.from({length:5},(_,i)=>'main.A3.0'+(i+1))])assert.ok(s.played[id]!==undefined,`未经过${id}: ${JSON.stringify(s.path)}`);assert.ok(s.completed?.includes('event.N49.二围'));assert.deepEqual(s.seen,['end.E33']);assert.ok(s.days>15000);});
test('拒位后以宗室续行，可安居至晚年，无冒充在位履历',()=>{const {s}=runCampaign(s=>s.current==='main.M01'?'plan_b':s.current==='life.R06.1'?'leave':undefined,'refuse');assert.equal(s.ending,'end.E33');assert.equal(s.values['旗标.即位'],false);assert.ok(s.played['life.R06.1']!==undefined);assert.ok(s.played['life.R05.3']!==undefined);assert.ok(!s.seen.includes('event.N46'));const e=new Engine(story());assert.ok(!e.endingText(s,e.endings[s.ending!]).historian.includes('帝'));assert.equal(e.endingText(s,e.endings[s.ending!]).temple,'一生之评');});
test('同一危机只执行一次；事件不入死亡图鉴，续行保留身体与随机游标',()=>{const d=story(),e=new Engine(d),s=e.initial();e.enter(s,d.entry);s.values.官=100;e.choose(s,'history');assert.equal(s.current,'system.warning');e.acknowledgeWarning(s);assert.equal(s.ending,'event.crisis.office');const before=clone(s);e.continue(s);assert.equal(s.values.官,100);assert.equal(s.values.身,before.values.身);assert.equal(s.rng,before.rng);assert.deepEqual(s.seen,[]);e.choose(s,'care');assert.equal(s.ending,undefined);});
test('四条定稿动画保留原生时长、实际MP4优先、单次播放',()=>{const entries=JSON.parse(readFileSync(root+'/assets/manifest.json','utf8')).entries;const assets=Object.fromEntries(entries.map((x:any)=>[x.id,x]));for(const [id,ms]of [['mov.hand_over',6400],['cut.taishang.leave.cinematic',6400],['cut.zhong.open_gate.cinematic',5120],['cut.river.flee.cinematic',6400]] as const){const spec=resolveClip(id,assets,[{id,file:'test.mp4',poster:'test'}]);assert.ok(spec);assert.ok(spec.src?.startsWith('assets/'));assert.equal(spec.durationMs,ms);assert.equal(spec.loop,false);assert.equal(spec.pixel,id.startsWith('cut.'));}});
test('新剧情可插在后续节点之前，选项返回原分支，读档后不再重复插入',()=>{const d=story();d.scenes.push({id:'writer.new',name:'新增回响',before:'main.M02',act:1,type:'closure',period:'extension',once:true,weight:1,cast:[],tension:3,beat:'喘息',shots:[{think:'这条新剧情无须重写第一场的分支。'}],choice:{options:[{id:'a',text:'记下。',effects:['身 +小'],goto:'@return'},{id:'b',text:'交给人办。',effects:['官 +小'],goto:'@return'}]}});const e=new Engine(d),s=e.initial();e.enter(s,d.entry);e.choose(s,'history');e.choose(s,'rest');assert.equal(s.current,'writer.new');const saved=clone(s);e.choose(saved,'a');assert.equal(saved.current,'main.M02');assert.deepEqual(saved.returns,[]);e.go(saved,'main.M02');assert.equal(saved.current,'main.M02');});
