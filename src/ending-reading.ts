import type {State} from './schema';
/** Reading belongs to this life's particular ending, never to the shared overlay. */
export function endingReadingPosition(state:State,ending:string){
 const saved=state.endingReading;
 return saved?.ending===ending?{ending,scrollTop:Number.isFinite(saved.scrollTop)?Math.max(0,saved.scrollTop):0,reviewOpen:Boolean(saved.reviewOpen)}:{ending,scrollTop:0,reviewOpen:false};
}
export function rememberEndingReading(state:State,ending:string,scrollTop:number,reviewOpen:boolean){
 if(state.ending!==ending)return false;
 state.endingReading={ending,scrollTop:Number.isFinite(scrollTop)?Math.max(0,scrollTop):0,reviewOpen};return true;
}
