import type {Story,State,Shot} from './schema';
export interface Asset {loop?:boolean;ms?:number;frames?:number;duration_ms?:number;preview_video?:string;first_frame?:string;last_frame?:string;gif?:string;encoding_fps?:number;file?:string;still?:string;w?:number;h?:number;poster?:string;kind?:string;status?:string;note?:string}
export function variantId(id:string,shot:Shot,state:State,data:Story,assets:Record<string,Asset>,test:(s:string)=>boolean){const variant=shot.variant||data.rules.art?.variants?.find(x=>test(x.if))?.value;if(variant&&assets[`${id}.${variant}`])return `${id}.${variant}`;return id;}
export function portrait(data:Story,who:string,expression='calm',side='right',assets:Record<string,Asset>){const p=data.people.find(p=>p.id===who);if(!p)return;const base=p.face||p.id;const target=`face.${base}.${expression}${side==='left'?'.right':''}`;const calm=`face.${base}.calm${side==='left'?'.right':''}`;return assets[target]?target:assets[calm]?calm:side==='left'?undefined:assets[`face.${base}.calm`]?`face.${base}.calm`:undefined;}
export interface ClipSpec {id:string;src?:string;poster?:string;lastFrame?:string;durationMs:number;pixel:boolean;loop:false}
export function resolveClip(id:string,assets:Record<string,Asset>,media:{id:string;file:string;poster:string}[]=[]):ClipSpec|undefined {
 const a=assets[id],fallback=media.find(m=>m.id===id);const src=a?.preview_video||(a?.file?.endsWith('.mp4')?a.file:undefined);
 if(!src&&!fallback)return;
 return {id,src:src?'assets/'+src:fallback?.file,poster:a?.poster||a?.still,lastFrame:a?.last_frame,durationMs:a?.duration_ms||Math.max(0,(a?.frames||0)*(a?.ms||0)),pixel:id.startsWith('cut.'),loop:false};
}
