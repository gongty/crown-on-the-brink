import type {CollectionRecord,Scene,State,Story} from './schema';
export function canSkipOpening(records:CollectionRecord[]|undefined,story:Story){return Boolean(records?.some(r=>r.story===(story.meta?.id||'guanjia')&&r.kind!=='stage'));}
/** The persisted flag affects presentation of the automatic prefix only. */
export function skipIntroPresentation(state:State,story:Story,scene:Scene){
 return Boolean(state.introSkipped&&scene.auto&&state.path.every(p=>story.scenes.find(s=>s.id===p.scene)?.auto));
}
