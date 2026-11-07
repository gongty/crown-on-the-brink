import type {Asset} from './art';
import type {Shot,State,Story} from './schema';
/** Only entries belonging to choices already made may supply default feedback. */
export function currentFeedback(state:State,story:Story){
 let text='';for(const entry of state.outcome?.entries||[]){if(!state.path.some(p=>p.scene===entry.scene&&p.option===entry.option))continue;const value=entry.feedback??story.scenes.find(s=>s.id===entry.scene)?.choice?.options.find(o=>o.id===entry.option)?.feedback;if(value?.trim())text=value;}
 return text;
}
export function staticCut(shot:Shot,assets:Record<string,Asset>){const a=shot.cut&&assets[shot.cut];return Boolean(a&&!a.preview_video&&/\.(png|webp|jpe?g)$/i.test(a.file||''));}
/** This is fed the committed presentation's shots, never the next scene's assets. */
export function lastStaticCut(shots:Shot[],test:(condition?:string)=>boolean,assets:Record<string,Asset>){let id:string|undefined;for(const shot of shots)if(test(shot.if)&&staticCut(shot,assets))id=shot.cut;return id;}
