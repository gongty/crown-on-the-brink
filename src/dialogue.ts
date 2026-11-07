import type {DecisionRow} from './decision';
/** Render every matched fact verbatim; only genuine portrait bindings supply actors. */
export function mountDialogue(host:HTMLElement,rows:DecisionRow[],name:(id:string)=>string,template:(text:string)=>string,result=false,label='旨意已下',receiptLine?:string){
 host.replaceChildren();const doc=host.ownerDocument;
 if(result){const paper=doc.createElement('section');paper.className='decision-outcome';const heading=doc.createElement('div');heading.className='dialogue-name';heading.textContent=label;paper.append(heading);for(const row of rows){const p=doc.createElement('p');if(row.speaker){const who=doc.createElement('strong');who.textContent=(row.displayName||name(row.speaker))+'：';p.append(who);}p.append(doc.createTextNode(template(row.text)));paper.append(p);}host.append(paper);return;}
 const context=doc.createElement('div');context.className='dialogue-context'+(receiptLine?' has-receipt':'');
 for(const [kind,label]of [['previous','刚才'],['current','眼下']]as const){
  if(kind==='current'&&receiptLine){const receipt=doc.createElement('p');receipt.className='dialogue-receipt';const ink=doc.createElement('span');ink.className='context-ink';ink.textContent=receiptLine;receipt.append(ink);context.append(receipt);}
  const group=rows.filter(r=>r.kind!=='speech'&&(kind==='previous'?r.kind==='result':r.kind!=='result'));if(!group.length)continue;
  const p=doc.createElement('p');p.className='dialogue-'+kind;const ink=doc.createElement('span');ink.className='context-ink';const heading=doc.createElement('strong');heading.className='context-label';heading.textContent=label;ink.append(heading);
  for(const row of group){const span=doc.createElement('span');span.className='dialogue-'+row.kind;span.textContent=template(row.text);if(ink.childNodes.length>1)ink.append(doc.createTextNode(' '));ink.append(span);}p.append(ink);context.append(p);
 }host.append(context);
 for(const [i,row]of rows.filter(r=>r.kind==='speech').entries()){const speech=doc.createElement('section');speech.className='dialogue-speech';speech.dataset.speaker=row.speaker||'';speech.dataset.order=String(i);const paper=doc.createElement('div');paper.className='dialogue-paper';const who=doc.createElement('div');who.className='dialogue-name';who.textContent=row.displayName||name(row.speaker||'');const p=doc.createElement('p');p.textContent=template(row.text);paper.append(who,p);speech.append(paper);host.append(speech);}
}
/** Portrait slots depend only on the viewport, never on dialogue or command height. */
export function portraitSlot(width:number,height:number,dpr=1,side='left'){
 const short=height<680,scale=Math.min(width*(short?.28:.48)/96,height*.46/128),k=Math.max(1/dpr,Math.floor(scale*dpr)/dpr);
 return {width:96*k,height:128*k,top:Math.round(height*(side==='right'?(short?.40:.32):side==='center'?.43:(short?.40:.54)))};
}
/** Reflow paper text around stable portrait slots. */
export function fitDialogue(stage:HTMLElement){
 if(!stage.classList.contains('paper-dialogue'))return;
 const height=stage.clientHeight,width=stage.clientWidth,short=height<680,host=stage.querySelector<HTMLElement>('#line')!,commands=stage.querySelector<HTMLElement>('#choices')!,papers=[...host.querySelectorAll<HTMLElement>('.dialogue-speech')],actors=[...stage.querySelectorAll<HTMLElement>('.face')].filter(e=>e.childElementCount),context=host.querySelector<HTMLElement>('.dialogue-context');
 if(stage.classList.contains('result-card')){const out=host.querySelector<HTMLElement>('.decision-outcome');if(out)stage.style.setProperty('--outcome-total',out.offsetHeight+78+'px');return;}
 const stamp=width+'x'+height+'|'+host.textContent;if(stage.dataset.dialogueStamp!==stamp){stage.dataset.dialogueStamp=stamp;stage.classList.remove('compact-papers');}
 const actorFor=(speaker?:string)=>actors.find(a=>a.dataset.id?.startsWith('face.'+speaker+'.'));
 const firstActor=actorFor(papers[0]?.dataset.speaker)||actorFor(papers[1]?.dataset.speaker)||actors[0],firstSide=firstActor?.classList.contains('right')?'right':'left',secondSide=firstSide==='left'?'right':'left';
 const footerTop=height-commands.offsetHeight,contextBottom=context?context.offsetTop+context.offsetHeight:86,gap=short?8:14;
 let cursor=Math.max(height*(short?.19:.164),contextBottom+gap);
 const embedded=stage.classList.contains('embedded-cast');if(embedded)cursor=Math.max(cursor,height*.46);
 for(const a of actors){const slot=portraitSlot(width,height,devicePixelRatio||1,a.classList.contains('right')?'right':a.classList.contains('center')?'center':'left');
  a.style.width=slot.width+'px';a.style.height=slot.height+'px';a.style.bottom='auto';a.style.top=slot.top+'px';
 }
 const heads=actors.map(a=>({left:a.offsetLeft+a.offsetWidth*.28,right:a.offsetLeft+a.offsetWidth*.76,top:a.offsetTop+a.offsetHeight*.04,bottom:a.offsetTop+a.offsetHeight*.55}));
 const positions:{paper:HTMLElement;side:string;top:number;bottom:number}[]=[];
 for(const [i,p]of papers.entries()){const bound=actorFor(p.dataset.speaker),side=bound?(bound.classList.contains('right')?'right':'left'):(i%2===0?firstSide:secondSide);
  p.dataset.actorSide=side;p.dataset.hasActor=String(Boolean(bound));
  p.style.width='55%';p.style.right='auto';let top=short?cursor:Math.max(cursor,height*(i===0?.164:.374));
  if(short)p.style.left='22.5%';else{
   const sides=side==='right'?[.05,.40]:[.40,.05],candidates=[top,...heads.map(h=>h.bottom+10).filter(y=>y>top).sort((a,b)=>a-b)];let placed=false;
   for(const y of candidates){for(const x of sides){const left=width*x,right=left+p.offsetWidth;if(heads.some(h=>right>h.left&&left<h.right&&y<h.bottom&&y+p.offsetHeight>h.top))continue;p.style.left=x*100+'%';top=y;placed=true;break;}if(placed)break;}
   if(!placed)p.style.left=sides[0]*100+'%';
  }
  p.style.top=Math.round(top)+'px';positions.push({paper:p,side,top,bottom:top+p.offsetHeight});cursor=top+p.offsetHeight+(short?8:Math.max(16,height*.03));
 }
 // An explicit diagnostic for author/layout review; no clipping or silent fact removal.
 if((positions.at(-1)?.bottom||contextBottom)>footerTop-4&&!stage.classList.contains('compact-papers')){stage.classList.add('compact-papers');fitDialogue(stage);return;}stage.dataset.dialogueOverflow=String((positions.at(-1)?.bottom||contextBottom)>footerTop-4);stage.style.setProperty('--commands-top',footerTop+'px');
}
