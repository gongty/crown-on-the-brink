import type {Engine} from './engine';
import type {Ending,ReactionRecord,Shot,State,Story} from './schema';
export interface DecisionMemory {scene:string;title:string;choice:string;reactions:ReactionRecord[]}
/** Only actual decisions become headings; automatic consequences belong to the last decision. */
export function decisionMemories(state:State,story:Story){
 const scenes=new Map(story.scenes.map(s=>[s.id,s])),decisions:DecisionMemory[]=[],opening:ReactionRecord[]=[];
 for(const step of state.path){const scene=scenes.get(step.scene),option=scene?.choice?.options.find(o=>o.id===step.option);if(!scene||!option)continue;
  const reaction=state.reactions?.find(r=>r.scene===step.scene&&r.option===step.option);
  if(scene.auto){if(reaction)(decisions.at(-1)?.reactions||opening).push(reaction);continue;}
  decisions.push({scene:scene.id,title:scene.name||scene.id,choice:option.text,reactions:reaction?[reaction]:[]});
 }
 return {opening,decisions};
}
/** Use the final actually matched narrative paragraph, joining any caption pagination. */
export function endingCoda(engine:Engine,state:State,shots:Shot[],fallback:string){
 let paragraph:string[]=[],last='';
 for(const shot of shots){if(!engine.test(state,shot.if))continue;if(shot.bg||shot.cut||shot.video||shot.card)paragraph=[];
  const text=shot.caption||shot.think||shot.say?.[1];if(text){paragraph.push(engine.template(state,text));last=paragraph.join('');}
 }
 return last||fallback;
}
/** Reuse the existing matched/grouped extras, without a second playback or future inference. */
export function endingAfterwords(engine:Engine,state:State,ending:Ending,coda:string,historian:string){
 if(state.ending!==ending.id||!['main','personal'].includes(ending.ending_scope||''))return [];
 const normalize=(s:string)=>s.replace(/[\s，。；！？、：“”‘’（）,.!?;:'"()]/g,''),seen=[coda,historian].map(normalize).filter(Boolean),texts:string[]=[];
 for(const e of engine.endingExtras(state).epilogues){const text=engine.template(state,e.text),key=normalize(text);if(!key||seen.some(s=>s.includes(key)))continue;texts.push(text);seen.push(key);if(texts.length===2)break;}
 return texts;
}
