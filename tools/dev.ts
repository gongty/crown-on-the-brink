import {createServer} from 'vite';
import {watch,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');process.chdir(root);mkdirSync('content',{recursive:true});mkdirSync('src/preview',{recursive:true});
let timer:ReturnType<typeof setTimeout>,busy=false,again=false,generation=0;
const server=await createServer({root,server:{host:'0.0.0.0',port:8878,strictPort:true}});
async function rebuild(){if(busy){again=true;return;}busy=true;const run=++generation;server.ws.send({type:'custom',event:'guanjia:build',data:{state:'building',run}});
 const child=spawn(process.execPath,['--import','tsx','tools/compile.ts'],{cwd:root,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>output+=String(d));child.stderr.on('data',d=>output+=String(d));
 await new Promise<void>(done=>child.on('close',code=>{const status={state:code===0?'ready':'error',run,time:new Date().toISOString(),message:output.slice(-6000)};mkdirSync('src/public/data',{recursive:true});writeFileSync('src/public/data/dev-status.json',JSON.stringify(status));server.ws.send({type:'custom',event:'guanjia:build',data:status});console.log(code===0?'新剧情已接入':'新剧情有错误，保留上一份成功版本');if(code)console.error(output);else{server.moduleGraph.invalidateAll();server.ws.send({type:'full-reload'});}done();}));busy=false;if(again){again=false;void rebuild();}}
const schedule=()=>{clearTimeout(timer);timer=setTimeout(()=>void rebuild(),600);};
for(const path of ['content','assets/manifest.json','docs/剧本','src/sample.yaml','src/preview','tools/network.ts','docs/美术'])if(existsSync(path))watch(path,{recursive:true},(_event,file)=>{if(!file||!file.toString().includes('.tmp'))schedule();});
await rebuild();await server.listen();server.printUrls();
