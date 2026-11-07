import {copyReceipt,hasReceiptChanges} from './receipts';
import type {State,EffectReceipt} from './schema';
import type {DecisionRow} from './decision';
/** Idempotent presentation log, separate from the model's effects and random state. */
export function recordReaction(state:State,scene:string,option:string,rows:DecisionRow[],visuals:string[]=[],carry=true,receipt?:EffectReceipt,feedback?:string){
 const text=rows.map(r=>(r.displayName||r.speaker?(r.displayName||r.speaker)+'：':'')+r.text).join(' ');if(!text&&!hasReceiptChanges(receipt)&&!feedback?.trim())return;
 const records=state.reactions??=[];let entry=records.find(r=>r.scene===scene&&r.option===option);
 if(!entry){entry={scene,option,text,...(feedback!==undefined?{feedback}:{}),visuals:[...visuals],...(receipt?{receipt:copyReceipt(receipt)}:{})};records.push(entry);}else if(!entry.receipt&&receipt)entry.receipt=copyReceipt(receipt);if(entry.feedback===undefined&&feedback!==undefined)entry.feedback=feedback;
 if(!carry)return;
 const outcome=state.outcome??={beforeValues:{...state.values},entries:[]};
 const cached=outcome.entries.find(r=>r.scene===scene&&r.option===option);if(!cached)outcome.entries.push({...entry,visuals:[...entry.visuals],...(entry.receipt?{receipt:copyReceipt(entry.receipt)}:{})});else if(!cached.receipt&&entry.receipt)cached.receipt=copyReceipt(entry.receipt);if(cached&&cached.feedback===undefined&&entry.feedback!==undefined)cached.feedback=entry.feedback;
}
