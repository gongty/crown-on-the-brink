import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {PLAYBACK_RATE} from '../src/playback';
// Only edit GIF frame delays in the generated copy; keep every pixel and source file intact.
export function fasterGif(source:Uint8Array,rate=PLAYBACK_RATE){const out=Buffer.from(source);if(!/^GIF8[79]a$/.test(out.subarray(0,6).toString()))throw Error('Invalid GIF');let p=13+(out[10]&128?3*(1<<((out[10]&7)+1)):0);
 const skipBlocks=()=>{while(p<out.length){const size=out[p++];if(!size)return;p+=size;}throw Error('Truncated GIF blocks');};
 while(p<out.length){const type=out[p++];if(type===0x3b)return out;if(type===0x21){const label=out[p++];if(label===0xf9){if(out[p]!==4||p+5>=out.length)throw Error('Invalid GIF timing');const old=out.readUInt16LE(p+2);if(old)out.writeUInt16LE(Math.max(2,Math.round(old/rate)),p+2);}skipBlocks();}else if(type===0x2c){if(p+9>out.length)throw Error('Invalid GIF image');const flags=out[p+8];p+=9;if(flags&128)p+=3*(1<<((flags&7)+1));p++;skipBlocks();}else throw Error('Invalid GIF block');}throw Error('Missing GIF trailer');
}
export function writeFasterGif(source:string,target:string){const fast=fasterGif(readFileSync(source));if(!existsSync(target)||!fast.equals(readFileSync(target)))writeFileSync(target,fast);}
