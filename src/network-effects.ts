import type {NetworkEffect,State,Story,Scalar} from './schema';
import {PaymentError} from './transactions';
export function networkEffect(data:Story,before:State,effect:NetworkEffect,test:(expr:string)=>boolean):State{
 const next=JSON.parse(JSON.stringify(before)) as State,extra=(effect.conditional||[]).filter(e=>test(e.if));
 const amount=(value:string|number)=>typeof value==='number'?value:(value.startsWith('-')?-1:1)*data.rules.tiers[value.replace(/^-/,'')];
 const adds:Record<string,number>={};for(const block of [effect,...extra])for(const[key,value]of Object.entries(block.add||{})){if(data.rules.network?.flow==='forward'&&['draw1','draw2','draw3','meta_main_worlds'].includes(key))throw Error('只读开局状态：'+key);const n=amount(value);if(!Number.isFinite(n))throw Error('非法模型增量：'+key);adds[key]=(adds[key]||0)+n;}
 for(const[key,delta]of Object.entries(adds)){if(typeof before.values[key]!=='number')throw Error('非数值增量：'+key);let value=Number(next.values[key])+delta;if(['qian','supply'].includes(key)&&value<0)throw new PaymentError(key,Number(before.values[key]),-delta);if(data.rules.network?.flow!=='forward'&&key==='guan'&&value<0)next.values.political_arrears=Number(next.values.political_arrears)-value;const v=data.variables.find(v=>v.id===key);if(!v)throw Error('未声明状态：'+key);value=Math.max(v.min??-Infinity,Math.min(v.max??Infinity,value));next.values[key]=value;}
 for(const block of [effect,...extra])for(const[key,value]of Object.entries(block.set||{})){if(data.rules.network?.flow==='forward'&&['draw1','draw2','draw3','meta_main_worlds'].includes(key))throw Error('只读开局状态：'+key);const def=data.variables.find(v=>v.id===key);if(!def||typeof value!==def.type)throw Error('模型赋值类型错误：'+key);if(typeof value==='number'&&(value<(def.min??-Infinity)||value>(def.max??Infinity)))throw Error('模型赋值超范围：'+key);next.values[key]=value as Scalar;}
 return next;
}
