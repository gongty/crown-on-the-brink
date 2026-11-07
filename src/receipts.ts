import {COMMAND_STATS} from './command-preview';
import type {EffectReceipt,Scalar,State} from './schema';
export function visibleChanges(before:Record<string,Scalar>,after:Record<string,Scalar>){
 const changes:Record<string,number>={};for(const[id]of COMMAND_STATS){const delta=Number(after[id])-Number(before[id]);if(Number.isFinite(delta)&&delta)changes[id]=delta;}return changes;
}
/** Capture committed numbers only; a command's planned transaction excludes arrival effects. */
export function effectReceipt(scope:EffectReceipt['scope'],before:Record<string,Scalar>,after:Record<string,Scalar>,planned=after):EffectReceipt{
 const following=visibleChanges(planned,after);return {scope,changes:visibleChanges(before,planned),...(Object.keys(following).length?{following}:{})};
}
export function changesText(changes:Record<string,number>){return COMMAND_STATS.flatMap(([id,label])=>changes[id]?[label+(changes[id]>0?'+':'')+changes[id]]:[]).join(' ');}
export function receiptText(receipt?:EffectReceipt){if(!receipt)return '';const own=changesText(receipt.changes),after=receipt.following&&changesText(receipt.following);return [own?(receipt.scope==='order'?'旨意 ':'随后 ')+own:'',after?'随后 '+after:''].filter(Boolean).join('；');}
function add(total:Record<string,number>,changes:Record<string,number>){for(const[id]of COMMAND_STATS){total[id]=(total[id]||0)+(changes[id]||0);if(!total[id])delete total[id];}}
/** No extra line when there is no additional net change, or an old receipt is unknown. */
export function splitOutcome(outcome:State['outcome']){
 if(!outcome?.entries.length||outcome.entries.some(e=>!e.receipt))return;
 const order:Record<string,number>={},after:Record<string,number>={};let hasOrder=false;
 for(const e of outcome.entries){const r=e.receipt!;if(r.scope==='order'){hasOrder=true;add(order,r.changes);}else add(after,r.changes);if(r.following)add(after,r.following);}
 if(!hasOrder||!Object.keys(after).length)return;
 const causes=[...new Set(outcome.entries.filter(e=>e.receipt?.scope==='after'&&hasReceiptChanges(e.receipt)).map(e=>e.text.split(/[，,；;。！？!?]/,1)[0].trim()).filter(Boolean))],cause=causes.length===1&&[...causes[0]].length<=8?causes[0]:'';
 return {order,after,text:'旨意 '+(changesText(order)||'无增减')+' · 随后 '+(cause?cause+' ':'')+changesText(after)};
}
export function hasReceiptChanges(receipt?:EffectReceipt){return Boolean(receipt&&(Object.keys(receipt.changes).length||Object.keys(receipt.following||{}).length));}
export function copyReceipt(receipt:EffectReceipt):EffectReceipt{return {scope:receipt.scope,changes:{...receipt.changes},...(receipt.following?{following:{...receipt.following}}:{})};}
