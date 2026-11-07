import type {Engine} from './engine';
import type {Option,State} from './schema';
export const COMMAND_STATS=[['guan','官'],['bing','兵'],['min','民'],['qian','钱'],['shen','身']]as const;
export interface CommandDelta {id:string;label:string;delta:number}
export interface CommandFloorLimit {id:string;label:string;text:string}
/** Preview the exact direct transaction. Never enter the next scene or simulate an outcome. */
export function commandDeltas(engine:Engine,before:State,option:Option,enabled:boolean):CommandDelta[]{
 if(!enabled)return [];
 const next=engine.plan(before,option);
 return COMMAND_STATS.map(([id,label])=>({id,label,delta:Number(next.values[id])-Number(before.values[id])}));
}
/** Explain a real direct loss stopped at its floor; zero change alone is not a cost. */
export function commandFloorLimits(engine:Engine,before:State,option:Option,enabled:boolean,deltas?:CommandDelta[]):CommandFloorLimit[]{
 if(!enabled||!option.modelEffect)return [];
 const actual=deltas??commandDeltas(engine,before,option,true),effect=option.modelEffect,blocks=[effect,...(effect.conditional||[]).filter(c=>engine.test(before,c.if))];
 return actual.flatMap(({id,label,delta})=>{
  const floor=engine.data.variables.find(v=>v.id===id)?.min;
  if(delta!==0||floor===undefined||!Number.isFinite(floor)||before.values[id]!==floor||blocks.some(b=>Object.hasOwn(b.set||{},id)))return [];
  // Match the direct network transaction's selected additive blocks and tiers.
  let downward=0;for(const block of blocks){const value=block.add?.[id];if(value!==undefined)downward+=typeof value==='number'?value:(value.startsWith('-')?-1:1)*engine.data.rules.tiers[value.replace(/^-/,'')];}
  return downward<0?[{id,label,text:'已最低'}]:[];
 });
}
