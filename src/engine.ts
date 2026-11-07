import {networkEffect} from './network-effects';
import {evaluate,conditionPaths} from './conditions';
import {transact,PaymentError} from './transactions';
import {hash32,Rng,forwardDraws} from './rng';
import type {Ending,Option,Scalar,Scene,State,Story,CollectionRecord,RecordKind} from './schema';
export const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
export const commit=(state:State,next:State)=>{for(const key of Object.keys(state))if(!Object.hasOwn(next,key))delete (state as any)[key];Object.assign(state,next);};
export const endingClass=(e:Ending):RecordKind|'legacy'=>['stage','event','milestone'].includes(e.kind||'')?'stage':['victory','death','departure'].includes(e.kind||'')?e.kind as RecordKind:e.deathConfirmed===true?'death':'legacy';
export const isStage=(e:Ending)=>endingClass(e)==='stage';
export class Engine {
 scenes:Record<string,Scene>; endings:Record<string,Ending>;
 constructor(public data:Story){this.scenes=Object.fromEntries(data.scenes.map(s=>[s.id,s]));this.endings=Object.fromEntries(data.endings.map(e=>[e.id,e]));}
 initial(seed='官家',seen:string[]=[],records:CollectionRecord[]=[]):State {
  const state:State={version:1,contractVersion:2,records:clone(records),uses:{},visits:{},seed,rng:0,values:Object.fromEntries(this.data.variables.map(v=>[v.id,v.initial])),people:Object.fromEntries(this.data.people.map(p=>[p.id,{favor:p.favor,power:p.power,status:p.status,office:p.office,memory:p.memory||{},saved:false,hazard:0}])),seen:[...seen],deviation:{},rewrites:{},drain:{},tags:{},played:{},castTurns:{},warnings:{},queue:[],period:0,court:0,timerTurn:0,current:this.data.entry,choice:'',path:[],diagnostics:[],fired:[],days:0,phase:'scene',shot:0};
  if(this.data.rules.network?.flow==='forward'){state.legacySeen=[];const numeric=/^\d+$/.test(seed)?Number(seed)>>>0:hash32(seed);state.seed=String(numeric);const ds=forwardDraws(numeric);['draw1','draw2','draw3'].forEach((k,i)=>state.values[k]=ds[i]);state.profile=[...new Set(records.filter(r=>r.story===this.data.meta?.id&&r.revision===this.data.meta?.revision&&this.endings[r.id]?.ending_scope==='main').map(r=>r.id))].sort();state.values.meta_main_worlds=state.profile.length;}return state;
 }
 relation(s:State,id:string){const p=s.people[id],r=this.data.rules.relations;if(p.favor>=r.friend)return p.power>=r.power?'柱石':'心腹';if(p.favor<=r.enemy)return p.power>=r.power?'隐患':'怨臣';return '平常';}
 read(s:State,path:string):Scalar {
  if(Object.hasOwn(s.values,path))return s.values[path];
  if(path==='死因')return Object.entries(s.drain).sort((a,b)=>b[1]-a[1])[0]?.[0]||'病';
  if(path.startsWith('seen.')){const rest=path.slice(5),kind=rest.split('.')[0];if(['victory','death','departure','stage'].includes(kind))return Boolean(s.records?.some(r=>r.kind===kind&&r.id===rest.slice(kind.length+1)&&r.story===(this.data.meta?.id||'guanjia')&&r.revision===(this.data.meta?.revision||'legacy-v0.3')));return this.strict(s)?Boolean(s.records?.some(r=>r.id===rest&&r.kind!=='stage'&&r.story===(this.data.meta?.id||'guanjia')&&r.revision===(this.data.meta?.revision||'legacy-v0.3'))):s.seen.includes(rest);}
  if(path.startsWith('visited.'))return (s.visits?.[path.slice(8)]||0)>0;
  if(path.startsWith('completed.'))return Boolean(s.completed?.includes(path.slice(10)));
  if(path.startsWith('偏离.'))return s.deviation[path.slice(3)]||0;
  const i=path.indexOf('.'),id=path.slice(0,i),key=path.slice(i+1),p=s.people[id];
  if(p){if(key==='关系')return this.relation(s,id);if(key.startsWith('记事.'))return p.memory[key.slice(3)]??false;const map:Record<string,keyof typeof p>={好感:'favor',权:'power',处境:'status',官职:'office'};if(map[key])return p[map[key]] as Scalar;}
  throw Error(`未知变量：${path}`);
 }
 test(s:State,condition?:string){return evaluate(condition,p=>this.read(s,p));}
 roll(s:State){if(this.ended(s))throw Error('本局已结束');const r=new Rng(hash32(`${s.seed}|${s.rng++}`));return r.next();}
 effects(s:State,list:string[]=[],spill=true){
  const rules=this.data.rules;
  for(const eff of list){const m=eff.match(/^(\S+)\s*([+\-=])\s*(.*?)(?:\s+@(\S+))?$/);if(!m)throw Error(`效果非法：${eff}`);
   const [,path,op,raw,cause]=m;let value:Scalar=raw==='true'?true:raw==='false'?false:raw.startsWith('"')?JSON.parse(raw):raw.replace(/^['"]|['"]$/g,'');
   if(Object.hasOwn(rules.tiers,raw))value=rules.tiers[raw];else if(Object.hasOwn(rules.assignments,raw))value=rules.assignments[raw];else if(/^-?\d+(\.\d+)?$/.test(raw))value=Number(raw);
   const old=this.read(s,path),v=this.data.variables.find(v=>v.id===path);
   const numeric=typeof old==='number';if(op!=='='&&(!numeric||typeof value!=='number'))throw Error(`不能增减非数值：${eff}`);
   let next:Scalar=op==='='?value:Number(old)+(op==='+'?1:-1)*Number(value);
   if(v){if(typeof next!==v.type)throw Error(`变量类型不符：${eff}`);if(typeof next==='number')next=Math.max(v.min??-Infinity,Math.min(v.max??Infinity,next));s.values[path]=next;
    if(path==='身'&&Number(next)<Number(old)){if(!cause)throw Error('龙体损耗必须有死因');s.drain[cause]=(s.drain[cause]||0)+Number(old)-Number(next);}
   } else {const i=path.indexOf('.'),id=path.slice(0,i),key=path.slice(i+1),p=s.people[id];
    if(key.startsWith('记事.'))p.memory[key.slice(3)]=next;
    else if(key==='好感'||key==='权'){
     if(typeof next!=='number'||!Number.isFinite(next))throw Error(`人物数值非法：${eff}`);
     next=Math.max(0,Math.min(100,next));p[key==='好感'?'favor':'power']=next;
     if(key==='好感'&&spill) {const who=this.data.people.find(x=>x.id===id)!;
      for(const q of this.data.people){if(q.id===id)continue;const ratio=q.camp===who.camp?rules.spill.ratio:rules.spill.cross?.[`${who.camp}>${q.camp}`]||0;s.people[q.id].favor=Math.max(0,Math.min(100,s.people[q.id].favor+Math.round((next-Number(old))*ratio)));}
     }
    }else if(key==='处境'||key==='官职'){if(typeof next!=='string')throw Error('人物处境和官职必须为字符串');p[key==='处境'?'status':'office']=next;}else throw Error(`不可写变量：${path}`);
   }
  }
 }
 personEligible(s:State,id:string){const p=this.data.people.find(p=>p.id===id),q=s.people[id],date=String(s.values.日期);return Boolean(p&&q&&(!p.window||date>=p.window[0]&&date<=p.window[1])&&!['死','叛','出家','下狱'].includes(q.status));}
 eligible(s:State,sc:Scene){const t=Number(s.values.回合),d=String(s.values.日期),w=sc.when;
  return !(sc.once&&s.played[sc.id]!==undefined)&&!(s.played[sc.id]!==undefined&&t-s.played[sc.id]<=Number(sc.cooldown||0))&&(!w?.date||(d>=w.date[0]&&d<=w.date[1]))&&(!w?.turn||(t>=w.turn[0]&&t<=w.turn[1]))&&this.test(s,w?.if)&&sc.cast.every(id=>this.personEligible(s,id));
 }
 enter(s:State,id:string){if(this.ended(s))return;const sc=this.scenes[id];if(!sc)throw Error(`戏不存在：${id}`);if(this.data.rules.network?.flow==='forward'&&((s.visits?.[id]||0)>0||s.visits?.[s.current]&&Number(sc.rank)<=Number(this.scenes[s.current]?.rank)))throw Error('本局只能向前：'+id);const strict=sc.contract===2||sc.contract!==1&&this.data.rules.contracts?.version===2,next=strict?clone(s):s;next.current=id;next.phase='scene';next.shot=0;(next.visits??={})[id]=(next.visits?.[id]||0)+1;if(this.data.rules.network){commit(next,networkEffect(this.data,next,{set:sc.modelEnter||{}},expr=>this.test(next,expr)));this.syncPeople(next);}
  if(next.played[id]===undefined){const before=String(next.values.日期);if(strict)commit(next,transact(this,next,sc.onEnter,{},this.data.rules.contracts?.costs));else this.effects(next,sc.onEnter);const delta=Date.parse(String(next.values.日期))-Date.parse(before);if(delta>0)next.days+=Math.round(delta/86400000);if(sc.advanceDays){const date=new Date(String(next.values.日期)+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+sc.advanceDays);next.values.日期=date.toISOString().slice(0,10);next.days+=sc.advanceDays;}}
  const t=Number(next.values.回合);next.played[id]=t;for(const p of sc.cast){const a=next.castTurns[p]||[];if(!a.includes(t))a.push(t);next.castTurns[p]=a;}if(strict)commit(s,next);
 }
 strict(s:State){return this.scenes[s.current]?.contract===2||this.scenes[s.current]?.contract!==1&&this.data.rules.contracts?.version===2;}
 ended(s:State){return Boolean(s.ending&&this.endings[s.ending]&&!isStage(this.endings[s.ending]));}
 syncPeople(s:State){if(!this.data.rules.network)return;for(const [id,favor,power]of [['li_gang','lg','lgpower'],['taishang','father',''],['zhu_hou','queen','']]){const p=s.people[id];if(p){if(typeof s.values[favor]==='number'&&Number.isFinite(s.values[favor]))p.favor=Number(s.values[favor]);if(power&&typeof s.values[power]==='number'&&Number.isFinite(s.values[power]))p.power=Number(s.values[power]);}}if(s.people.li_gang){if('lg_active'in s.values)s.people.li_gang.status=s.values.lg_active?'在朝':'已离任';if('rescue_used'in s.values)s.people.li_gang.saved=Boolean(s.values.rescue_used);}}
 plan(s:State,o:Option){if(o.modelEffect){const next=networkEffect(this.data,s,o.modelEffect,expr=>this.test(s,expr));this.syncPeople(next);return next;}const effects=[...(o.effects||[])],costs={...(o.costs||{})};for(const c of o.conditionalEffects||[])if(this.test(s,c.if)){effects.push(...c.effects||[]);for(const[p,n]of Object.entries(c.costs||{}))costs[p]=(costs[p]||0)+n;}return transact(this,s,effects,costs,this.data.rules.contracts?.costs);}
 visibleOptions(s:State,scene=this.scenes[s.current]){return (scene.choice?.options||[]).filter(o=>this.test(s,o.visibleIf)).map(option=>{
  let reason='';if(!this.test(s,option.if))reason=option.lock?.reason||'还缺少已说明的准备。';
  const key=scene.id+':'+option.id;if(option.limit!==undefined&&(s.uses?.[key]||0)>=option.limit)reason='这次机会已经用过。';
  for(const c of option.lock?.checks||[]){const v=this.read(s,c.path);if(typeof c.required==='number'?Number(v)<c.required:v!==c.required)reason||=option.lock!.reason;}
  try{if(!reason&&(this.strict(s)||option.costs||option.conditionalEffects))this.plan(s,option);}catch(e){if(e instanceof PaymentError)reason=e.message;else throw e;}
  return {option,enabled:!reason,reason};
 });}
 options(s:State,scene=this.scenes[s.current]){return this.visibleOptions(s,scene).filter(x=>x.enabled).map(x=>x.option);}
 useTimer(s:State){const c=this.scenes[s.current].choice,t=Number(s.values.回合);if(c?.timer){if(this.strict(s)&&!this.options(s).some(o=>o.id===c.default))throw Error('超时默认项不可执行');if(s.timerTurn!==t||s.timerScene===s.current){if(s.timerScene!==s.current){s.timerLeft=c.timer;s.timerScene=s.current;}s.timerTurn=t;return Math.max(.05,s.timerLeft??c.timer);}}return 0;}
 choose(s:State,id:string){if(this.ended(s))throw Error('本局已结束');const sc=this.scenes[s.current],o=this.options(s,sc).find(x=>x.id===id);if(!o)throw Error('选项不可用');
  const before=clone(s),next=this.strict(s)||o.costs||o.conditionalEffects||o.modelEffect?this.plan(before,o):clone(s);
  if(!this.strict(s)&&!o.costs&&!o.conditionalEffects&&!o.modelEffect)this.effects(next,o.effects);
  next.choice=o.text;next.path.push({scene:sc.id,option:id,turn:Number(before.values.回合)});(next.uses??={})[sc.id+':'+id]=(next.uses?.[sc.id+':'+id]||0)+1;
  if(o.visit){const r=this.data.rules.harem;if(!r)throw Error('宠幸缺少rules.harem');const p=next.people[o.visit];if(!p||!this.data.people.some(p=>p.id===o.visit&&['consort','empress'].includes(p.kind)))throw Error('去处不是后宫人物');p.favor=Math.min(100,p.favor+r.favor);p.power=Math.min(100,p.power+r.power);for(const other of this.data.people.filter(p=>p.id!==o.visit&&['consort','empress'].includes(p.kind))){const q=next.people[other.id];q.favor=Math.max(0,Math.min(100,q.favor+(other.temperament==='好妒'?r.jealous:r.others)));}}
  for(const tag of o.posthumous||[])next.tags[tag]=(next.tags[tag]||0)+1;
  for(const [k,n]of Object.entries(o.deviation||{}))next.deviation[k]=(next.deviation[k]||0)+n;Object.assign(next.rewrites,o.rewrite||{});
  let target=o.goto;
  for(const r of o.risk||[])if(this.test(this.strict(s)?before:next,r.if)){if(this.roll(next)<r.chance)target=r.ending;break;}
  const direct=this.endings[target]?.door===1?this.endings[target]:undefined;
  const threat=sc.type==='attack'?this.sorted(2,next).find(e=>this.test(next,e.if)):undefined;
  if(direct||threat)this.finish(next,(direct||threat)!);else {next.pending=target;this.afterScene(next,sc);}
  commit(s,next);return o;
 }
 sorted(door:number,s?:State){return this.data.endings.filter(e=>e.door===door&&(!s||!this.strict(s)||e.contract===2||['death','victory','departure','stage'].includes(e.kind||''))).sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));}
 afterScene(s:State,sc=this.scenes[s.current]){if(this.strict(s)){const next=clone(s);this.resolveScene(next,sc);commit(s,next);}else this.resolveScene(s,sc);}
 resolveScene(s:State,sc:Scene){
  if(this.ended(s)||s.ending&&isStage(this.endings[s.ending]))return;
  if(this.data.rules.network){if(sc.auto&&!s.pending){const options=this.options(s,sc);if(options.length!==1)throw Error('自动结果不唯一：'+sc.id);this.choose(s,options[0].id);return;}const target=s.pending||sc.next;delete s.pending;if(!target)throw Error('缺少剧情出口：'+sc.id);this.go(s,target);return;}
  if(sc.type==='warning'){
   for(const p of this.data.people)if(p.warningScene===sc.id)s.people[p.id].warned=Number(s.values.回合);
   if(s.pendingEnd){const parent=this.scenes[s.pendingEnd];delete s.pendingEnd;this.afterScene(s,parent);return;}
  }
  if(sc.type==='rescue'&&s.resume){const to=s.resume;delete s.resume;delete s.pendingEnd;this.go(s,to);return;}
  for(const p of this.data.people){const q=s.people[p.id],consort=p.kind==='consort'&&q.favor<=this.data.rules.attack.consortFavor,active=this.personEligible(s,p.id)&&(this.relation(s,p.id)==='隐患'||consort);
   if(!active){q.hazard=0;delete q.warned;delete q.consortSince;continue;}
   if(consort&&q.consortSince===undefined)q.consortSince=Number(s.values.回合);
   if(q.warned===undefined&&p.warningScene&&p.warningScene!==sc.id){s.pendingEnd=sc.id;this.enter(s,p.warningScene);return;}
  }
  // A warning is an actual beat, including big jumps across the danger zone.
  for(const v of this.data.variables.filter(v=>!this.strict(s)&&v.visible&&v.type==='number')){
   const n=Number(s.values[v.id]),r=this.data.rules.warning;
   if(n<=r.low||(v.id!=='身'&&n>=r.high)){
    const key=`${v.id}:${n<=r.low?'low':'high'}`;
    if(s.warnings[key]===undefined){s.warnings[key]=Number(s.values.回合);s.pendingEnd=sc.id;this.enter(s,this.data.rules.warning.scene);return;}
   }else{delete s.warnings[`${v.id}:low`];delete s.warnings[`${v.id}:high`];}
  }
  const burst=this.sorted(3,s).find(e=>!s.completed?.includes(e.id)&&this.test(s,e.if));if(burst){this.finish(s,burst);return;}
  if(sc.checkpoint){const gate=this.sorted(4,s).find(e=>!s.completed?.includes(e.id)&&this.test(s,e.if));if(gate){this.finish(s,gate);return;}}
  let to=s.pending||sc.next||'@next';delete s.pending;if(to==='@resolve'){const matches=sc.exits?.filter(x=>{if(!this.test(s,x.if))return false;try{if(this.strict(s))transact(this,s,x.effects,x.costs,this.data.rules.contracts?.costs);return true;}catch(e){if(e instanceof PaymentError)return false;throw e;}})||[];if(this.strict(s)&&matches.length!==1)throw Error(`自动结果必须唯一：${sc.id}匹配${matches.length}条`);const exit=matches[0];if(!exit)throw Error(`剧情出口无匹配：${sc.id}`);if(exit.effects||exit.costs)commit(s,transact(this,s,exit.effects,exit.costs,this.data.rules.contracts?.costs));to=exit.goto;}this.go(s,to);
 }
 acknowledgeWarning(s:State){this.afterScene(s,this.scenes[s.current]);}
 go(s:State,to:string){if(this.ended(s)||s.ending&&isStage(this.endings[s.ending]))return;if(to==='@return'){const back=s.returns?.pop();if(!back)throw Error('没有可返回的剧情插入点');this.go(s,back);return;}if(to.startsWith('$')){const value=this.read(s,to.slice(1));if(typeof value!=='string')throw Error('动态出口必须为字符串');this.go(s,value);return;}const insert=this.data.scenes.filter(sc=>sc.before===to&&this.eligible(s,sc)).sort((a,b)=>(b.priority||0)-(a.priority||0)||(a.order||0)-(b.order||0)||a.id.localeCompare(b.id))[0];if(insert){(s.returns??=[]).push(to);this.enter(s,insert.id);return;}if(to==='@complete'){s.phase='complete';s.completion='这一卷，暂且到此。';return;}if(to==='@next')this.schedule(s);else if(this.endings[to])this.finish(s,this.endings[to]);else this.enter(s,to);}
 continue(s:State){const e=s.ending&&this.endings[s.ending];if(!e||!isStage(e))throw Error('本结局不能续行');s.completed=[...new Set([...(s.completed||[]),e.id])];delete s.ending;delete s.why;delete s.pending;this.go(s,e.continue||'@next');}
 finish(s:State,e:Ending){
  if(this.ended(s)||s.ending&&isStage(this.endings[s.ending]))return;
  const kind=endingClass(e);if(this.data.rules.network?.flow==='forward'&&((s.visits?.[e.id]||0)>0||Number(e.rank)<=Number(this.scenes[s.current]?.rank)))throw Error('终局必须在未来：'+e.id);if(this.data.rules.network){const entry=networkEffect(this.data,s,{set:e.modelEnter||{}},expr=>this.test(s,expr));entry.current=e.id;(entry.visits??={})[e.id]=(entry.visits?.[e.id]||0)+1;if(this.data.rules.network?.flow==='forward'&&Boolean(entry.values.dead)!==(kind==='death'))throw Error('终局生死事实不符：'+e.id);if(e.accept&&!this.test(entry,e.accept))throw Error('终局事实不成立：'+e.id);commit(s,entry);}
  if(kind==='death'){
   for(const[category,rules]of [['protection',e.protection],['rescue',e.rescues]] as const){
    const legal=(rules||[]).filter(r=>{if(!this.test(s,r.if)||(s.uses?.[category+':'+r.id]||0)>=(r.limit??1))return false;if(r.person){const p=s.people[r.person];if(!p||p.saved||!this.personEligible(s,r.person)||!this.scenes[s.current].cast.includes(r.person)||p.status!=='在朝'||this.relation(s,r.person)!=='柱石'||r.office&&p.office!==r.office)return false;}try{transact(this,s,r.effects,r.costs,this.data.rules.contracts?.costs);return true;}catch(err){if(err instanceof PaymentError)return false;throw err;}}).sort((a,b)=>(b.priority||0)-(a.priority||0));
    if(legal.length>1&&(legal[0].priority||0)===(legal[1].priority||0))throw Error('救援来源优先级不唯一：'+e.id);
    if(legal[0]){const r=legal[0],next=transact(this,s,r.effects,r.costs,this.data.rules.contracts?.costs);(next.uses??={})[category+':'+r.id]=(next.uses?.[category+':'+r.id]||0)+1;if(r.person)next.people[r.person].saved=true;delete next.pending;this.go(next,r.goto);commit(s,next);return;}
   }
   if(e.kind==='death'&&e.deathConfirmed!==true)throw Error('死亡类尚未确认实际死亡：'+e.id);
  }
  if(e.kind==='victory'&&(!e.goal||!this.test(s,e.goal)))throw Error('胜利目标尚未成立：'+e.id);
  if(e.domain&&e.kind!=='event'&&!this.strict(s)&&!['death','victory','departure'].includes(e.kind||'')){const p=this.data.people.find(p=>this.personEligible(s,p.id)&&!s.people[p.id].saved&&this.relation(s,p.id)==='柱石'&&p.saves?.includes(e.domain!)&&p.rescueScene&&!['死','下狱','罢免','叛'].includes(s.people[p.id].status));
   if(p){s.people[p.id].saved=true;this.effects(s,p.rescueEffects);const v=this.data.variables.find(v=>v.visible&&conditionPaths(e.if).includes(v.id)&&(Number(s.values[v.id])<=0||v.id!=='身'&&Number(s.values[v.id])>=100));if(v)s.values[v.id]=Number(s.values[v.id])<=0?this.data.rules.warning.low:this.data.rules.warning.high;
    s.resume=p.rescueScene&&this.scenes[p.rescueScene]?.next||s.pending||this.scenes[s.current]?.next||'@next';this.enter(s,p.rescueScene!);return;}
  }
  const next=this.strict(s)?transact(this,s,e.effects,{},this.data.rules.contracts?.costs):clone(s);if(!this.strict(s))this.effects(next,e.effects);
  if(kind==='death'){next.dead=true;if(Object.hasOwn(next.values,'身'))next.values.身=0;}
  next.ending=e.id;next.why=this.template(next,this.endingText(next,e).why,e);
  if(kind==='stage'){next.completed=[...new Set([...(next.completed||[]),e.id])];}
  else {if(!next.seen.includes(e.id))next.seen.push(e.id);next.phase='ended';next.queue=[];next.returns=[];delete next.pending;delete next.pendingEnd;delete next.resume;}
  if(kind!=='legacy'){const record:CollectionRecord={id:e.id,kind,ending_scope:e.ending_scope,valence:e.valence,story:this.data.meta?.id||'guanjia',revision:this.data.meta?.revision||'legacy-v0.3',scene:next.current,date:String(next.values.日期),seed:next.seed};if(!next.records?.some(r=>r.id===record.id&&r.kind===record.kind&&r.story===record.story&&r.revision===record.revision))(next.records??=[]).push(record);}
  commit(s,next);
 }
 template(s:State,text:string,e?:Ending){return text.replace(/\{([^{}]+)\}/g,(_,key)=>{if(key==='选择')return s.choice;if(key==='死因')return Object.entries(s.drain).sort((a,b)=>b[1]-a[1])[0]?.[0]||'病';if(key==='动手者'){const p=this.data.people.filter(p=>(!e?.culprit||p.kind===e.culprit.kind&&this.relation(s,p.id)===e.culprit.relation)&&!['死','罢免','下狱'].includes(s.people[p.id].status)).sort((a,b)=>s.people[b.id].power-s.people[a.id].power)[0];return p?.name||'宫中人';}return String(this.read(s,key));});}
 endingExtras(s:State){const selected:{id:string;text:string;group:string}[]=[],groups=new Set<string>();for(const e of [...this.data.epilogues||[]].sort((a,b)=>b.priority-a.priority))if(this.test(s,e.if)&&!groups.has(e.group)&&selected.length<2){selected.push(e);groups.add(e.group);}return {epilogues:selected,chronicle:(this.data.chronicle||[]).filter(e=>this.test(s,e.if))};}
 endingText(s:State,e:Ending):Ending{return {...e,...e.variants?.find(x=>this.test(s,x.if))};}
 titles(s:State,e:Ending){const r=this.data.rules.titles,score={...s.tags};for(const[k,n]of Object.entries(e.modifiers||{}))score[k]=(score[k]||0)+n;const tag=Object.keys(score).sort((a,b)=>score[b]-score[a]||a.localeCompare(b))[0];return {temple:e.temple||r.templeRules.find(x=>this.test(s,x.if))?.value||r.fallbackTemple,epithet:e.epithet||r.tags[tag]||r.fallbackEpithet};}
 draw(s:State,period:string,activity?:string){if(s.ending)return;
  let pool=this.data.scenes.filter(sc=>sc.period===period&&(!activity||sc.activity===activity)&&!['main','warning','attack','rescue'].includes(sc.type)&&this.eligible(s,sc));
  const t=Number(s.values.回合),r=this.data.rules.schedule;
  const capped=pool.filter(sc=>sc.cast.every(id=>{const turns=s.castTurns[id]||[];return !Array.from({length:r.maxConsecutive},(_,i)=>t-i-1).every(n=>turns.includes(n));}));pool=capped;
  const lastCelebrity=Math.max(0,...Object.values(s.castTurns).flat());
  const distinct=Object.keys(s.castTurns).length;
  if(t-lastCelebrity>=r.celebrityEvery||t<=r.distinctByTurn&&distinct<Math.min(r.distinctCount,t)){
   const fresh=pool.filter(sc=>sc.cast.some(p=>!s.castTurns[p]));const celebs=pool.filter(sc=>sc.cast.length);if(fresh.length)pool=fresh;else if(celebs.length)pool=celebs;else s.diagnostics.push(`回合${t} ${period}：名人调度无可用戏`);
  }
  if(!pool.length)throw Error(`空戏池：回合${t} ${period}/${activity||''}`);
  let n=this.roll(s)*pool.reduce((n,sc)=>n+sc.weight,0);const picked=pool.find(sc=>(n-=sc.weight)<0)||pool.at(-1)!;this.enter(s,picked.id);
 }
 schedule(s:State){if(s.ending)return;
  const turn=Number(s.values.回合),date=String(s.values.日期);
  for(const sc of this.data.scenes.filter(sc=>sc.period==='insert'&&!['warning','attack','rescue'].includes(sc.type)&&sc.once&&s.played[sc.id]===undefined&&this.test(s,sc.when?.if))){
   const expired=Boolean(sc.when?.turn&&turn>sc.when.turn[1]||sc.when?.date&&date>sc.when.date[1]);
   const due=(!sc.when?.turn||turn>=sc.when.turn[0])&&(!sc.when?.date||date>=sc.when.date[0]);
   const message=expired?`必达戏已过期且未演：${sc.id}`:due&&sc.cast.some(id=>!this.personEligible(s,id))?`必达戏对象失效，需结案分支：${sc.id}`:'';
   if(message&&!s.diagnostics.includes(message))s.diagnostics.push(message);
  }
  const required=this.data.scenes.filter(sc=>!['warning','attack','rescue'].includes(sc.type)&&sc.period==='insert'&&this.eligible(s,sc)).sort((a,b)=>(b.priority||0)-(a.priority||0)||(a.order||0)-(b.order||0)||(a.when?.turn?.[0]||0)-(b.when?.turn?.[0]||0)||a.id.localeCompare(b.id));
  while(s.queue.length){const id=s.queue.shift()!;const owner=this.data.people.find(p=>p.warningScene===id||p.attackScene===id);if(owner){const p=s.people[owner.id];const active=this.personEligible(s,owner.id)&&(this.relation(s,owner.id)==='隐患'||owner.kind==='consort'&&p.favor<=this.data.rules.attack.consortFavor);if(!active)continue;if(owner.attackScene===id&&(p.warned===undefined||Number(s.values.回合)<=p.warned))continue;}this.enter(s,id);return;}
  if(required.length){this.enter(s,required[0].id);return;}
  const r=this.data.rules.schedule;const p=r.periods[s.period];
  if(!p){this.turn(s);if(s.phase!=='complete')s.phase='turn';return;}
  if(p==='court'){s.court++;if(s.court>=r.court){s.period++;s.court=0;}this.draw(s,p);}
  else{if(!this.activities(s).length)throw Error(`活动空池：回合${s.values.回合} ${p}`);s.phase='activity';}
 }
 activities(s:State){if(s.ending)return [];const period=this.data.rules.schedule.periods[s.period];return this.data.rules.activities.filter(a=>a.period===period&&this.test(s,a.if)&&this.data.scenes.some(sc=>sc.activity===a.id&&sc.period===period&&this.eligible(s,sc)));}
 activity(s:State,id:string){if(s.ending)throw Error('本局已结束或正在阶段页');const a=this.activities(s).find(a=>a.id===id);if(!a)throw Error('活动不可用');this.draw(s,a.period,id);s.period++;}
 turn(s:State){if(s.ending)return;const next=Number(s.values.回合)+1,r=this.data.rules,t=r.turns.find(t=>t.turn===next);if(!t){if(r.onExhausted){this.go(s,r.onExhausted);return;}throw Error(`回合${next}无日期结算数据`);}
  if(this.strict(s))commit(s,transact(this,s,t.effects,{},r.contracts?.costs));else this.effects(s,t.effects);s.values.回合=next;s.values.日期=t.date;s.days+=t.days;s.values.金势=Math.max(0,Math.min(100,Number(s.values.金势)+t.jin));s.period=0;s.court=0;
  for(const p of this.data.people){const q=s.people[p.id];if(!this.personEligible(s,p.id)){q.hazard=0;delete q.warned;delete q.consortSince;continue;}const hazard=this.relation(s,p.id)==='隐患';q.hazard=hazard?q.hazard+1:0;
   const consort=p.kind==='consort'&&q.favor<=r.attack.consortFavor;
   if(!hazard&&!consort){delete q.warned;delete q.consortSince;delete q.attacked;continue;}
   if(consort&&q.consortSince===undefined)q.consortSince=next;
   if(q.warned===undefined&&p.warningScene){if(!s.queue.includes(p.warningScene))s.queue.push(p.warningScene);}
   else if(q.warned!==undefined&&next>q.warned&&(q.hazard>=r.attack.hazardTurns||(consort&&next>q.consortSince!))&&q.attacked!==next&&p.attackScene){s.queue.push(p.attackScene);q.attacked=next;}
  }
  if(next===r.schedule.distinctByTurn&&Object.keys(s.castTurns).length<r.schedule.distinctCount)s.diagnostics.push(`名人数不足：${Object.keys(s.castTurns).length}/${r.schedule.distinctCount}`);
 }
 history(s:State){return this.data.history.map(h=>({...h,status:s.rewrites[h.id]?'已改':h.tags.reduce((n,k)=>n+(s.deviation[k]||0),0)>=this.data.rules.historyBlur?'模糊':'清楚',actual:s.rewrites[h.id]}));}
}
