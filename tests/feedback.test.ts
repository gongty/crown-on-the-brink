import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {adaptNetwork} from '../tools/network';
import {Engine,clone} from '../src/engine';
import {currentFeedback,lastStaticCut,staticCut} from '../src/feedback';
import {recordReaction} from '../src/reactions';
import type {Asset} from '../src/art';
const {story}=adaptNetwork(fileURLToPath(new URL('..',import.meta.url)),{bindingFile:null});
test('刚才只取本次真实记录的最后非空短反馈，天气不顶替战果',()=>{
 const s=new Engine(story).initial('1');s.path=[{scene:'A',option:'go',turn:0},{scene:'R',option:'win',turn:0},{scene:'W',option:'rain',turn:0}];s.outcome={beforeValues:clone(s.values),entries:[]};
 for(const [scene,option,feedback]of [['A','go','军令已下。'],['R','win','人粮救回，敌军扬言报复。'],['W','rain',''],['FUTURE','win','不能预知未来。']])recordReaction(s,scene,option,[{kind:'result',text:'完整原文。'}],[],true,undefined,feedback);
 const before=clone(s);assert.equal(currentFeedback(s,story),'人粮救回，敌军扬言报复。');assert.deepEqual(s,before);
 recordReaction(s,'R','win',[{kind:'result',text:'不应重写。'}],[],true,undefined,'不应覆盖。');assert.equal(s.outcome.entries.length,4);assert.equal(currentFeedback(s,story),'人粮救回，敌军扬言报复。');assert.deepEqual(s.values,before.values);assert.deepEqual(s.path,before.path);assert.equal(s.rng,before.rng);
});
test('旧缓存只从已选择字段补读；不枚举未选分支且不覆盖显式空串',()=>{
 const data=clone(story),node=data.scenes.find(n=>n.choice)!;node.choice!.options[0].feedback='已选的短反馈。';const s=new Engine(data).initial('1'),option=node.choice!.options[0].id;s.path=[{scene:node.id,option,turn:0}];s.outcome={beforeValues:clone(s.values),entries:[{scene:node.id,option,text:'完整长回响。',visuals:[]}]};assert.equal(currentFeedback(s,data),'已选的短反馈。');s.outcome.entries[0].feedback='';assert.equal(currentFeedback(s,data),'');s.path=[];delete s.outcome.entries[0].feedback;assert.equal(currentFeedback(s,data),'');
});
test('静态图只选实际命中最后cut；普通背景、道具、真视频均不顶替',()=>{
 const assets:Record<string,Asset>={first:{file:'first.png'},last:{file:'last.webp'},wrong:{file:'wrong.png'},movie:{file:'poster.png',preview_video:'movie.mp4'}};
 assert.equal(lastStaticCut([{cut:'first'},{cut:'wrong',if:'false'},{prop:'wrong'},{bg:'wrong'},{cut:'last'},{cut:'movie'}],c=>c!=='false',assets),'last');assert.equal(staticCut({prop:'first'},assets),false);assert.equal(staticCut({cut:'movie'},assets),false);assert.equal(lastStaticCut([{bg:'first'}],()=>true,assets),undefined);
});
test('反馈与阶段标签只编译呈现字段，28字符边界按Unicode检查',()=>{
 const root=fileURLToPath(new URL('..',import.meta.url)),base=adaptNetwork(root,{bindingFile:null}),source=clone(base.source),node=source.nodes.find(n=>n.id==='A01')!,dir=mkdtempSync(join(tmpdir(),'guanjia-feedback-')),file=join(dir,'source.json');
 try{
  node.presentation={...node.presentation,time_label:'首围·退兵后'};node.choices[0].feedback='人'.repeat(28);writeFileSync(file,JSON.stringify(source));const result=adaptNetwork(root,{sourceFile:file,bindingFile:null}),scene=result.story.scenes.find(s=>s.id===node.id)!;
  assert.equal(scene.shots[0].time,'首围·退兵后');assert.equal(scene.choice!.options[0].feedback,'人'.repeat(28));assert.deepEqual(result.story.variables,base.story.variables);assert.deepEqual(scene.choice!.options.map(o=>[o.id,o.modelEffect,o.goto,o.if]),base.story.scenes.find(s=>s.id===node.id)!.choice!.options.map(o=>[o.id,o.modelEffect,o.goto,o.if]));
  node.choices[0].feedback='人'.repeat(29);writeFileSync(file,JSON.stringify(source));assert.throws(()=>adaptNetwork(root,{sourceFile:file,bindingFile:null}),/feedback/);
 }finally{rmSync(dir,{recursive:true});}
});
