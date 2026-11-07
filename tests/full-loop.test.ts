import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import {Engine,clone} from '../src/engine';
import type {Story,Scene} from '../src/schema';
// Programmer-owned scheduling fixture. It is not shipped as formal creative content.
function fixture(){const d=parse(readFileSync(new URL('../src/sample.yaml',import.meta.url),'utf8')) as Story;const base=clone(d.scenes[1]);d.entry='loop.open';d.people=[];d.scenes=[];d.endings=[{...clone(d.endings[0]),id:'loop.end',if:'回合 >= 6',door:4,domain:undefined}];d.rules.turns=[2,3,4,5,6].map(turn=>({turn,date:`1126-02-${String(turn*3).padStart(2,'0')}`,days:3,jin:4,effects:['钱 -小']}));d.rules.activities=[{id:'work',name:'测试白天',period:'day'},{id:'sleep',name:'测试夜里',period:'night'}];d.rules.schedule.distinctCount=0;d.rules.schedule.distinctByTurn=100;
 for(let turn=1;turn<=6;turn++)for(const [slot,period,activity]of [['court1','court',''],['court2','court',''],['day','day','work'],['night','night','sleep']]){const sc:Scene={...clone(base),id:`loop.${turn}.${slot}`,type:'daily',period,activity,when:{turn:[turn,turn]},cast:[],shots:[{think:'程序回合调度测试。'}],choice:{options:[{id:'next',text:'继续',effects:['官 +小','官 -小'],goto:'@next'}]}};d.scenes.push(sc);}
 d.scenes.push({...clone(base),id:d.entry,type:'card',cast:[],when:{turn:[1,1]},shots:[{card:{title:'六回合测试'}}],choice:undefined,next:'@next'});
 d.scenes.push({...clone(base),id:'loop.report',type:'closure',cast:[],priority:10,when:{turn:[3,3]},shots:[{think:'程序到期回报测试。'}],choice:undefined,next:'@next'});
 d.scenes.push({...clone(base),id:'loop.final',cast:[],when:{turn:[6,6]},shots:[{think:'程序末回合判定测试。'}],choice:{options:[{id:'finish',text:'收卷',goto:'@next'}]},checkpoint:true});
 return d;}
test('六回合完整循环：每回合两朝一昼一夜，到期回报不占活动，结算不重复',()=>{const e=new Engine(fixture()),s=e.initial('six-turns');e.enter(s,e.data.entry);for(let n=0;n<100&&!s.ending;n++){if(s.phase==='turn')e.schedule(s);else if(s.phase==='activity')e.activity(s,e.activities(s)[0].id);else {const options=e.options(s);if(options.length)e.choose(s,options[0].id);else e.afterScene(s);}}
 assert.equal(s.ending,'loop.end');assert.equal(s.values.回合,6);assert.equal(s.days,15);assert.equal(s.values.金势,30);assert.equal(s.values.钱,20);assert.ok(s.played['loop.report']!==undefined);for(let turn=1;turn<=5;turn++)for(const slot of ['court1','court2','day','night'])assert.equal(s.played[`loop.${turn}.${slot}`],turn);assert.equal(s.path.length,21);
});
