import type {Shot} from './schema';
export const TEXT_LAYOUT_VERSION=1;
const closing=/^[\p{Pe}\p{Pf}。，、；：！？…—,.!?;:]$/u;
const opening=/^[\p{Ps}\p{Pi}]$/u;
const quoteClose=/^[”’」』）》】\])}»]$/u;
const strong=/^[。！？!?；;\n]$/u;
const soft=/^[，,、：:]$/u;
/** Keep the source verbatim, prefer sentence boundaries, and never orphan closing punctuation. */
export function splitText(text:string,limit=42):string[]{
 if(!Number.isInteger(limit)||limit<2)throw Error('字幕页长度必须至少为2');
 const chars=[...text],n=chars.length;if(!n)return [];if(n<=limit)return [text];
 const count=[0];for(const c of chars)count.push(count.at(-1)!+Number(/[\p{L}\p{N}]/u.test(c)));
 const lexical=count[n]>0,cost=Array<number>(n+1).fill(Infinity),previous=Array<number>(n+1).fill(-1);cost[0]=0;
 for(let end=1;end<=n;end++){
  if(end<n&&(closing.test(chars[end])||opening.test(chars[end-1])))continue;
  let at=end-1;while(at>=0&&quoteClose.test(chars[at]))at--;
  const boundary=end===n||strong.test(chars[at]||'')?0:soft.test(chars[at]||'')?40:/\s/u.test(chars[end-1])?80:200;
  for(let start=Math.max(0,end-limit);start<end;start++){
   if(!Number.isFinite(cost[start])||lexical&&count[end]===count[start])continue;
   const length=end-start,short=Math.max(0,Math.min(8,Math.floor(limit/3))-length);
   const score=cost[start]+10000+boundary+short*short*100+(limit-length)**2/100;
   if(score<cost[end]){cost[end]=score;previous[end]=start;}
  }
 }
 if(previous[n]<0)throw Error('字幕无法安全分页，请检查连续标点');
 const pages:string[]=[];for(let end=n;end>0;){const start=previous[end];pages.push(chars.slice(start,end).join(''));end=start;}return pages.reverse();
}
/** Reflow cached text only; frozen image predicates and visual instructions remain unchanged. */
export function reflowTextShots(shots:Shot[]):Shot[]{
 const out:Shot[]=[];let group:Shot[]=[];
 const plain=(s:Shot)=>!s.bg&&!s.cut&&!s.video&&!s.card&&!s.left&&!s.right&&!s.center&&!s.prop&&(s.caption!==undefined||s.think!==undefined||s.say!==undefined);
 const key=(s:Shot)=>JSON.stringify({...s,caption:s.caption===undefined?undefined:'',think:s.think===undefined?undefined:'',say:s.say?[s.say[0],'']:undefined});
 const flush=()=>{if(!group.length)return;const first=group[0],text=group.map(s=>s.caption??s.think??s.say?.[1]??'').join('');for(const page of splitText(text))out.push({...first,...first.caption!==undefined?{caption:page}:first.think!==undefined?{think:page}:{say:[first.say![0],page] as [string,string]}});group=[];};
 for(const shot of shots){if(!plain(shot)){flush();out.push({...shot});continue;}if(group.length&&key(group[0])!==key(shot))flush();group.push(shot);}flush();return out;
}
