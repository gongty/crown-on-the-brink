import {conditionPaths,evaluate} from '../src/conditions';
import {Engine} from '../src/engine';
import type {Story,Shot} from '../src/schema';
export interface Issue {code:string;path:string;message:string;severity:'error'|'warning'}
export function validate(d:Story,ids:Set<string>):Issue[]{
 const out:Issue[]=[];const issue=(code:string,path:string,message:string,severity:'error'|'warning'='error')=>out.push({code,path,message,severity});
 const fields=(value:unknown,keys:string,path:string)=>{if(!value||typeof value!=='object'||Array.isArray(value)){issue('schema',path,'必须为对象');return;}for(const k of Object.keys(value))if(!keys.split(' ').includes(k))issue('unknown-field',path+'.'+k,'未定义字段，先更新剧本格式');};
 fields(d,'epilogues chronicle version entry meta variables people scenes endings history rules','root');
 const arr=['variables','people','scenes','endings','history'] as const;
 if(d.version!==1||typeof d.entry!=='string'||!d.rules||arr.some(k=>!Array.isArray(d[k]))){issue('schema','root','version/entry/rules及五个数组必填');return out;}
 for(const k of arr){const seen=new Set<string>();for(const x of d[k]){if(!x||typeof x.id!=='string'){issue('schema',k,'每项需要id');continue;}if(seen.has(x.id))issue('duplicate',x.id,'重复ID');seen.add(x.id);}}
 for(const v of d.variables){fields(v,'id label type min max initial visible',v.id);if(!['number','string','boolean'].includes(v.type)||typeof v.initial!==v.type||typeof v.visible!=='boolean'||v.type==='number'&&((v.initial as number)<(v.min??-Infinity)||(v.initial as number)>(v.max??Infinity)))issue('variable',v.id,'变量类型、初值、可见性或范围错误');}
 for(const p of d.people)fields(p,'id face name camp tier kind favor power status office temperament adult fictional window history saves rescueScene rescueEffects warningScene attackScene memory',p.id);
 fields(d.rules,'network contracts life art onExhausted tiers assignments warning relations spill attack schedule activities turns harem historyBlur titles media','rules');
 const engine=new Engine(d),s=engine.initial();if(d.meta?.mode==='official'&&(!d.meta.revision||d.rules.contracts?.version!==2))issue('runtime-contract','meta','正式新包需要稳定revision及rules.contracts.version:2');if(d.rules.life)issue('deprecated-life','rules.life','旧deathOnly字段已废弃，运行时不再执行','warning');
 const check=(c:string|undefined,path:string)=>{if(c===undefined)return;if(typeof c!=='string'){issue('condition',path,'条件必须为字符串');return;}try{evaluate(c,p=>engine.read(s,p));}catch(e){issue('condition',path,String(e));}};
 const effects=(list:string[]|undefined,path:string)=>{if(list===undefined)return;if(!Array.isArray(list)){issue('effect',path,'effects必须为数组');return;}try{for(const e of list)if(/^身\s*-/.test(e)&&!/@(纵欲|丹药|酒|累|病)$/.test(e))throw Error('龙体损耗须指定合法死因');engine.effects(engine.initial(),list);}catch(e){issue('effect',path,String(e));}};
 const costs=(list:Record<string,number>|undefined,path:string)=>{if(list!==undefined&&(!list||typeof list!=='object'||Array.isArray(list))){issue('cost',path,'costs必须为资源到非负数的对象');return;}for(const [key,value]of Object.entries(list||{})){try{if(typeof engine.read(s,key)!=='number'||!Number.isFinite(value)||value<0)issue('cost',path,'成本须扣已声明数值且非负：'+key);}catch(e){issue('cost',path,String(e));}}};
 if(d.rules.contracts){fields(d.rules.contracts,'version costs','rules.contracts');fields(d.rules.contracts.costs,'paymentResources arrears','rules.contracts.costs');for(const path of d.rules.contracts.costs.paymentResources||[])try{if(typeof engine.read(s,path)!=='number')issue('cost-policy',path,'付款资源须为数值');}catch(e){issue('cost-policy',path,String(e));}for(const debt of d.rules.contracts.costs.arrears||[])try{if(typeof engine.read(s,debt.resource)!=='number'||typeof engine.read(s,debt.target)!=='number')issue('cost-policy',debt.resource,'欠付源和目标均须为数值');}catch(e){issue('cost-policy',debt.resource,String(e));}}
 const assets=(sh:Shot[],path:string)=>{if(!Array.isArray(sh)){issue('schema',path,'shots必须为数组');return;}
  for(const [i,x]of sh.entries()){fields(x,'opening beforeIf caption if expression side prop variant bg cut video poster left right center fx place time music sfx say think card',`${path}.shots.${i}`);check(x.if,`${path}.shots.${i}`);check(x.beforeIf,`${path}.shots.${i}.before`);for(const k of ['bg','cut','video','poster','left','right','center','prop'] as const){const id=x[k];if(id&&!ids.has(id)&&!d.rules.media?.some(m=>m.id===id))issue('missing-art',path,id,d.rules.network?.flow==='forward'?'error':'warning');if(id?.startsWith('face.you'))issue('protagonist',path,'主角不出特写');}
   if(x.fx&&!['cut','shake','pan'].includes(x.fx))issue('camera',path,'像素不支持推近');
   for(const text of [x.say?.[1],x.think])if(text&&[...text].length>42)issue('length',path,'对白/心里话超过42字');
   if(x.card&&[...x.card.title].length>12)issue('length',path,'字幕卡标题超过12字');
   if(x.say&&(!Array.isArray(x.say)||x.say.length!==2))issue('schema',path,'say必须是[说话人,文字]');
  }
 };
 const links=new Map<string,string[]>();
 const all=new Set([...d.scenes.map(s=>s.id),...d.endings.map(e=>e.id)]);
 if(!all.has(d.entry))issue('entry','entry','入口不存在');
 const nextCandidates=d.scenes.filter(s=>!['rescue','warning','attack','rehearsal'].includes(s.type)).map(s=>s.id);
 for(const sc of d.scenes){
  fields(sc,'id opening resultBackground layout decisionCard resultLayout suppressPortraits rank auto skipIfOnly modelEnter script sourceNode contract before advanceDays onEnter exits name source order priority act type period activity when weight once cooldown cast tension beat danger shots choice next checkpoint',sc.id);
  if(sc.resultBackground&&!ids.has(sc.resultBackground))issue('missing-art',sc.id,sc.resultBackground);
  if(sc.layout!==undefined&&sc.layout!=='decision_card'||sc.resultLayout!==undefined&&sc.resultLayout!=='decision_card')issue('layout',sc.id,'未知呈现方式');
  if(sc.layout==='decision_card'&&!sc.decisionCard)issue('decision-card',sc.id,'决策卡缺少正文');
  if(sc.decisionCard){const card=sc.decisionCard;fields(card,'hook beats echoes thought warning',sc.id+'.decisionCard');if(typeof card.hook!=='string'||!Array.isArray(card.beats)||!Array.isArray(card.echoes))issue('decision-card',sc.id,'需短处境、对话及条件回声数组');else{for(const b of card.beats){fields(b,'speaker text if displayName nameCases',sc.id+'.decisionCard.beat');if(typeof b.speaker!=='string'||typeof b.text!=='string')issue('decision-card',sc.id,'对话需说话者和原文');check(b.if,sc.id);for(const c of b.nameCases||[])check(c.if,sc.id);}for(const e of card.echoes){fields(e,'if text',sc.id+'.decisionCard.echo');if(typeof e.text!=='string')issue('decision-card',sc.id,'回声需原文');check(e.if,sc.id);}}}
  const path=sc.id,targets:string[]=[];const add=(id:string)=>{if(id==='@next'||id.startsWith('$')){targets.push(...nextCandidates);return;}if(id==='@complete'||id==='@resolve'||id==='@return')return;if(!all.has(id))issue('broken-link',path,id);else targets.push(id);};
  if(!Array.isArray(sc.cast)||!Array.isArray(sc.shots)||!Number.isFinite(sc.weight)||sc.weight<=0||typeof sc.once!=='boolean'||!Number.isInteger(sc.act)||typeof sc.period!=='string'){issue('schema',path,'cast/shots/weight/once/act/period无效');continue;}
  if(!(sc.tension>=1&&sc.tension<=10)||!['铺垫','紧张','爆发','喘息','揭示','两难'].includes(sc.beat))issue('tension',path,'张力1–10，节拍必须合法');
  check(sc.when?.if,path);effects(sc.onEnter,path);for(const ex of sc.exits||[]){check(ex.if,path);effects(ex.effects,path);costs(ex.costs,path);add(ex.goto);}assets(sc.shots,path);
  if(!sc.choice&&!sc.next)issue('dead-end',path,'没有选项和next');
  if(sc.before){if(!sc.once)issue('insert-once',path,'before插入戏必须once:true');if(!all.has(sc.before))issue('broken-link',path,sc.before);if(!sc.choice?.options.every(o=>o.goto==='@return')&&sc.next!=='@return')issue('insert-return',path,'插入戏须使用@return保留原分支');}
  if(sc.next)add(sc.next);for(const o of sc.choice?.options||[])for(const effect of o.effects||[])if(effect.startsWith('旗标.下一场 = '))add(effect.slice('旗标.下一场 = '.length));
  const opts=sc.choice?.options||[];if(sc.type==='resolution'&&!sc.auto&&(sc.choice||sc.next!=='@resolve'||!sc.exits?.length))issue('resolution',path,'自动结果应无choice，next为@resolve并有exits');
  if(sc.choice&&(!Array.isArray(opts)||opts.length<(d.rules.network?1:2)||opts.length>(d.rules.network?8:4)))issue('options',path,'每场2–4选项');
  if(sc.choice?.timer){if(sc.choice.timer<3||sc.choice.timer>8)issue('timer',path,'限时3–8秒');if(!opts.some(o=>o.id===sc.choice?.default&&!o.if&&!o.visibleIf&&!o.costs&&!o.conditionalEffects&&o.limit===undefined&&!o.lock?.checks?.length))issue('timer',path,'默认选项必须存在且无条件');}
  if(sc.type==='main'&&(sc.contract===1||d.rules.contracts?.version!==2)){
   if(!opts.some(o=>o.tags?.includes('史书')&&!o.if))issue('history-option',path,'主线缺无条件史书选项');
   if(sc.shots.filter(x=>x.say||x.think).length<3)issue('thin-dialogue',path,'主线对白不足3句');
   if(!sc.shots.some(x=>x.if))issue('echo',path,'主线缺条件回响');
  }
  const signatures=new Set<string>(),oid=new Set<string>();let lethal=0;
  for(const o of opts){fields(o,'feedback id modelEffect context visibleIf lock costs conditionalEffects limit text if tags effects goto shots preview visit posthumous deviation rewrite risk',path+'.'+o.id);if(o.feedback!==undefined&&(typeof o.feedback!=='string'||[...o.feedback].length>28))issue('feedback',path+'.'+o.id,'短反馈须为不超过28字的文字');if(oid.has(o.id))issue('duplicate-option',path,o.id);oid.add(o.id);if(typeof o.text!=='string'||[...o.text].length>24)issue('length',path,'选项超过24字或不是文字');
   if(o.visit&&(!d.rules.harem||!d.people.some(p=>p.id===o.visit&&['consort','empress'].includes(p.kind))))issue('visit',path,'visit须有后宫人物和rules.harem');if(!o.goto){issue('dead-end',path,o.id);continue;}add(o.goto);costs(o.costs,path);check(o.if,path);check(o.visibleIf,path);effects(o.effects,path);if(o.limit!==undefined&&(!Number.isInteger(o.limit)||o.limit<1))issue('option-limit',path,'选项次数须为正整数');if(o.lock){fields(o.lock,'reason facts checks prepare rewind',path+'.lock');if(!o.lock.reason)issue('lock-reason',path,'锁因不能为空');}for(const c of o.conditionalEffects||[]){fields(c,'if effects costs',path+'.conditionalEffects');check(c.if,path);effects(c.effects,path);costs(c.costs,path);}for(const c of o.lock?.checks||[]){try{engine.read(s,c.path);}catch(e){issue('lock-path',path,String(e));}}for(const link of o.lock?.prepare||[])if(!opts.some(o=>o.id===link.option))issue('prepare-link',path,link.option);for(const link of o.lock?.rewind||[])if(!all.has(link.scene))issue('broken-link',path,link.scene);if(o.shots)assets(o.shots,path);
   const sig=JSON.stringify([o.modelEffect,o.if,o.goto,o.effects||[],o.shots||[],o.deviation||{},o.rewrite||{},o.posthumous||[],o.risk||[]]);if(signatures.has(sig))issue('fake-choice',path,o.id);signatures.add(sig);
   if((engine.endings[o.goto]?.door===1&&engine.endings[o.goto]?.kind!=='event')||o.risk?.length)lethal++;
   for(const r of o.risk||[]){check(r.if,path);if(!engine.endings[r.ending])issue('broken-link',path,r.ending);else targets.push(r.ending);if(r.chance<0||r.chance>1)issue('risk',path,'概率须0–1');}
  }
  if(!d.rules.network&&lethal>opts.length/3)issue('lethal-ratio',path,'即死选项超过三分之一');if(!d.rules.network&&lethal&&(!sc.danger||!sc.shots.some(s=>s.say||s.think)))issue('danger',path,'缺危险暗示，需要人工复核实际字幕');
  for(const p of sc.cast){const who=d.people.find(x=>x.id===p);if(!who)issue('person',path,p);else if(sc.when?.date&&who.window&&(sc.when.date[1]<who.window[0]||sc.when.date[0]>who.window[1]))issue('celebrity-window',path,p);}
  if(sc.checkpoint)targets.push(...d.endings.filter(e=>e.door===4).map(e=>e.id));links.set(path,targets);
 }
 for(const p of d.people){if(p.favor<0||p.favor>100||p.power<0||p.power>100)issue('person-range',p.id,'好感/权须0–100');if(['consort','empress'].includes(p.kind)&&p.adult!==true)issue('adult',p.id,'后宫人物必须成年人');if(p.kind==='consort'&&!p.temperament)issue('temperament',p.id,'妃嫔必须有性子');for(const k of ['rescueScene','warningScene','attackScene'] as const)if(p[k]&&!engine.scenes[p[k]!])issue('broken-link',p.id,p[k]!);effects(p.rescueEffects,p.id);}
 const domains:Record<string,string[]>={military:['兵变','城破','刺客'],civil:['群臣废立','民变'],empress:['宫斗','毒酒']};
 for(const p of d.people)for(const domain of p.saves||[])if(!domains[p.kind]?.includes(domain))issue('rescue-domain',p.id,'救驾领域与身份不符：'+domain);
 for(const e of d.endings){fields(e,'id suppressPortraits rank ending_scope valence accept modelEnter script sourceNode contract protection rescues goal variants deathConfirmed effects kind continue no name category door priority if domain scene shots history historian why temple epithet modifiers culprit',e.id);if(d.meta?.mode==='official'&&!['victory','death','departure','stage'].includes(e.kind||''))issue('ending-kind',e.id,'正式新稿须明确victory/death/departure/stage');if(e.kind==='death'&&!e.deathConfirmed)issue('death-proof',e.id,'死亡类须确认实际死亡');if(['victory','death','departure'].includes(e.kind||'')&&e.continue)issue('terminal-continue',e.id,'终局不能配置continue');if(e.kind==='victory'&&!e.goal)issue('victory-goal',e.id,'胜利类须定义实际目标');check(e.goal,e.id);check(e.accept,e.id);check(e.if,e.id);effects(e.effects,e.id);assets(e.shots,e.id);if(e.continue&&!e.continue.startsWith('@')&&!e.continue.startsWith('$')&&!all.has(e.continue))issue('broken-link',e.id,e.continue);if(['stage','event','milestone'].includes(e.kind||'')&&!e.continue)issue('event-exit',e.id,'活人事件必须有续行出口');if(![1,2,3,4].includes(e.door)||!Number.isFinite(e.priority))issue('ending',e.id,'门/优先级无效');if([...e.history].length>40||[...e.historian].length>80)issue('length',e.id,'史书/史臣曰超过上限');for(const v of e.variants||[])check(v.if,e.id);for(const r of [...(e.protection||[]),...(e.rescues||[])]){fields(r,'id if goto priority person office limit effects costs',e.id+'.rescue');if(!r.id||!r.if)issue('rescue-condition',e.id,'保护/救援需要稳定id和明确条件');check(r.if,e.id);effects(r.effects,e.id);costs(r.costs,e.id);if(!all.has(r.goto))issue('broken-link',e.id,r.goto);if(r.person&&!d.people.some(p=>p.id===r.person))issue('person',e.id,r.person);if(r.limit!==undefined&&(!Number.isInteger(r.limit)||r.limit<1))issue('rescue-limit',e.id,'救援次数须为正整数');}if(e.scene){if(!engine.scenes[e.scene])issue('broken-link',e.id,e.scene);}
  if(e.shots.length<2&&!e.scene)issue('ending-shots',e.id,'结局应有2–4镜头','warning');
  try{engine.template(s,e.why,e);}catch(err){issue('why-template',e.id,String(err));}
 }
 if(d.rules.network?.flow==='forward'){const ranks=new Map([...d.scenes,...d.endings].map(n=>[n.id,n.rank]));for(const sc of d.scenes){if(sc.type==='hub')issue('forward-hub',sc.id,'单向版无办事中心');if(!sc.auto&&(sc.choice!.options.length<2||sc.choice!.options.length>3))issue('forward-options',sc.id,'普通事件须2–3项');for(const o of sc.choice?.options||[]){if(Number(ranks.get(o.goto))<=Number(sc.rank))issue('forward-rank',sc.id+'.'+o.id,'出边必须严格向前');if(o.lock?.rewind?.length)issue('forward-rewind',sc.id,'不允许回溯准备');}}for(const e of d.endings)if(!e.ending_scope||!e.valence)issue('ending-scope',e.id,'终局缺意义分类');}
 // Conservative topology: dynamic @next is a superset, not a satisfiability proof.
 for(const sc of d.scenes.filter(s=>s.before)){for(const targets of links.values())if(targets.includes(sc.before!))targets.push(sc.id);links.set(sc.id,[sc.before!]);}
 for(const e of d.endings)if(e.continue||e.protection||e.rescues)links.set(e.id,[e.continue,...(e.protection||[]).map(r=>r.goto),...(e.rescues||[]).map(r=>r.goto)].filter(Boolean) as string[]);
 const reachable=new Set<string>();const visit=(id:string)=>{if(reachable.has(id))return;reachable.add(id);for(const n of links.get(id)||[])visit(n);};visit(d.entry);for(const id of d.meta?.rehearsals||[])visit(id);for(const preview of d.meta?.previews||[])visit(preview.entry);
 for(const p of d.people)for(const id of [p.warningScene,p.attackScene,p.rescueScene])if(id)visit(id);visit(d.rules.warning.scene);
 for(const e of d.endings)if(e.door===2||e.door===3)visit(e.id);
 for(const sc of d.scenes)if(!reachable.has(sc.id))issue('unreachable',sc.id,'保守图上走不到','warning');
 for(const e of d.endings)if(!reachable.has(e.id))issue('orphan-ending',e.id,'保守图上无入边','warning');
 let can=new Set([...d.endings.map(e=>e.id),...d.scenes.filter(s=>s.next==='@complete'||s.choice?.options.some(o=>o.goto==='@complete')).map(s=>s.id)]);let changed=true;while(changed){changed=false;for(const [id,ts]of links)if(!can.has(id)&&ts.some(t=>can.has(t))){can.add(id);changed=true;}}
 for(const sc of d.scenes)if(!can.has(sc.id)&&!['warning','attack','rescue'].includes(sc.type))issue('no-ending-path',sc.id,'无结局路径，可能为封闭循环');
 const text=JSON.stringify(d.scenes)+JSON.stringify(d.endings);if(/奸淫|轮奸|强奸|裸体|裸露器官|肢解|鲜血喷|伤口特写|自缢|割腕|跳井|割喉|金狗|金贼/.test(text))issue('boundary','content','底线关键词命中，须人工审核');
 const reads=[...d.endings.flatMap(e=>[e.if,e.goal,...(e.protection||[]).map(r=>r.if),...(e.rescues||[]).map(r=>r.if),...(e.variants||[]).map(r=>r.if)]),...(d.rules.art?.variants||[]).map(x=>x.if),...d.scenes.flatMap(s=>[s.when?.if,...(s.exits||[]).map(x=>x.if),...s.shots.map(s=>s.if),...(s.choice?.options||[]).map(o=>o.if)])].filter(Boolean).flatMap(s=>conditionPaths(s!));
 for(const v of d.variables.filter(v=>v.id.startsWith('旗标.')))if(!reads.includes(v.id))issue('flag-echo',v.id,'旗标未在条件中回响','warning');
 for(const t of d.rules.turns)effects(t.effects,`turn.${t.turn}`);
 return out;
}
