import {Engine,isStage} from '../src/engine';
import type {Story,State} from '../src/schema';
export function simulate(data:Story,runs=100){const eng=new Engine(data);
 return ['史书','随机','享乐'].map(bot=>{const distribution:Record<string,number>={},eventRuns:Record<string,number>={},firstTen:Record<string,number>={},errors:string[]=[],witnesses:Record<string,unknown>={},sceneRuns:Record<string,number>={},relations:Record<string,Set<string>>={};let seenFraction=0;const all:number[][]=[],diagnostics=new Set<string>();
  for(let i=0;i<runs;i++){let s=eng.initial(`${bot}:${i}`);eng.enter(s,data.entry);const tensions:number[]=[],scenes=new Set<string>();
   try{for(let step=0;step<500;step++){
    if(s.ending){if(isStage(eng.endings[s.ending])){eng.continue(s);continue;}break;}
    if(s.phase==='activity'){const as=eng.activities(s);if(!as.length)throw Error('活动空池');eng.activity(s,as[Math.floor(eng.roll(s)*as.length)].id);continue;}
    if(s.phase==='turn'){eng.schedule(s);continue;}
    const sc=eng.scenes[s.current];scenes.add(sc.id);if(['main','continuation'].includes(sc.type))tensions.push(sc.tension);
    for(const p of sc.cast)(relations[p]??=new Set()).add(eng.relation(s,p));
    if(sc.id===data.rules.warning.scene&&s.pendingEnd){eng.acknowledgeWarning(s);continue;}
    const opts=eng.options(s);if(!opts.length){eng.afterScene(s);continue;}
    const o=(bot==='史书'?opts.find(o=>o.tags?.some(t=>['史书','基线'].includes(t))):bot==='享乐'?opts.find(o=>o.tags?.includes('享乐')):null)||opts[Math.floor(eng.roll(s)*opts.length)];eng.choose(s,o.id);
   }
   if(!s.ending)throw Error('500步仍无结局：'+s.current+'；'+JSON.stringify(s.path.slice(-8)));distribution[s.ending]=(distribution[s.ending]||0)+1;if(i<10)firstTen[s.ending]=(firstTen[s.ending]||0)+1;witnesses[s.ending]??={seed:s.seed,path:s.path,events:s.completed,values:s.values};
   }catch(e){errors.push(`${s.seed}: ${String(e)}`);}
   for(const id of s.completed||[])eventRuns[id]=(eventRuns[id]||0)+1;
   scenes.forEach(id=>sceneRuns[id]=(sceneRuns[id]||0)+1);const nonmain=data.scenes.filter(s=>s.type!=='main'&&!['rescue','warning','attack','rehearsal'].includes(s.type));seenFraction+=nonmain.length?[...scenes].filter(id=>nonmain.some(x=>x.id===id)).length/nonmain.length:0;
   s.diagnostics.forEach(x=>diagnostics.add(x));all.push(tensions);
  }
  return {bot,runs,distribution,eventRuns,firstTen,errors:[...new Set(errors)],witnesses,sceneRuns,averageNonmainFraction:seenFraction/runs,relationships:Object.fromEntries(Object.entries(relations).map(([k,v])=>[k,[...v]])),tension:all[0],diagnostics:[...diagnostics]};
 });
}
