import {Engine} from './engine';
import type {State,Story} from './schema';
export interface TreeTarget {id:string;name:string;ending:boolean}
export interface TreeDecision {id:string;name:string;visited:boolean;current:boolean;choices:{id:string;text:string;taken:boolean;target?:TreeTarget}[]}
/** Follow this life's actual path, never explore hypothetical automatic exits. */
export function compressedStoryTree(story:Story,state:State,snapshots:Record<string,State>={}){
 const e=new Engine(story),actual=state.path.filter(p=>e.scenes[p.scene]&&!e.scenes[p.scene].auto),visited=(id:string)=>Boolean(state.visits?.[id]),decisions:TreeDecision[]=[];
 const target=(id?:string):TreeTarget|undefined=>{if(!id||!visited(id))return;const scene=e.scenes[id],ending=e.endings[id];if(scene&&!scene.auto)return {id,name:scene.name||'旧事',ending:false};if(ending&&id===state.ending)return {id,name:ending.name,ending:true};};
 const currentId=e.scenes[state.current]?.auto?actual.at(-1)?.scene:state.current;
 for(const scene of story.scenes.filter(s=>!s.auto&&s.choice?.options.length)){
  const known=visited(scene.id),index=actual.findIndex(p=>p.scene===scene.id),step=actual[index],next=step?target(actual[index+1]?.scene||(e.scenes[state.current]?.auto?undefined:state.current)):undefined;
  const cached=snapshots[scene.id],valid=cached&&cached.current===scene.id&&cached.seed===state.seed&&JSON.stringify(cached.profile||[])===JSON.stringify(state.profile||[])&&cached.path.every((p,i)=>p.scene===state.path[i]?.scene&&p.option===state.path[i]?.option),snapshot=valid?cached:state.current===scene.id?state:undefined;
  const choices=known?(scene.choice?.options||[]).filter(o=>{if(!o.visibleIf)return true;try{return snapshot?e.test(snapshot,o.visibleIf):step?.option===o.id;}catch{return step?.option===o.id;}}).map(o=>({id:o.id,text:o.text,taken:step?.option===o.id,...step?.option===o.id&&next?{target:next}:{}})):[];
  decisions.push({id:scene.id,name:known?scene.name||'旧事':'？',visited:known,current:currentId===scene.id,choices});
 }
 const ending=state.ending&&e.endings[state.ending];return {decisions,ending:ending?{id:ending.id,name:ending.name}:undefined};
}
