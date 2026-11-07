import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {adaptNetwork} from '../tools/network';
import {Engine,clone} from '../src/engine';
import {migrateState} from '../src/progress';
import {decisionRows,reactionRows,visualShot} from '../src/decision';
import type {DecisionCard,Shot} from '../src/schema';
const root=fileURLToPath(new URL('..',import.meta.url));
function fixture(initialExtra={}){
 const node={rank:1,act:1,kind:'story',cast:['李纲'],hook:'城外缺粮，城里也等着开仓。',thought:'',source:'程序呈现验证稿',enter:{},assets:['bg.v3.court_pov'],tension:5,variants:[]};
 const choice={id:'order',text:'先开城中粮仓',to:'R',guard:'True',add:{qian:-2},set:{command:true},visible:true,lock:'',meaning:'',callback:'',reaction:'粮送出去了。国库实付两贯。'};
 const source={version:'decision-fixture',entry:'A',mechanics:{flow:'strict-forward-dag'},initial:{guan:50,bing:50,min:50,qian:10,shen:70,draw1:0,draw2:0,draw3:0,meta_main_worlds:0,command:false,lg_active:true,dead:false,lost:false,captive:false,...initialExtra},aliases:{guan:'朝廷执行',bing:'可调战力',min:'民心民生',qian:'国库现金',shen:'身体'},ranges:{qian:[0,100]},tiers:{小:5,中:10,大:20},epilogues:[],chronicle_entries:[],nodes:[{...node,id:'A',title:'开仓',enter:{qian:9},layout:'decision_card',beats:[['李纲','先救城外。'],['大臣','先顾城里。']],choices:[choice]},{...node,id:'R',title:'结果',rank:2,kind:'resolution',cast:[],hook:'',choices:[{...choice,id:'resolved',to:'T',guard:'command',add:{min:3},set:{},reaction:'粮车进城。'}]},{...node,id:'T',title:'收卷',rank:3,kind:'TE',cast:[],choices:[],accept:'command and qian == 7',ending_scope:'main',valence:'mixed'}]};
 const dir=mkdtempSync(join(tmpdir(),'guanjia-card-test-')),file=join(dir,'fixture.json');writeFileSync(file,JSON.stringify(source));try{return adaptNetwork(root,{sourceFile:file,bindingFile:null}).story;}finally{rmSync(dir,{recursive:true});}
}
test('决策卡保留完整原文、双方姓名及所有匹配军情回声，纯呈现无写入',()=>{
 const card:DecisionCard={hook:'“不能再等。”他把整封军报交给你。',beats:[{speaker:'li_gang',text:'要粮。'},{speaker:'大臣',text:'要钱。'}],echoes:[{if:'yes',text:'弟弟仍被扣。'},{if:'yes',text:'城内没有替补兵。'}]},before=clone(card);
 const rows=decisionRows(card,c=>!c||c==='yes');assert.deepEqual(rows.map(r=>r.text),[card.hook,'弟弟仍被扣。','城内没有替补兵。','要粮。','要钱。']);assert.deepEqual(rows.filter(r=>r.kind==='speech').map(r=>r.speaker),['li_gang','大臣']);assert.deepEqual(card,before);
});
test('值班人条件只改变当前说话者，不跳过新回响或执行选择',()=>{
 const rows=decisionRows({hook:'军报到了。',echoes:[{if:'old',text:'旧将已退。'}],beats:[{speaker:'li_gang',text:'守城。',if:'active'},{speaker:'继任主将',text:'守城。',if:'inactive'}]},c=>!c||c==='old'||c==='inactive');assert.equal(rows.filter(r=>r.kind==='speech').length,1);assert.equal(rows.at(-1)?.speaker,'继任主将');assert.ok(rows.some(r=>r.text==='旧将已退。'));
});
test('旧分页反应合成一屏，冻结的失效画面仍不重查资格',()=>{
 const shots:Shot[]=[{if:'true',cut:'cut.guard'},{if:'false',cut:'cut.failure'},{caption:'他答道：“好。'},{caption:'”粮车出城。'}],before=clone(shots);assert.deepEqual(reactionRows(shots,c=>c!=='false'),[{kind:'result',text:'他答道：“好。”粮车出城。'}]);assert.deepEqual(visualShot(shots[0]),shots[0]);assert.deepEqual(visualShot({caption:'原文',if:'true',bg:'bg.court'}),{if:'true',bg:'bg.court'});assert.deepEqual(shots,before);
});
test('适配器识别可选layout，国事不生成逐句字幕，结果为完整一屏',()=>{
 const story=fixture(),a=story.scenes.find(s=>s.id==='A')!;assert.equal(a.layout,'decision_card');assert.equal(a.decisionCard!.beats.length,2);assert.ok(!a.shots.some(s=>s.caption||s.say||s.think));assert.equal(a.resultLayout,'decision_card');assert.deepEqual(a.choice!.options[0].shots,[{caption:'粮送出去了。国库实付两贯。'}]);assert.equal(story.scenes.find(s=>s.id==='R')?.resultLayout,'decision_card');assert.ok(story.endings[0].shots.some(s=>s.caption));
});
test('五核心事实模型不注入旧人物变量、不出现NaN，旧稿零好感与军权仍有效',()=>{
 const story=fixture(),e=new Engine(story),s=e.initial('1');e.enter(s,'A');assert.ok(!('lg'in s.values));assert.ok(!('father'in s.values));assert.ok(!('queen'in s.values));for(const p of Object.values(s.people)){assert.ok(Number.isFinite(p.favor));assert.ok(Number.isFinite(p.power));}assert.equal(s.people.li_gang.status,'在朝');const zero=fixture({lg:0,lgpower:0}),ze=new Engine(zero),zs=ze.initial('1');ze.enter(zs,'A');assert.equal(zs.people.li_gang.favor,0);assert.equal(zs.people.li_gang.power,0);
});
test('决策卡不改变入场/支付/自动结果时序；选择前后中断恢复不重复支付',()=>{
 const story=fixture(),e=new Engine(story),s=e.initial('1');e.enter(s,'A');assert.equal(s.values.qian,9);const before=migrateState(clone(s),story);assert.deepEqual(before,s);decisionRows(story.scenes[0].decisionCard!,c=>e.test(s,c));assert.equal(s.path.length,0);e.choose(s,'order');assert.equal(s.current,'R');assert.equal(s.values.qian,7);assert.equal(s.values.min,50);const resumed=migrateState(clone(s),story);assert.deepEqual(resumed,s);e.choose(resumed,'resolved');assert.equal(resumed.ending,'T');assert.equal(resumed.values.qian,7);assert.equal(resumed.values.min,53);const stopped=clone(resumed);e.schedule(resumed);e.turn(resumed);assert.deepEqual(resumed,stopped);
});
