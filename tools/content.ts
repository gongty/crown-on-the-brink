import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {resolve,relative,join,sep} from 'node:path';
import {parse} from 'yaml';
import type {Story} from '../src/schema';
export const walk=(p:string):string[]=>existsSync(p)?readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(join(p,e.name)):[join(p,e.name)]):[];
export function discover(root:string){
 const content=resolve(root,'content'),index=join(content,'index.yaml');
 if(existsSync(index)){const config=parse(readFileSync(index,'utf8'));if(!Array.isArray(config?.include))throw Error('content/index.yaml 需要include文件数组');return config.include.map((p:string)=>{const abs=resolve(content,p);if(!abs.startsWith(content+sep))throw Error('include不能越出content目录');if(!existsSync(abs))throw Error(`未交付文件：${p}`);return abs;});}
 return walk(content).filter(p=>/\.ya?ml$/i.test(p)&&!p.endsWith('.draft.yaml')&&!p.endsWith('.draft.yml')&&!relative(content,p).split(sep).some(x=>x.startsWith('_')||x.startsWith('.')));
}
export function loadContent(files:string[],base?:Story):{story:Story;sources:Record<string,string>} {
 const story:Story=base?JSON.parse(JSON.stringify(base)):{version:1,entry:'',variables:[],people:[],scenes:[],endings:[],history:[],rules:undefined!};
 const sources:Record<string,string>={},single=new Set<string>();const extensions:any[]=[];
 for(const path of files){let part:any;try{part=parse(readFileSync(path,'utf8'));}catch(e){throw Error(`${path}: ${String(e)}`);}if(!part||typeof part!=='object'||Array.isArray(part))throw Error(`${path}：根节点须为对象`);
  for(const k of Object.keys(part))if(!['version','entry','meta','variables','people','scenes','endings','history','rules','ruleExtensions'].includes(k))throw Error(`${path}：未知字段${k}`);
  for(const k of ['entry','meta','rules'] as const)if(part[k]!==undefined){if(single.has(k))throw Error(`${path}：${k}重复定义`);single.add(k);(story as any)[k]=part[k];}
  if(part.version!==undefined&&part.version!==1)throw Error(`${path}：不支持version ${part.version}`);
  for(const k of ['variables','people','scenes','endings','history'] as const){if(part[k]===undefined)continue;if(!Array.isArray(part[k]))throw Error(`${path}：${k}须为数组`);for(const item of part[k]){if(!item||typeof item.id!=='string')throw Error(`${path}：${k}缺id`);if(sources[`${k}:${item.id}`])throw Error(`重复ID ${item.id}：${sources[`${k}:${item.id}`]} 与 ${path}`);sources[`${k}:${item.id}`]=path;const prior=(story[k] as any[]).findIndex(x=>x.id===item.id);if(prior>=0)(story[k] as any[])[prior]=item;else (story[k] as any[]).push(item);}}
  if(part.ruleExtensions)extensions.push({path,value:part.ruleExtensions});
 }
 for(const {path,value} of extensions){if(!story.rules)throw Error(`${path}：缺基础rules`);for(const k of Object.keys(value)){if(!['activities','turns','media'].includes(k)||!Array.isArray(value[k]))throw Error(`${path}：ruleExtensions仅支持activities/turns/media数组`);const list=((story.rules as any)[k]??=[]);for(const row of value[k]){const key=k==='turns'?'turn':'id';if(list.some((x:any)=>x[key]===row[key]))throw Error(`${path}：rules.${k}重复${row[key]}`);list.push(row);}}}
 return {story,sources};
}
