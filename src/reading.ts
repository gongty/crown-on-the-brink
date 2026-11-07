import type {Scalar,State} from './schema';
export function commandHeading(values:Record<string,Scalar>){return values.authority==='emperor'?'你的旨意':'你的决定';}
export function lowValueExplanation(id:string){return id==='shen'?'伤重时，一些险招可能致命；留意当场预兆。':'低值会减少可用办法，不会仅因本项归零结束；具体危险看当场预兆。';}
/** Presentation only: use actual current values, never forecast an automatic outcome. */
export function decisionLowHint(state:State,shown:boolean,low:number):State['readingHint']{
 if(state.readingHint?.scene===state.current)return state.readingHint;
 if(shown)return;
 const words=[['qian','钱少'],['bing','兵少'],['guan','官低'],['min','民低']]as const;
 const found=words.find(([id])=>typeof state.values[id]==='number'&&Number(state.values[id])<=low);
 if(found)return {scene:state.current,stat:found[0],text:found[1]+'会少办法，不直接判死。'};
}
