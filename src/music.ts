import cueData from './music-cues.json';
import {Rng,hash32} from './rng';
export interface Cue {bpm:number;instrument:'qin'|'flute'|'bell'|'pipa'|'drum';notes:number[];drum?:number}
// 曲目参数是数据，合成器不含人物或剧情判断。
export const cues=cueData as Record<string,Cue>;
export class Music {
 ctx?:AudioContext;music?:GainNode;effects?:GainNode;clock?:ReturnType<typeof setInterval>;cue='';step=0;jin=0;musicOn=false;sfxOn=true;rng=new Rng(1);nodes=new Set<AudioScheduledSourceNode>();
 unlock(){if(!this.ctx){try{const AC=window.AudioContext||(window as any).webkitAudioContext;this.ctx=new AC();this.music=this.ctx!.createGain();this.effects=this.ctx!.createGain();this.music.connect(this.ctx!.destination);this.effects.connect(this.ctx!.destination);this.set(this.musicOn,this.sfxOn);}catch{return;}}void this.ctx?.resume();}
 set(music:boolean,effects:boolean){this.musicOn=music;this.sfxOn=effects;if(this.ctx&&this.music&&this.effects){this.music.gain.setValueAtTime(music?.12:0,this.ctx.currentTime);this.effects.gain.setValueAtTime(effects?.22:0,this.ctx.currentTime);}if(!music&&this.clock){clearInterval(this.clock);this.clock=undefined;}else if(music&&this.cue)this.play(this.cue,true);}
 track(node:AudioScheduledSourceNode){this.nodes.add(node);node.onended=()=>this.nodes.delete(node);}
 play(id:string,force=false){if(this.cue===id&&!force)return;this.cue=id;if(this.clock)clearInterval(this.clock);this.clock=undefined;if(!this.ctx||!this.musicOn)return;this.step=0;this.rng=new Rng(hash32(id));const c=cues[id]||cues['cue.title'];const pulse=()=>{if(document.hidden||!this.ctx)return;const idx=c.notes[this.step%c.notes.length],freq=130.8128*2**([0,2,4,7,9][idx%5]/12);this.note(c.instrument,freq,this.ctx.currentTime+.02);if(c.drum&&this.step%c.drum===0)this.beat(this.ctx.currentTime+.02,this.music!);if(id==='cue.siege'&&this.jin>65&&this.step%2===0)this.beat(this.ctx.currentTime+.16,this.music!);this.step++;};pulse();this.clock=setInterval(pulse,60000/c.bpm);}
 note(kind:Cue['instrument'],freq:number,t:number){const ctx=this.ctx!,g=ctx.createGain(),bus=this.music!;g.connect(bus);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.45,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+1.2);
  if(kind==='qin'||kind==='pipa'){const len=Math.max(2,Math.round(ctx.sampleRate/freq)),buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*1.25),ctx.sampleRate),a=buf.getChannelData(0);for(let i=0;i<len;i++)a[i]=this.rng.next()*2-1;for(let i=len;i<a.length;i++)a[i]=.497*(a[i-len]+a[i-len+1]);const s=ctx.createBufferSource();s.buffer=buf;s.connect(g);this.track(s);s.start(t);return;}
  const o=ctx.createOscillator();o.type=kind==='flute'?'sine':'triangle';o.frequency.value=freq*(kind==='bell'?2:1);o.connect(g);this.track(o);o.start(t);o.stop(t+1.3);
 }
 beat(t:number,bus=this.effects!){if(!this.ctx||!bus)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.setValueAtTime(100,t);o.frequency.exponentialRampToValueAtTime(36,t+.2);g.gain.setValueAtTime(.65,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);o.connect(g);g.connect(bus);this.track(o);o.start(t);o.stop(t+.3);}
 sfx(id='pick'){if(!this.ctx||!this.sfxOn)return;if(id==='tick'||id==='drum'){this.beat(this.ctx.currentTime);return;}const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=id==='seal'?180:440;o.type='triangle';g.gain.setValueAtTime(.25,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+.1);o.connect(g);g.connect(this.effects!);this.track(o);o.start();o.stop(this.ctx.currentTime+.12);}
 pause(){if(this.clock){clearInterval(this.clock);this.clock=undefined;}this.nodes.forEach(n=>{try{n.stop();}catch{}});this.nodes.clear();}
}
