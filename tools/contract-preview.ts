import {readFileSync} from 'node:fs';
import {parse} from 'yaml';
import type {Story} from '../src/schema';
export function attachContractPreview(d:Story,root:string){
 const fixture=parse(readFileSync(root+'/tools/fixtures/network-contract.yaml','utf8')) as Partial<Story>;
 for(const key of ['variables','people','scenes','endings'] as const)for(const row of fixture[key]||[]){if(d[key].some(x=>x.id===row.id))throw Error('验证稿ID重复：'+row.id);(d[key] as any[]).push(row);}
 d.rules.contracts={version:2,costs:{paymentResources:['钱','粮备','行动'],arrears:[{resource:'官',target:'political_arrears'}]}};
 d.meta??={id:'contract-validation',name:'新合同验证稿',mode:'sample'};d.meta.previews=[{id:'contract',entry:'contract.start',label:'新合同验证稿｜不是正式剧情'}];
}
