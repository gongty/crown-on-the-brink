import type {DecisionCard,Shot} from './schema';

export interface DecisionRow {kind:'situation'|'speech'|'echo'|'thought'|'result';text:string;speaker?:string;displayName?:string}
/** Presentation only: evaluate against the current snapshot without applying any effects. */
export function decisionRows(card:DecisionCard,test:(condition?:string)=>boolean):DecisionRow[]{
 const rows:DecisionRow[]=[];
 if(card.hook)rows.push({kind:'situation',text:card.hook});
 for(const echo of card.echoes)if(test(echo.if))rows.push({kind:'echo',text:echo.text});
 for(const beat of card.beats)if(test(beat.if))rows.push({kind:'speech',speaker:beat.speaker,text:beat.text,displayName:beat.nameCases?.find(c=>test(c.if))?.name||beat.displayName});
 if(card.thought)rows.push({kind:'thought',text:card.thought});
 if(card.warning&&card.warning!==card.hook)rows.push({kind:'echo',text:card.warning});
 return rows;
}
/** Join legacy text pages into one result without changing frozen image conditions. */
export function reactionRows(shots:Shot[],test:(condition?:string)=>boolean):DecisionRow[]{
 const rows:DecisionRow[]=[];
 for(const sh of shots){if(!test(sh.if))continue;const text=sh.caption??sh.think??sh.say?.[1];if(!text)continue;
  const row:DecisionRow={kind:sh.think?'thought':sh.say?'speech':'result',text,...sh.say?{speaker:sh.say[0]}:{}};
  const prev=rows.at(-1);if(prev&&prev.kind===row.kind&&prev.speaker===row.speaker)prev.text+=text;else rows.push(row);
 }
 return rows;
}
export function visualShot(sh:Shot):Shot {const {caption,think,say,card,...visual}=sh;return visual;}
export function mountDecision(host:HTMLElement,rows:DecisionRow[],name:(id:string)=>string,template:(text:string)=>string){
 host.replaceChildren();
 for(const row of rows){const p=host.ownerDocument.createElement('p');p.className='decision-'+row.kind;
  if(row.speaker){const who=host.ownerDocument.createElement('strong');who.textContent=(row.displayName||name(row.speaker))+'：';p.append(who);}
  p.append(host.ownerDocument.createTextNode(template(row.text)));host.append(p);
 }
}
