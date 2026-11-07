import{readFileSync}from'node:fs';
/** Retain explicit old diagnostic fixtures, but use independently replayed v49
 * complete witnesses. New flags are absent only at old pre-final checkpoints.
 * These fixtures are executed anew by tests; old author conclusions are not reused.
 */
export function loadV49Checks(root:string){
 const base=JSON.parse(readFileSync(root+'/docs/剧本/v4帝王决策/实玩评测/v48验证/最终专项验证.json','utf8'));
 const current=JSON.parse(readFileSync(root+'/docs/剧本/v4帝王决策/验证/最终专项验证.json','utf8'));
 if(current._verification?.version!=='forward-v4.9')throw Error('v49 fixtures require the promoted v49 checks');
 function replaceWitnesses(value:any,path=''){if(!value||typeof value!=='object')return;for(const[key,child]of Object.entries(value)){const pointer=path+'/'+key,row=current.v49_reexecuted_historical_complete_witnesses[pointer];if(row)value[key]=row.current_replayed_witness;else replaceWitnesses(child,pointer);}}
 replaceWitnesses(base);
 function addFlags(value:any){if(!value||typeof value!=='object')return;if(value.values&&typeof value.values.guan==='number'){value.values.late_life??='';value.values.two_armies_shared??=false;}for(const child of Object.values(value))addFlags(child);}
 addFlags(base);return{...base,...current};
}
