import {effectReceipt,copyReceipt} from './receipts';
import {clone,Engine,endingClass} from './engine';
import type {State,Story,CollectionRecord,EffectReceipt} from './schema';
export interface Library {nonBodyLowHintShown?:boolean;records?:CollectionRecord[];legacySeen?:string[];seen:string[];people:Record<string,{name:string;states:string[]}>;nodes:Record<string,{visits?:State[];state:State;choices:Record<string,string>;turn:number}>}
export function emptyLibrary():Library{return {records:[],legacySeen:[],seen:[],people:{},nodes:{}};}
export function migrateState(old:State,data:Story):State {
 const recovered=new Map<string,EffectReceipt>();
 if(old.version!==1)throw Error('存档版本暂不兼容');if(!data.scenes.some(s=>s.id===old.current)&&!(old.ending===old.current&&data.endings.some(e=>e.id===old.current)))throw Error(`当前场景已移除：${old.current}`);
 if(data.rules.network?.flow==='forward'){const eng=new Engine(data),profile=old.profile||[];if(profile.some(id=>!old.records?.some(r=>r.id===id&&r.story===data.meta?.id&&r.revision===data.meta?.revision&&eng.endings[id]?.ending_scope==='main')))throw Error('跨局档案缺少真实主线记录');const replay=eng.initial(old.seed,[],(old.records||[]).filter(r=>profile.includes(r.id)));eng.enter(replay,data.entry);for(const step of old.path){if(replay.current!==step.scene)throw Error('存档路径不连续');const scene=eng.scenes[step.scene],option=scene.choice?.options.find(o=>o.id===step.option);if(!option)throw Error('存档命令已变化');const before=clone(replay.values),planned=scene.auto?undefined:eng.plan(replay,option).values;eng.choose(replay,step.option);recovered.set(step.scene+':'+step.option,effectReceipt(scene.auto?'after':'order',before,replay.values,planned||replay.values));}if(replay.current!==old.current||data.rules.network.stateKeys.some(k=>replay.values[k]!==old.values[k])||JSON.stringify(replay.visits)!==JSON.stringify(old.visits))throw Error('存档状态与路径不一致');if(Object.values(old.visits||{}).some(n=>n!==1))throw Error('单向故事不能重复到访');}
 const next=new Engine(data).initial(old.seed,old.seen);Object.assign(next,clone(old));next.values={};
 for(const r of [...next.reactions||[],...next.outcome?.entries||[]]){const receipt=recovered.get(r.scene+':'+r.option);if(!r.receipt&&receipt)r.receipt=copyReceipt(receipt);}if(next.presentation&&!next.presentation.receipt){const receipt=recovered.get(next.presentation.scene+':'+next.presentation.option);if(receipt)next.presentation.receipt=copyReceipt(receipt);}
 for(const v of data.variables){const value=old.values[v.id]??v.initial;if(typeof value!==v.type)throw Error(`变量类型变化：${v.id}`);if(typeof value==='number'&&(!Number.isFinite(value)||value<(v.min??-Infinity)||value>(v.max??Infinity)))throw Error('变量范围变化，需要显式调整：'+v.id);next.values[v.id]=value;}
 const initial=new Engine(data).initial();next.people={};for(const p of data.people)next.people[p.id]=clone(old.people[p.id]||initial.people[p.id]);
 for(const id of next.returns||[])if(!data.scenes.some(s=>s.id===id)&&!data.endings.some(e=>e.id===id))throw Error('插入返回节点已移除：'+id);
 if(next.queue.some(id=>!data.scenes.some(s=>s.id===id)))throw Error('旧事件队列含已移除场景，原档保留，请回溯兼容节点');next.shot=Math.min(next.shot,(data.scenes.find(s=>s.id===next.current)?.shots.length||0));
 if(next.ending&&!data.endings.some(e=>e.id===next.ending))throw Error('旧终局已移除，原记录保留，请从兼容节点回溯');
 if(old.presentation&&!data.scenes.some(s=>s.id===old.presentation!.scene&&s.choice?.options.some(o=>o.id===old.presentation!.option)))throw Error('选择演出来源已变化，原档保留');
 next.uses=clone(old.uses||{});next.records=clone(old.records||[]);next.legacySeen=[...new Set([...(old.legacySeen||[]),...(old.contractVersion===2?[]:old.seen)])];next.contractVersion=2;
 if(next.ending){const kind=endingClass(new Engine(data).endings[next.ending]);if(['victory','death','departure'].includes(kind)&&!next.records.some(r=>r.id===next.ending&&r.kind===kind&&r.story===(data.meta?.id||'guanjia')&&r.revision===(data.meta?.revision||'legacy-v0.3')))throw Error('旧终局缺少同版本分类，原记录保留，请从兼容节点回溯');}
 return next;
}
export function normalizeLibrary(raw:Library):Library{const next=clone(raw);next.records??=[];next.legacySeen=[...new Set([...(raw.legacySeen||[]),...(!raw.records?raw.seen:[])])];return next;}
export function remember(library:Library,state:State,eng:Engine){
 library.records??=[];for(const record of state.records||[])if(!library.records.some(r=>r.id===record.id&&r.kind===record.kind&&r.story===record.story&&r.revision===record.revision))library.records.push(clone(record));library.legacySeen=[...new Set([...(library.legacySeen||[]),...(state.legacySeen||[])])];
 library.seen=[...new Set([...library.seen,...state.seen])];
 if(!state.ending&&state.phase==='scene'&&eng.scenes[state.current]&&state.played[state.current]!==undefined){const prior=library.nodes[state.current],visits=clone(prior?.state.seed===state.seed?(prior.visits||[prior.state]):[]),last=visits.at(-1);if(last&&last.seed===state.seed&&last.path.length===state.path.length)visits[visits.length-1]=clone(state);else visits.push(clone(state));library.nodes[state.current]={state:clone(state),visits:visits.slice(-30),choices:prior?.choices||{},turn:Number(state.values.回合)};}
 for(const row of state.path){const sc=eng.scenes[row.scene],option=sc?.choice?.options.find(o=>o.id===row.option);if(library.nodes[row.scene]&&option)library.nodes[row.scene].choices[row.option]=option.goto;}
 for(const [id] of Object.entries(state.castTurns)){const p=eng.data.people.find(p=>p.id===id);if(!p||!state.people[id])continue;const saved=library.people[id]||{name:p.name,states:[]};saved.states=[...new Set([...saved.states,`${state.people[id].office} · ${state.people[id].status}`])];library.people[id]=saved;}
}
