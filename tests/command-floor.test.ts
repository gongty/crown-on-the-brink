import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {adaptNetwork} from '../tools/network';
import {Engine,clone} from '../src/engine';
import {commandDeltas,commandFloorLimits} from '../src/command-preview';
import type {NetworkEffect} from '../src/schema';
const base=adaptNetwork(fileURLToPath(new URL('..',import.meta.url)),{bindingFile:null}).story;
function fixture(effect:NetworkEffect){const story=clone(base),engine=new Engine(story),state=engine.initial('1'),option=clone(story.scenes.find(s=>s.choice)!.choice!.options[0]);option.modelEffect=effect;state.values.min=0;return {engine,state,option};}
test('仅已到下界且本次真实下减被截断的指标显示已最低，零变化不是免费代价',()=>{const{engine,state,option}=fixture({add:{min:-8,bing:4}}),before=clone(state),deltas=commandDeltas(engine,state,option,true);assert.equal(deltas.find(d=>d.id==='min')!.delta,0);assert.deepEqual(commandFloorLimits(engine,state,option,true,deltas),[{id:'min',label:'民',text:'已最低'}]);assert.deepEqual(state,before);});
test('条件只读选前实际命中；条件未中、净抵消、恢复和直接赋值不误标',()=>{for(const effect of [{conditional:[{if:'min > 0',add:{min:-8}}]},{add:{min:-8},conditional:[{if:'min == 0',add:{min:8}}]},{add:{min:8}},{add:{min:-8},set:{min:0}},{set:{min:0}}]as NetworkEffect[]){const{engine,state,option}=fixture(effect);assert.deepEqual(commandFloorLimits(engine,state,option,true),[]);}});
test('部分截断仍显示真实可扣数字，正向上界截断不混用最低提示',()=>{const{engine,state,option}=fixture({add:{min:-8,bing:10}});state.values.min=3;state.values.bing=100;assert.equal(commandDeltas(engine,state,option,true).find(d=>d.id==='min')!.delta,-3);assert.deepEqual(commandFloorLimits(engine,state,option,true),[]);});
test('下界须实际存在；档位与命中附加下减合并后判断',()=>{const{engine,state,option}=fixture({add:{min:'小'},conditional:[{if:'min == 0',add:{min:'-中'}}]});assert.deepEqual(commandFloorLimits(engine,state,option,true),[{id:'min',label:'民',text:'已最低'}]);delete engine.data.variables.find(v=>v.id==='min')!.min;assert.deepEqual(commandFloorLimits(engine,state,option,true),[]);});
test('禁用项不计划失败付款；复用实际预览时不再计划，也不预测下一节点',()=>{const{engine,state,option}=fixture({add:{min:-8}});option.goto='future.node.must.not.be.entered';const actual=commandDeltas(engine,state,option,true),before=clone(state);engine.plan=()=>{throw Error('不得重复计划或进入未来');};assert.deepEqual(commandFloorLimits(engine,state,option,false),[]);assert.equal(commandFloorLimits(engine,state,option,true,actual)[0].text,'已最低');assert.deepEqual(state,before);});
