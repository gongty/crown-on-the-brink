import type {CostPolicy,Scalar,State} from './schema';
export interface TransactionHost {read:(s:State,path:string)=>Scalar;effects:(s:State,list:string[],spill?:boolean)=>void;data:{variables:{id:string;type:string;min?:number;max?:number}[];people:{id:string;camp:string}[];rules:{tiers:Record<string,number>;assignments:Record<string,number>;spill:{ratio:number;cross?:Record<string,number>}}}}
export class PaymentError extends Error {constructor(public path:string,public current:number,public required:number){super(`${path}不足：当前${current}，需要${required}`);}}
// Planning is pure: every branch and cost is evaluated against the same pre-action state.
export function transact(host:TransactionHost,before:State,effects:string[]=[],costs:Record<string,number>={},policy:CostPolicy={paymentResources:[]}):State {
 const next=JSON.parse(JSON.stringify(before)) as State;
 const changes=new Map<string,{set?:Scalar;delta:number;debit:number;causes:Record<string,number>}>();
 const change=(p:string)=>{host.read(before,p);let x=changes.get(p);if(!x){x={delta:0,debit:0,causes:{}};changes.set(p,x);}return x;};
 for(const effect of effects){const m=effect.match(/^(\S+)\s*([+\-=])\s*(.*?)(?:\s+@(\S+))?$/);if(!m)throw Error('效果非法：'+effect);const [,p,op,raw,cause]=m;
  const value:Scalar=raw==='true'?true:raw==='false'?false:Object.hasOwn(host.data.rules.tiers,raw)?host.data.rules.tiers[raw]:Object.hasOwn(host.data.rules.assignments,raw)?host.data.rules.assignments[raw]:/^-?\d+(\.\d+)?$/.test(raw)?Number(raw):raw.replace(/^['"]|['"]$/g,'');const x=change(p);
  if(op==='='){if(x.set!==undefined&&x.set!==value)throw Error('同一事务赋值冲突：'+p);x.set=value;}
  else {if(typeof host.read(before,p)!=='number'||typeof value!=='number')throw Error('不能增减非数值：'+p);const amount=(op==='+'?1:-1)*value;x.delta+=amount;if(amount<0)x.debit-=amount;
   if(p==='身'&&amount<0){if(!cause||!['纵欲','丹药','酒','累','病'].includes(cause))throw Error('龙体损耗必须有合法死因');x.causes[cause]=(x.causes[cause]||0)-amount;}}
  if(p==='身'&&op==='='&&typeof value==='number'&&value<Number(host.read(before,p))){if(!cause)throw Error('龙体损耗必须有死因');x.causes[cause]=(x.causes[cause]||0)+Number(host.read(before,p))-value;}
 }
 for(const[p,n]of Object.entries(costs)){if(!Number.isFinite(n)||n<0)throw Error('成本必须是非负有限数：'+p);const x=change(p);if(typeof host.read(before,p)!=='number')throw Error('成本只能扣数值：'+p);if(x.debit>0)throw Error('同一资源不要同时写costs与负effects：'+p);x.delta-=n;x.debit+=n;}
 for(const[p,x]of changes)if(policy.paymentResources.includes(p)||Object.hasOwn(costs,p)){const current=Number(host.read(before,p));if(current<x.debit)throw new PaymentError(p,current,x.debit);if(x.set!==undefined&&x.debit)throw Error('付款资源不能同时赋值：'+p);if(typeof x.set==='number'&&x.set<(host.data.variables.find(v=>v.id===p)?.min??0))throw new PaymentError(p,current,Math.abs(x.set));}
 const values=new Map<string,Scalar>();
 for(const[p,x]of changes){const old=host.read(before,p);if(x.set!==undefined&&typeof x.set!==typeof old)throw Error('变量类型不符：'+p);if(typeof old!=='number'&&x.delta)throw Error('非数值增量：'+p);values.set(p,typeof old==='number'?Number(x.set??old)+x.delta:x.set??old);}
 for(const debt of policy.arrears||[]){if(!values.has(debt.resource))continue;const v=host.data.variables.find(v=>v.id===debt.resource),amount=Math.max(0,(v?.min??0)-Number(values.get(debt.resource)));if(amount){if(typeof host.read(before,debt.target)!=='number')throw Error('欠付变量必须为数值：'+debt.target);values.set(debt.target,Number(values.get(debt.target)??host.read(before,debt.target))+amount);}}
 // Faction spill is merged once, so two simultaneous favor writes cannot overwrite each other.
 const spill=new Map<string,number>();for(const[p,value]of values){if(!p.endsWith('.好感'))continue;const who=host.data.people.find(x=>x.id===p.slice(0,-3));if(!who)continue;const delta=Math.max(0,Math.min(100,Number(value)))-Number(host.read(before,p));for(const other of host.data.people){if(other.id===who.id)continue;const ratio=other.camp===who.camp?host.data.rules.spill.ratio:host.data.rules.spill.cross?.[`${who.camp}>${other.camp}`]||0;spill.set(other.id,(spill.get(other.id)||0)+Math.round(delta*ratio));}}
 for(const[id,n]of spill)if(n){const p=id+'.好感';values.set(p,Number(values.get(p)??host.read(before,p))+n);}
 for(const[p,value]of values){if((policy.arrears||[]).some(d=>d.target===p)){const v=host.data.variables.find(v=>v.id===p);if(Number(value)>(v?.max??Infinity))throw Error('未兑现成本无法完整记账：'+p);}if(p==='身')continue;host.effects(next,[`${p} = ${typeof value==='string'?JSON.stringify(value):value}`],false);}
 if(values.has('身')){const value=Math.max(0,Math.min(100,Number(values.get('身')))),loss=Math.max(0,Number(before.values.身)-value),causes=changes.get('身')!.causes,total=Object.values(causes).reduce((a,b)=>a+b,0);next.values.身=value;if(loss&&!total)throw Error('龙体损耗必须有死因');for(const[c,n]of Object.entries(causes))next.drain[c]=(next.drain[c]||0)+loss*n/total;}
 return next;
}
