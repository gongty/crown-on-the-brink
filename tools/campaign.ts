import {readFileSync} from 'node:fs';
import type {Story,Scene,Shot,Option,Ending,Person} from '../src/schema';
import {clone} from '../src/engine';
// Programmer's playable adaptation of the writer's design. Original files stay read-only.
// All source paragraphs are retained in a sidecar; this is a revisable implementation draft.
const source='docs/剧本/归档/节点网重构前-20261106/主线大纲.md';
const id=(n:number)=>`main.M${String(n).padStart(2,'0')}`;
const deaths=new Set([1,2,3,4,5,6,7,8,9,10,11,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,48,103,104,105,106]);
const E=(n:number)=>`${deaths.has(n)?'end.E':'event.N'}${String(n).padStart(2,'0')}`;
const dates=['1126-01-18','1126-01-22','1126-01-27','1126-01-28','1126-02-01','1126-02-12','1126-02-24','1126-03-04','1126-04-27','1126-05-15','1126-06-15','1126-09-21','1126-11-24','1126-12-01','1126-12-17','1126-12-29','1127-01-09','1127-01-17','1127-03-20','1127-05-10'];
const places=['福宁殿','大庆殿','宫门','东京城头','议事厅','东南壁门','御前军议','退军军报','龙德宫','援军粮道','军报案前','太原军报','安置名册','军议沙盘','东京城头','皇后宫中','宣化门','金营','被拘行在','出城车队'];
const bg=['bg.funing_night','bg.court','bg.palace_gate','bg.city_wall','bg.court','bg.city_gate','bg.court','bg.city_wall','bg.longde','bg.yellow_river','bg.study','bg.taiyuan','bg.palace_gate','bg.court','bg.city_wall','bg.harem_hou','bg.city_wall.fire','bg.jin_camp','bg.jin_camp','bg.north_wild'];
const casts=[['taishang'],['chen_dong','li_bangyan'],['taishang','gao_qiu'],['li_gang','li_bangyan'],['li_bangyan','kang_wang','zhang_bangchang'],['zhong_shidao','li_gang'],['yao_pingzhong','li_gang','chen_dong'],['zhong_shidao','li_bangyan'],['taishang','li_gang'],['zhong_shidao'],['qin_hui','geng_nanzhong'],['li_gang'],['he_li'],['sun_fu','guo_jing'],['zhang_shuye','he_li'],['zhu_hou'],['guo_jing','sun_fu'],['he_li','jin_envoy'],['zhang_bangchang'],['zhu_hou']];
const actions=[
 ['接诏，次日即位。','留兵，也留调兵的印。','这诏，儿臣不接。'],
 ['收下请诛书，逐案处置。','先核军需，保全账簿。','公布期限，先停侵夺。'],
 ['放行扈从，河防照旧。','分留护卫，核验渡具。','先保京师，撤回北岸百姓。'],
 ['留在东京，任李纲守御。','准备粮车，有序迁移。','先核河防，统一守御。'],
 ['议和，许三镇，遣人出质。','用可验财物换短暂停战。','守势拖谈，康王留京。'],
 ['依老将之议，开东南门。','分时护送百姓进出。','再封一旬，先补城防。'],
 ['命姚平仲出击。','等诸军接应，再议出兵。','取消袭营，守河断掠。'],
 ['不追击，依议退军。','核验河防与接应，准备邀击。','先护质子，回收城外粮道。'],
 ['迎太上皇入京。','礼仪照旧，拆开两套指挥。','共议宫禁开支，由中人传话。'],
 ['派援太原，催军前进。','备粮并统一诸军后推进。','分路输送守城物资。'],
 ['维持议和，不以传言动众。','核验军报，备边。','分清谈判和备战职责。'],
 ['面对失陷军报，收缩防线。','核验此前援军是否抵达。','承认失救，接应溃民。'],
 ['清野，准借官舍，后罢。','先安置，再组织运输。','限区坚壁，减少迁徙。'],
 ['任郭京领六甲兵。','撤术法名额，编入普通队。','准祈禳，不给守门权。'],
 ['接纳勤王，继续守城。','给统一军令与定额粮。','分守各壁，禁军仍归中央。'],
 ['苦寒中维持城守。','宫中减炭，优先前线。','拆闲材补薪，不征民居。'],
 ['准郭京行法，撤守出击。','收回撤守令，按准备守城。','启用此前准备的撤离队。'],
 ['亲赴金营，争取返城。','遣代理，留护卫与传信。','交阶段账单，换返城期限。'],
 ['受拘后继续等候消息。','依城内组织，保留传信。','放下复位，争取平安生活。'],
 ['随押送车队北行。','按此前准备，执行接应。','先照顾同行家属。']
];
// Effects translate the writer's stated choices into the existing variable contract.
const fx:string[][][]=[
 [[],['官 -小','兵 +小','taishang.好感 -中','旗标.接位条件 = 留兵'],[]],
 [[],['官 -小','旗标.六贼处置 = 审账'],['民 +中','旗标.六贼处置 = 限期']],
 [['旗标.河防 = 失守'],['钱 -中','taishang.好感 -中','旗标.河防 = 整备'],['民 +小','官 -中','旗标.河防 = 撤防护民']],
 [['li_gang.好感 +大','li_gang.权 = 大权','旗标.守御 = 统一','旗标.留京承诺 = true'],['钱 -大','官 -中','旗标.迁移准备 = true'],['钱 -中','兵 +中','li_gang.好感 +大','li_gang.权 = 大权','旗标.守御 = 统一']],
 [['旗标.出质人 = kang_wang','旗标.和议承诺 = 三镇'],['钱 -大','旗标.和议承诺 = 财物'],['钱 -中','兵 -小','旗标.出质人 = 无']],
 [['旗标.门禁 = 开放'],['钱 -中','民 +中','旗标.门禁 = 护送'],['兵 +小','民 -中','旗标.门禁 = 紧闭']],
 [['兵 -中','li_gang.好感 -小','旗标.劫营 = 袭击'],['钱 -中','旗标.劫营 = 缓'],['兵 -小','旗标.劫营 = 止']],
 [[],['兵 -中','钱 -小','旗标.邀击 = true'],['钱 -中','民 +中','旗标.家属准备 = true']],
 [[],['官 -中','taishang.好感 -中','taishang.权 -中','旗标.两宫 = 分权'],['钱 -中','taishang.好感 +中','旗标.两宫 = 通报']],
 [['旗标.太原援救 = 失救'],['钱 -大','旗标.太原援救 = 统筹'],['兵 -中','旗标.太原援救 = 分输']],
 [['旗标.三镇 = 允割未交','旗标.军报 = 压报'],['钱 -中','官 -中','旗标.军报 = 核验','旗标.三镇 = 保全'],['geng_nanzhong.权 -中','li_gang.权 +中','旗标.军报 = 核验','旗标.三镇 = 保全']],
 [[],['旗标.核太原 = true'],['民 +中','旗标.接应溃民 = true']],
 [['旗标.清野 = 反复'],['钱 -大','民 +中','旗标.清野 = 安置','旗标.迁移准备 = true','旗标.家属准备 = true'],['兵 -小','旗标.清野 = 限区']],
 [['旗标.郭京权限 = 守御'],['钱 -中','sun_fu.好感 -中','旗标.郭京权限 = 撤'],['官 -中','旗标.郭京权限 = 仪式']],
 [['旗标.城内组织 = false'],['钱 -大','zhang_shuye.权 +中','旗标.守御 = 统一','旗标.城内组织 = true'],['官 +小','旗标.守御 = 分割']],
 [[],['身 -小 @病','兵 +中','旗标.御寒 = true'],['钱 -中','官 -小','旗标.御寒 = true']],
 [['旗标.城破 = true'],['旗标.拒撤守 = true'],['旗标.撤离 = true']],
 [[],['旗标.营中传信 = true'],['钱 -大','旗标.营中传信 = true']],
 [[],['旗标.外援接应 = true'],[]],
 [[],['旗标.执行接应 = true'],['旗标.护家同行 = true']]
];
export function campaign(root:string,base:Story):Story{
 const d=clone(base);d.entry=id(1);d.scenes=[];d.endings=[];d.history=[];d.meta={id:'guanjia-three-acts',name:'开局就亡国',mode:'preview',revision:'legacy-v0.3',label:'旧三幕实现稿（归档）｜新网适配中'};
 const outline=readFileSync(root+'/'+source,'utf8');const chunks=[...outline.matchAll(/^### M(\d+) · (.+)\n([\s\S]*?)(?=^### M|^## |$(?![\s\S]))/gm)];
 const personText=readFileSync(root+'/docs/剧本/归档/节点网重构前-20261106/人物卡.md','utf8');d.people=[];
 for(const m of personText.matchAll(/^### (?:\d+ · )?(.+?)（`([^`]+)`[^\n]*\n([\s\S]*?)(?=^### |^## |$(?![\s\S]))/gm)){
  const body=m[3],pid=m[2],favor=Number(body.match(/(?:起始)?好感(\d+)/)?.[1]||45),power=Number(body.match(/(?:权|权\/宠)(\d+)/)?.[1]||25),consort=pid.startsWith('fei_');
  const name=m[1].replace(/^太上皇赵佶$/,'太上皇').replace(/^康王赵构$/,'康王').replace(/^朱皇后$/,'朱皇后');
  const military=['zhong_shidao','he_guan','zhang_shuye','yao_pingzhong','han_shizhong','yue_fei','wu_jie','liu_qi','wang_bing','zhong_shizhong'].includes(pid);
  const p:Person={id:pid,name,camp:consort?'后宫':body.match(/状态：([^；]+)/)?.[1]||pid,tier:/A档/.test(body)?'A':'B',kind:consort?'consort':pid==='zhu_hou'?'empress':military?'military':'civil',favor,power,status:'在朝',office:consort?'婉容':pid==='taishang'?'太上皇':pid==='li_gang'?'兵部侍郎':name,adult:pid!=='taizi',fictional:consort,face:pid,history:(body.match(/依据：([^\n]+)/)?.[1]||'编剧人物卡').slice(0,90)};
  if(consort)p.temperament=body.match(/性子：([^。\n]+)/)?.[1]||'温顺';d.people.push(p);
 }
 if(!d.people.some(p=>p.id==='jin_envoy'))d.people.push({id:'jin_envoy',name:'金使',camp:'金',tier:'C',kind:'other',favor:50,power:0,status:'在外',office:'使者',adult:true});
 // Historical absences are data, not actor-specific engine code.
 const windows:Record<string,[string,string]>={gao_qiu:['1126-01-18','1126-01-27'],zhong_shidao:['1126-02-12','1126-09-30'],he_guan:['1126-01-18','1126-02-02']};
 for(const p of d.people)if(windows[p.id])p.window=windows[p.id];
 const initial:Record<string,string|boolean|number>={接位条件:'无',六贼处置:'分案',河防:'失守',守御:'原史',留京承诺:false,迁移准备:false,出质人:'kang_wang',和议承诺:'三镇',门禁:'开放',劫营:'袭击',家属准备:false,两宫:'迎归',太原援救:'失救',三镇:'允割未交',军报:'压报',核太原:false,接应溃民:false,清野:'反复',郭京权限:'守御',城内组织:false,御寒:false,城破:false,拒撤守:false,撤离:false,营中传信:false,外援接应:false,执行接应:false,护家同行:false,邀击:false,围城:false,下一场:'main.M02',北援:false,军权交接:false,江防:false,后勤:false,恢复民生:false,继承:false,交权:false,治理:false,晚年善政:false,身份:'在位',即位:true,人生路线:'R01',可靠通信:false,安居:false};
 d.variables=d.variables.filter(v=>!v.id.startsWith('旗标.'));for(const[k,value]of Object.entries(initial))d.variables.push({id:'旗标.'+k,type:typeof value as 'string'|'boolean'|'number',initial:value,visible:false});
 delete d.rules.life;d.rules.titles.templeRules=[{if:'旗标.治理 && 旗标.恢复民生 && 旗标.继承',value:'戏拟·宋仁宗'},{if:'旗标.军权交接 && 旗标.继承',value:'戏拟·宋成宗'}];
 d.rules.media=[];d.rules.onExhausted='@complete';d.rules.art={title:'end.21_jingkang',variants:[{if:'旗标.围城',value:'weicheng'}]};
 d.rules.schedule.distinctCount=8;d.rules.harem={favor:7,power:3,others:-3,jealous:-7};
 const migration=JSON.parse(readFileSync(root+'/docs/剧本/归档/节点网重构前-20261106/终局与事件迁移.json','utf8'));
 const manifest=JSON.parse(readFileSync(root+'/assets/manifest.json','utf8')).entries as {id:string}[];
 const endInfo=new Map<number,{name:string;say:string;asset:string;kind:string;route:string}>();
 for(const r of migration.records){const n=Number(r.legacy_id?.slice(1)||r.id.slice(1));const asset=manifest.some(a=>a.id===r.asset_id)?r.asset_id:'bg.shishu_desk';endInfo.set(n,{name:r.name,say:'史臣曰：'+r.historian,asset,kind:r.kind,route:r.route||'current'});}
 const terminal=(n:number,door:number,condition='false',priority=50,domain?:string)=>{
  const existing=d.endings.find(e=>e.no===n);if(existing){if(condition!=='false'){existing.if=condition;existing.door=door;existing.domain=domain;existing.priority=priority;}return existing;}const info=endInfo.get(n);if(!info)throw Error(`迁移表缺少${n}`);const alive=info.kind!=='death';const destinations:Record<string,string>={R02:'life.R02.1',R03:'life.R03.1',R04:'life.R04.1',R05:'life.R05.1',R06:'life.R06.1',R07:'main.A2.01',R08:'life.R08.1',current:'$旗标.下一场'};const e:Ending={id:E(n),kind:alive?'event':'terminal',deathConfirmed:!alive,continue:alive?destinations[info.route]||'$旗标.下一场':undefined,no:n,name:info.name,category:[43,46,41,42,47].includes(n)?'出走':[49,50,51,52,53,80].includes(n)?'好结局':n>=25&&n<=35?'床上':'被废被囚',door,priority,if:condition,domain,shots:[{bg:info.asset},{think:alive?'你仍活着。身份和处境变了，接下来还要继续生活。':n===33?'多年之后，身体终于走到尽头。这一次，你安然离世。':'此番危险终于夺去了你的生命。灯灭后，再没有下一道应声。'},{think:info.say.replace(/^史臣曰：/,'')}],history:(n===21?'二帝被押北行。此前的每一次暂让，终于没有留路。':info.name+'。这一局，史书在此收卷。').slice(0,40),historian:info.say.slice(0,80),why:'你在{日期}选择「{选择}」。官{官}、兵{兵}、民{民}、钱{钱}、身{身}。',temple:alive?undefined:n===33?undefined:'戏拟·宋愍宗',epithet:'愍'};d.endings.push(e);return e;
 };
 for(const n of [6,11,23,24,34,36,37,38,39,40,45,46,59,103,104,106])terminal(n,1);
 // An extreme bar first creates a continuing crisis, never an unsupported death.
 for(const [sid,name,condition,next]of [
 ['council','朝议停摆','官 <= 0','life.R04.1'],['office','御批难出宫门','官 >= 100','life.R03.1'],['treasury','军费告急','钱 <= 0','crisis.treasury'],['command','军令失控','兵 >= 100','life.R04.1'],['defence','守备空缺','兵 <= 0','crisis.defence'],['people','听诉的台阶','民 <= 0','crisis.people']]){
  d.endings.push({id:'event.crisis.'+sid,kind:'event',no:0,name,category:'危机',door:3,priority:70,if:condition,continue:next,shots:[{bg:'bg.court',say:['近侍',name+'。原来的安排已经无法照常执行。']},{think:'这是一场要处理的危机。你还活着，不能把它当作终点。'}],history:name+'，须重新安排。',historian:'局面至此，仍须择路。',why:'官{官}、兵{兵}、民{民}、钱{钱}；先前的选择留下了这份账。'});
 }
 for(const[n,c]of [[25,'纵欲'],[26,'丹药'],[27,'酒'],[28,'累']] as const)terminal(n,3,`身 <= 0 && 死因 == "${c}"`,100);
 terminal(29,3,'身 <= 0 && 死因 == "病" && 旗标.围城 && 旗标.身份 == "在位"',100);
 terminal(103,3,'身 <= 0 && 旗标.身份 == "受拘"',100);
 for(const n of [21,22,43,48,49,50,51,52,53,80])terminal(n,4);
 const milestone=(n:number,stage:string,next:string)=>{const e=clone(d.endings.find(e=>e.no===n)!);e.id=E(n)+'.'+stage;e.name+='·'+stage;e.kind='event';e.continue=next;e.door=4;e.if='false';d.endings.push(e);return e.id;};
 const firstHold=milestone(49,'首围',id(9)),firstRiver=milestone(50,'首围',id(9)),firstTreaty=milestone(51,'首围',id(9)),taiyuan=milestone(53,'三镇',id(13));
 const route=(name:string,exits:Scene['exits'])=>{const s:Scene={id:name,name:'关口回报',act:1,type:'card',period:'route',once:false,weight:1,cast:[],tension:3,beat:'喘息',shots:[],next:'@resolve',exits};d.scenes.push(s);return name;};
 const first=route('route.first',[{if:'旗标.邀击 && 旗标.河防 == "整备" && 兵 >= 30',goto:firstRiver},{if:'旗标.守御 == "统一" && 兵 >= 35 && 钱 >= 5',goto:firstHold},{goto:firstTreaty}]);
 const relief=route('route.relief',[{if:'旗标.核太原 && 旗标.太原援救 != "失救" && 旗标.三镇 == "保全"',goto:taiyuan},{goto:id(13)}]);
 const survive=milestone(49,'二围','main.A2.01'),south=milestone(43,'南渡','main.A2.01'),rescued=milestone(80,'脱险','main.A2.01');
 const second=route('route.second',[{if:'旗标.撤离 && 旗标.迁移准备',goto:south},{if:'旗标.拒撤守 && 旗标.郭京权限 != "守御" && 旗标.守御 == "统一" && 兵 >= 35 && 钱 >= 5',goto:survive},{goto:id(18)}]);
 const last=route('route.last',[{if:'旗标.执行接应 && 旗标.外援接应 && 旗标.城内组织 && 旗标.家属准备 && 旗标.营中传信',goto:rescued},{goto:E(21)}]);
 for(const m of chunks){const n=Number(m[1]),title=m[2].split('（')[0],body=m[3];if(n>20)continue;
  const trouble=body.match(/麻烦\/两难：“([^”]+)”/)?.[1]||title;
  const thought=body.match(/心里话：“([^”]+)”/)?.[1]||body.match(/钩子：“([^”]+)”/)?.[1]||'这一页的选择，会留到下一页。';
  const active=(casts[n-1]||[]).filter(pid=>d.people.some(p=>p.id===pid&&(!p.window||dates[n-1]>=p.window[0]&&dates[n-1]<=p.window[1])));
  const speaker=active[0]||'军报';const shots:Shot[]=[{card:{date:dates[n-1],title:title.slice(0,12),note:'第一幕 · '+(['接位','首围','再备战','再围','城破以后'][n<=4?0:n<=8?1:n<=12?2:n<=17?3:4])}},{bg:bg[n-1],place:places[n-1],time:n===1?'夜':'昼',music:n>=15?'cue.siege':n===16?'cue.harem':'cue.court',say:[speaker,trouble]}, {if:'旗标.接位条件 == "留兵"',think:'那道留兵的承诺，还要由人去兑现。'},{think:thought}];
  if(n===1)shots.splice(2,0,{video:'mov.hand_over',poster:'cut.hand_over.scroll'});
  if(n===3)shots.push({cut:'cut.taishang.leave.cinematic'});
  if(n===4)shots.splice(1,0,{if:'旗标.河防 != "整备"',cut:'cut.river.flee.cinematic'});
  if(n===6)shots.push({cut:'cut.zhong.open_gate.cinematic'});
  const next=n===8?first:n===12?relief:n===17?second:n===20?last:id(n+1);
  const options:Option[]=actions[n-1].map((text,i)=>({id:['history','plan_a','plan_b'][i],text,tags:[i===0?'史书':'改史'],effects:fx[n-1][i],goto:next}));
  if(n===1){options[2].goto=E(46);options[2].effects=['旗标.即位 = false','旗标.身份 = 宗室'];}
  if(n===4)options[1].goto=south;
  if(n===19)options[2].goto=E(22);
  const sc:Scene={id:id(n),name:title,source:source+'#M'+String(n).padStart(2,'0'),act:1,type:'main',period:'campaign',order:n,once:true,weight:1,cast:active,when:undefined,tension:Math.min(10,Number(body.match(/张力(\d+)/)?.[1]||6)),beat:n===6||n===16?'喘息':n===7||n===17?'爆发':'两难',onEnter:[`日期 = ${dates[n-1]}`,`回合 = ${n}`,`金势 = ${[10,15,25,45,50,55,60,45,35,40,50,65,72,78,85,90,95,100,100,100][n-1]}`,`旗标.围城 = ${n>=4&&n<=8||n>=15}`],shots,choice:{timer:[1,4,17].includes(n)?8:undefined,default:'history',options}};
  const echoes:Record<number,[string,string][]>= {3:[['旗标.六贼处置 == "审账"','留下来的账簿，要和交出的护卫逐笔核对。']],7:[['旗标.门禁 == "护送"','门外的人能否来回，还要靠前次的护送令。']],8:[['旗标.劫营 == "袭击"','前次出兵的损失，仍记在军报上。'],['旗标.出质人 == "kang_wang"','质子还在对面，退军后的接应不能少。'],['旗标.和议承诺 == "财物"','答应交付的财物，不能只停在口头。']],9:[['旗标.留京承诺','当日答应留在东京，今日仍有人记得。']],10:[['旗标.两宫 == "分权"','两套指挥拆开之后，下一道军令也得核清。']],12:[['旗标.军报 == "核验"','核过的军报，仍需有人送到该到的地方。']],13:[['旗标.接应溃民','此前接应的人，也在这次安置名册上。']],14:[['旗标.清野 == "安置"','安置已经花去粮车，守城的账必须接着算。']],17:[['旗标.御寒','炭薪先送到城头，守军才有力气接下一班。']],19:[['旗标.城破','城破之后，能执行命令的人已经少了。']],20:[['旗标.护家同行','留给同行家人的那份准备，还在车里。']]};
 for(const [condition,text]of echoes[n]||[])sc.shots.push({if:condition,think:text});
 if(n===1)sc.shots.push({think:'不接这道诏，便要以宗室的身份面对这场战乱。'});
  d.scenes.push(sc);
 }
 // Civil rescue is tied to the political domain; it cannot save arbitrary arrows.
 for(const p of d.people.filter(p=>['li_gang','li_bangyan','zhu_hou'].includes(p.id))){p.saves=p.id==='zhu_hou'?['宫斗','毒酒']:['群臣废立','民变'];p.rescueScene='rescue.'+p.id;p.rescueEffects=[`${p.id}.权 -大`,`${p.id}.处境 = 罢免`];d.scenes.push({id:p.rescueScene,name:p.name+'救驾',act:1,type:'rescue',period:'insert',once:true,weight:1,cast:[p.id],tension:8,beat:'爆发',shots:[{bg:'bg.court',say:[p.id,'臣能接住这一次，往后还请官家早作准备。']},{think:'他替我挡住了一次发难，自己的位置却空了。'}],next:'$旗标.下一场'});}
 d.scenes.push({id:'system.warning',name:'预兆',act:1,type:'warning',period:'insert',once:false,weight:1,cast:[],tension:7,beat:'紧张',shots:[{bg:'bg.court',say:['近侍','官家，先前那件事，已经有人压不住了。']}],next:'$旗标.下一场'});
 // Rules and optional activities are appended below. No future-act history is fabricated.
 attachActivities(d,root);
 attachLaterActs(d,root,terminal);
 attachLifeRoutes(d,terminal);
 connectInterludes(d);
 for(const sc of d.scenes)sc.contract=1;
 const referenced=new Set(d.scenes.flatMap(sc=>[sc.next,...(sc.exits||[]).map(e=>e.goto),...(sc.choice?.options||[]).flatMap(o=>[o.goto,...(o.risk||[]).map(r=>r.ending),...(o.effects||[]).filter(e=>e.startsWith('旗标.下一场 = ')).map(e=>e.slice('旗标.下一场 = '.length))])]));for(const e of d.endings)if(e.continue)referenced.add(e.continue);
 d.endings=d.endings.filter(e=>e.if!=='false'||referenced.has(e.id));
 return d;
}
function attachActivities(d:Story,root:string){
 const dailyFile='docs/剧本/归档/节点网重构前-20261106/灰盒张力表.md',text=readFileSync(root+'/'+dailyFile,'utf8');
 const rows=[...text.matchAll(/^\| D(\d+)([^|]+)\|([^\n]+)$/gm)];
 for(const m of rows){const n=Number(m[1]),cols=m[3].split('|').map(x=>x.trim()),name=m[2].trim();const situation=cols[1]||name;const phrase=situation.split('；')[0];const tail=situation.split('；')[1]||'核实/交相应人/暂缓';const choices=tail.replace(/[【】]/g,'').split(/[\/／]/).slice(0,3);while(choices.length<3)choices.push(['先处理眼前一件。','交相应的人去办。','明日核对回报。'][choices.length]);
  const risk=n===5?23:n===11?37:undefined;
  const options:Option[]=choices.map((raw,i)=>({id:'daily'+i,text:[...raw.trim()].slice(0,24).join(''),effects:i===0?['身 +小']:i===1?['官 +小','钱 -小']:['钱 +小','官 -小'],tags:i===0?['享乐']:[],goto:'$旗标.下一场'}));
  if(n===6)options[2].effects=['身 -大 @丹药'];if(n===7)options[2].effects=['身 -大 @纵欲'];if(n===8)options[2].effects=['身 -大 @累'];if(n===9)options[2].effects=['身 -大 @病'];
  if(risk){options[2].goto=E(risk);options[2].tags=['险'];options[2].text=n===5?'仍越外城，走到游骑近处。':'仍回被烟封住的通道。';}
  d.scenes.push({id:'daily.D'+m[1],name,source:dailyFile+'#D'+m[1],act:1,type:'daily',period:'optional',once:false,weight:1,cast:[],tension:n===5?6:3,beat:'喘息',danger:risk?'外城已有游骑；起烟的通道已不安全。':undefined,shots:[{bg:n===5||n===9?'bg.zhouqiao_night':n===6?'bg.alchemy':n===10?'bg.cuju':'bg.study',place:name,time:'夜',music:n===5||n===9?'cue.market':'cue.harem',say:['近侍',phrase.slice(0,42)]},{think:cols[3]?.match(/[“"]([^”"]+)[”"]/)?.[1]||'今晚也可以只做一件小事。'}],choice:{options}});
 }
}
function connectInterludes(d:Story){
 for(const sc of [...d.scenes].filter(s=>['main','continuation'].includes(s.type))){
  const next=sc.choice?.options[0]?.goto;if(!next)continue;
  const interlude='interlude.'+sc.id;const event='daily.D'+String((sc.order||1)%12+1).padStart(2,'0');
  for(const o of sc.choice!.options){if(d.endings.some(e=>e.id===o.goto&&e.door===1))continue;const target=o.goto;o.effects=[...(o.effects||[]),`旗标.下一场 = ${target}`];o.goto=interlude;}
  const open:Scene={id:interlude,name:'这一日的余暇',act:sc.act,type:'card',period:'interlude',once:false,weight:1,cast:[],tension:2,beat:'喘息',shots:[{bg:sc.act===1?'bg.study':'bg.harem_hou',think:'下一道命令之前，你仍有一点自己的时间。',music:'cue.harem'}],choice:{options:[{id:'rest',text:'歇一刻，吃一顿热饭。',effects:['身 +中'],goto:'$旗标.下一场',tags:['享乐','基线']},{id:'account',text:'核军需，追回未到账的钱。',effects:['钱 +中','官 -小'],goto:'$旗标.下一场'},{id:'visit',text:'去听诉，交代一件已办的事。',effects:['官 +中'],goto:d.scenes.some(s=>s.id===event)?event:'daily.D03'}]}};
  d.scenes.push(open);
 }
}
function attachLaterActs(d:Story,_root:string,terminal:(n:number,door:number,condition?:string,priority?:number,domain?:string)=>Ending){
 const later=[
  ['main.A2.01',2,'1127-06-01','皇权重新落地','东京仍在、迁都或流寓，旧的授权都要重新核对。',['议定分工，保留共同军令。','交付兵权，先把事办起来。','此时退位，完成交接。'],[['旗标.军权交接 = true','官 -小'],['兵 +中','官 -中'],[]],'bg.court'],
  ['main.A2.02',2,'1128-03-01','诏书到不了的地方','北方有人求援。出兵、留守和粮路，不能只挑一个名字。',['备粮北援，给明确接应。','先巩固现有州县与民生。','把难处写回去，暂缓北援。'],[['钱 -大','旗标.北援 = true','旗标.后勤 = true'],['民 +中','旗标.恢复民生 = true'],['官 -小','钱 +小']],'bg.yellow_river'],
  ['main.A2.03',2,'1129-03-01','谁来掌下一班宿卫','军内的旧利益还在。争执的焦点，是下一道令由谁执行。',['定轮值，分开军饷与宫门。','让近军继续包办。','召集诸将，公开任命边界。'],[['钱 -中','旗标.军权交接 = true'],['兵 +大','官 -中','旗标.军权交接 = false'],['官 -中','旗标.军权交接 = true']],'bg.palace_gate'],
  ['main.A2.04',2,'1130-05-01','江上还有归路','水陆通道让人活下来，也要有人守、有人送粮。',['固江防，保住水陆粮道。','备舟粮，留一条海上退路。','把可调之兵都用于北援。'],[['钱 -中','兵 +小','旗标.江防 = true'],['钱 -中','旗标.迁移准备 = true'],['兵 -中','旗标.北援 = true']],'bg.sea_boat'],
  ['main.A2.05',2,'1138-06-01','名将不是一枚图鉴','军令统一、后勤和盟友都齐备时，战机才不只是一个预言。',['补足粮运，再让前线推进。','先守现有疆界与百姓。','停下扩张，巩固现有战果。'],[['钱 -大','旗标.后勤 = true','兵 +中'],['民 +中','旗标.治理 = true'],[]],'bg.city_wall'],
  ['main.A2.06',2,'1142-01-01','和与战的长期账','续国之后还要续民生。停战并不替你处理旧军权和旧欠账。',['整财政与民生，继续治理。','保留武备，准备下一次战机。','记录中兴，继续兑现承诺。'],[['民 +中','旗标.恢复民生 = true'],['兵 +中','钱 -中'],[]],'bg.court'],
  ['main.A3.01',3,'1146-03-01','老臣交回旧印','有人已经办不动了。把位置交出去，和把责任甩出去不同。',['安排继任，准旧臣离去。','仍让他继续，朕离不开他。','公开交接军政印信。'],[['官 -小','旗标.继承 = true'],['身 -中 @累','旗标.继承 = false'],['官 -中','旗标.军权交接 = true']],'bg.study'],
  ['main.A3.02',3,'1153-03-01','新的名字正在等候','新的入仕者、边军和旧臣并不总想要同一件事。',['开言路，让新人承担实职。','核清能力，按职分工。','仍用熟悉的人，暂不更动。'],[['官 -中','民 +小','旗标.治理 = true'],['钱 -小','旗标.继承 = true'],['官 +中','旗标.治理 = false']],'bg.taixue'],
  ['main.A3.03',3,'1161-06-01','这一回谁站在前面','边境再有压力。疆界变过，不能把旧史里的胜负照抄一遍。',['让能接班的人主持江防。','亲自管每一道军令。','既有粮路在，逐步收复旧地。'],[['钱 -中','兵 +小','旗标.继承 = true'],['身 -大 @累','官 +小'],['钱 -大','兵 -中','旗标.北援 = true']],'bg.city_wall'],
  ['main.A3.04',3,'1170-01-01','明日不一定由朕来批','身体与继承都在催你答复。能接手的人，是否真的可以做决定？',['将印交付，给接班人实权。','先定交接日，亲自核清边界。','把最后几件事都揽在自己手里。'],[['旗标.交权 = true','旗标.继承 = true'],['身 -小 @累','旗标.继承 = true'],['身 -大 @累','旗标.交权 = false']],'bg.longde'],
  ['main.A3.05',3,'1172-01-01','这一卷如何留下','从诏书递到手里的那一天，直到今天。你留下的不只是一个称号。',['让后人接着治理，朕歇一歇。','把已有战果与缺憾都写下。','放下皇位，做一个普通老人。'],[['旗标.晚年善政 = true'],[],['旗标.交权 = true']],'bg.shishu_desk']
 ] as const;
 for(const n of [33,41,42,47,54,55,56,57,58])if(!d.endings.some(e=>e.no===n))terminal(n,4);
 for(const n of [56,57,58])d.endings.find(e=>e.no===n)!.continue=n===56?'main.A3.04':'life.final';
 const endingRoute:Scene={id:'route.lifetime',name:'一生收卷',act:3,type:'card',period:'route',weight:1,once:false,cast:[],tension:3,beat:'喘息',shots:[],next:'@resolve',exits:[{if:'旗标.交权 && 旗标.继承 && 旗标.治理 && 旗标.恢复民生 && 旗标.军权交接',goto:E(58)},{if:'旗标.交权 && 旗标.继承',goto:E(47)},{if:'旗标.恢复民生 && 旗标.继承',goto:E(57)},{goto:'life.final'}]};d.scenes.push(endingRoute);
 later.forEach((row,index)=>{const [sid,act,date,title,pressure,texts,effects,bg]=row;const next=later[index+1]?.[0]||'route.lifetime';const opts:Option[]=texts.map((text,i)=>({id:['baseline','plan_a','plan_b'][i],text,effects:[...effects[i]],tags:[i===0?'基线':'改史'],goto:next}));
  if(sid==='main.A2.01')opts[2].goto=E(47);
  if(sid==='main.A2.05')opts[2].goto='main.A2.06';
  if(sid==='main.A2.06'){opts[2].goto=E(54);d.endings.find(e=>e.no===54)!.continue='main.A3.01';}
  if(sid==='main.A3.03')opts[2].goto='route.recovery';
  if(sid==='main.A3.05')opts[2].goto=E(47);
  d.scenes.push({id:sid,name:title,source:'docs/剧本/归档/节点网重构前-20261106/主线大纲.md#'+(act===2?'第二幕收束点':'第三幕收束点'),act,type:'continuation',period:'campaign',order:21+index,once:true,weight:1,cast:[],tension:[6,7,8,7,8,5,5,4,8,4,3][index],beat:index===2||index===8?'紧张':'两难',onEnter:[`日期 = ${date}`,`回合 = ${21+index}`,'旗标.身份 = 在位','旗标.人生路线 = R01','旗标.围城 = false',`金势 = ${[45,50,70,65,55,35,20,25,75,15,10][index]}`,'身 -小 @病'],shots:[{card:{date,title:title.slice(0,12),note:`第${act}幕 · 架空续行 · 剧本修订中`}},{bg,place:title,time:'昼',music:act===3?'cue.harem':'cue.court',say:['军政回报',pressure]},{if:'旗标.家属准备',think:'当年准备好的一条退路，终于成了今天能坐下说话的地方。'},{if:'旗标.北援',think:'答应北方的接应，仍要靠今天的粮路兑现。'},{if:'旗标.江防',think:'此前建立的江防，也得有人持续接班。'},{if:'旗标.晚年善政',think:'让后人继续治理，不只是一句收尾的话。'},{think:'此后的路，没有钦宗在位的原史答案。你得自己判断。'}],choice:{options:opts}});
 });
 d.scenes.push({id:'route.recovery',name:'前线回报',act:3,type:'card',period:'route',weight:1,once:false,cast:[],tension:6,beat:'揭示',shots:[{bg:'bg.city_wall',think:'能否留下战果，还要看此前的粮路和治理。'}],next:'@resolve',exits:[{if:'旗标.后勤 && 旗标.治理 && 兵 >= 25',goto:E(56)},{goto:'main.A3.04'}]});
}

function attachLifeRoutes(d:Story,terminal:(n:number,door:number,condition?:string,priority?:number,domain?:string)=>Ending){
 for(const [key,title,text,effects]of [
 ['treasury','军费告急','账上已无可支用的钱。延付、削减别项或请现存的人协商，都各有代价。',['钱 +中','官 -中']],
 ['defence','守备空缺','旧有守备无法再照常轮换。重新编组需要钱，也需要承认责任。',['兵 +中','钱 -中']],
 ['people','重新听诉','台阶前的人要一个能核实的答复。只压下声音，事情并不会消失。',['民 +中','钱 -中']]
 ] as [string,string,string,string[]][]){d.scenes.push({id:'crisis.'+key,name:title,act:1,type:'crisis',period:'life',once:false,weight:1,cast:[],tension:7,beat:'两难',shots:[{bg:'bg.court',say:['来人',text]},{think:'先把一件眼前事办成，仍要承担它的代价。'}],choice:{options:[{id:'repair',text:'调开别项，先兑现眼前承诺。',effects,goto:'$旗标.下一场'},{id:'delegate',text:'向各方明说难处，分期落实。',effects:['官 -小'],goto:'$旗标.下一场'},{id:'leave',text:'交出实际权力，接受新的安排。',goto:'life.R04.1'}]}});}
 const routes:Record<string,{identity:string;bg:string;beats:[string,string,string][]}>={
  R02:{identity:'受拘',bg:'bg.jin_camp',beats:[['归期不是口信','你已在受拘处生活了一段日子。有人送来换岗消息，却没有释放文书。','先安排药食，核实转移的去处。'],['信由谁带出去','旧日的身份还会让人犹豫。能送信的人，必须真的能走到接应处。','把家书与联络分开，托可靠的人送出。'],['自由有一条实路吗','季节又换过数次。没有筹码和接应时，不能把愿望当成通行文书。','继续争取照护与交换，不盲闯看守。']]},
  R03:{identity:'废居',bg:'bg.longde',beats:[['新君索要旧印','院门依旧有人值守，朝廷索要的是旧日那份授权。','交清印信，要求写明家属与居处。'],['旧臣又来求诏','旧臣请求你再发一道命令。但谁能执行，谁会因此受牵连？','不发空诏，保全来往的人。'],['门外已有新生活','许多往来中，有一份解除限制的安排终于可以核验。','与新朝核清约束，争取平安离院。']]},
  R04:{identity:'有名无权',bg:'bg.study',beats:[['一件小事也要问人','你想给旧友一封回信，值守却要先送别处核过。','先争取私人通信的权限。'],['换回哪一份权','能换回一部分印信，却会暂时出现无人负责的空档。','公开核定责任，逐步交接。'],['名号还要留多久','别人已经能办事。你要保留名号，还是完成真正的退出？','交付最后的印信，退出朝政。']]},
  R05:{identity:'退居',bg:'bg.study',beats:[['住处不是诏书','离开皇位后，柴米与住处都要重新安排。','量入为出，和家人安顿下来。'],['旧身份被人认出','市井有人认出了你，也有人带来旧朝求助。','只帮确能办到的事，不再借旧名发令。'],['故人门前的灯','又过数年，旧人来访。新君已经有了不同的做法。','听完近况，让能接事的人继续。']]},
  R06:{identity:'宗室',bg:'bg.longde',beats:[['父亲的下一道安排','你没有成为皇帝。父亲问你，是留下护家还是随队转移？','先护亲属，核对可用的护卫。'],['战事仍会到门前','你无权调全国之兵，但可以把确实掌握的消息交给有权限的人。','交军情与渡口实况，不许空口承诺。'],['再有人请你承担','宗室仍有人来问：愿不愿重新接过那份责任？','接受有交接的任命，重新承担。']]},
  R08:{identity:'两中心协商',bg:'bg.court',beats:[['两道诏到同一军营','另一套朝廷已有粮、人和信任，不能只凭旧名收回。','先共认一道军令，避免相互掣肘。'],['百姓要哪一种安定','双方都收到催粮文书。名分尚未谈妥，军民却不能再交两份。','合并征调与账簿，先停重复索取。'],['谁真正向后退','协议已经能执行。下一步是确认名位与真实权限。','议定分工，以可执行的交接结束争执。']]}
 };
 for(const [route,plan]of Object.entries(routes))for(let i=0;i<3;i++){
  const [title,pressure,action]=plan.beats[i],sid=`life.${route}.${i+1}`,last=i===2;
  let next=last?'life.retired.1':`life.${route}.${i+2}`;
  if(last&&route==='R02')next='life.captive.1';if(last&&route==='R06')next='main.M02';if(last&&route==='R08')next='main.A2.01';
  const effects=route==='R02'?['身 -小 @病']:['身 +小'];
  const options:Option[]=[{id:'care',text:action,tags:['基线'],effects,goto:next},{id:'contact',text:route==='R02'?'保留通信，核实交换筹码。':'与可靠的人共同核对安排。',effects:['旗标.可靠通信 = true'],goto:next},{id:'leave',text:route==='R02'?'有接应才行动，否则继续照护。':'放下旧名，争取与家人安居。',effects:['旗标.安居 = true'],goto:route==='R02'?next:'life.R05.1'}];
  if(route==='R06'&&last)options[0].effects=['旗标.即位 = true','旗标.身份 = 在位'];
  if(route==='R02'&&last)options[1]={id:'rescue',text:'依此前的外援与传信，实施接应。',if:'旗标.外援接应 && 旗标.营中传信 && 旗标.可靠通信',effects:['旗标.身份 = 在位'],goto:'life.R08.1'};
  if(route==='R03'&&last)options[0].effects=[...effects,'旗标.身份 = 退居'];
  if(route==='R08'&&last)options[0].effects=[...effects,'旗标.身份 = 在位'];
  d.scenes.push({id:sid,name:title,source:'docs/剧本/归档/节点网重构前-20261106/失位之后的故事线.md#'+route,act:2,type:'life',period:route,order:40+i,once:true,weight:1,cast:[],tension:[5,6,4][i],beat:'两难',onEnter:[`旗标.人生路线 = ${route}`,`旗标.身份 = ${plan.identity}`],shots:[{card:{title:title.slice(0,12),note:`人生续行 · ${plan.identity}`}},{bg:plan.bg,say:['来人',pressure],music:route==='R02'?'cue.siege':'cue.harem'},{think:'身份变了，身体、家人和做过的承诺都还在。'}],choice:{options}});
 }
 for(const captive of [false,true])for(let i=0;i<3;i++){
  const prefix=captive?'captive':'retired',sid=`life.${prefix}.${i+1}`;
  const titles=captive?['囚居的日常','年复一年的家书','药食与转移']:['第一道不同的诏','故人渐渐老去','把明日交给别人'];
  const lines=captive?['受拘后的生活仍在继续。你安排饮食、照护，也核实每次可能的交换。','多年过去，通信时断时续。亲属的去向只有已核实的消息才写进家书。','又过多年，身体已长期衰弱。转移与药食仍要争取，没有一次口信能抵销这些损耗。']:['新君发出与你不同的命令。你听完解释，没有重新取回已经交出的印。','岁月又过许多。旧友有的来访，有的已不在人世；家里渐渐有了新的日常。','又过多年，你已经年迈。尚可说清的安排，就在今天交给愿意接手的人。'];
  const next=i<2?`life.${prefix}.${i+2}`:captive?'life.captive.last':'life.final';
  d.scenes.push({id:sid,name:titles[i],source:'docs/剧本/归档/节点网重构前-20261106/失位之后的故事线.md',act:3,type:'life',period:'lifetime',once:true,weight:1,cast:[],tension:3,beat:'喘息',advanceDays:[3650,3650,3650][i],onEnter:[`身 -${[7,15,15][i]} @病`],shots:[{card:{title:titles[i],note:'多年以后 · 架空人生'}},{bg:captive?'bg.jin_camp':'bg.study',think:lines[i],music:'cue.harem'},{think:captive?'仍然求存，仍然等信。这些年也是这一生。':'活着的时候，明日还可以有新的选择。'}],choice:{options:[{id:'care',text:captive?'争取照护，继续保持联系。':'保重身体，和家人过日子。',effects:['身 +小'],goto:next},{id:'letter',text:captive?'核实文书，保留转移的请求。':'回信，把旧事说给后人听。',goto:next},{id:'rest',text:'放下手边的事，歇一歇。',effects:['身 +中'],tags:['享乐'],goto:next}]}});
 }
 for(const captive of [false,true]){const e=terminal(captive?103:33,4);if(!captive){e.why='你在{日期}走完了这一生。曾经的选择、交付的权力与留下的人，构成了最后的评语。';e.history='历尽前事，暮年完成嘱托，最终安然离世。';e.variants=[{if:'!旗标.即位',history:'这一生未曾即位，经历战乱与安居，最终安然离世。',historian:'人去，家中仍有明日。',temple:'一生之评',epithet:'怀'}];}const sid=captive?'life.captive.last':'life.final';
 d.scenes.push({id:sid,name:captive?'最后一次换岗':'灯下最后的嘱托',source:'docs/剧本/归档/节点网重构前-20261106/结局总表.md#'+e.no,act:3,type:'life',period:'lifetime',once:true,weight:1,cast:[],tension:4,beat:'喘息',advanceDays:3650,shots:[{card:{title:captive?'囚居暮年':'生命的最后一程',note:'岁月已过 · 此为架空人生，非史实卒年'}},{bg:captive?'bg.jin_camp':'bg.study',think:captive?'暮年的病情反复了许久。已有照护仍无法扭转，最后的转移请求未能成行。':'年迈的身体渐渐衰竭。许多日的照护之后，你仍知道这一生走到了尽头。'},{think:captive?'门外还在换岗，你已无力再应声。主角于囚居中病逝。':'最后的话已经说完。灯下的人轻声报知：你已安然离世。'}],next:e.id});}
 for(const e of d.endings){if(e.kind==='event'){
  const route=endInfoRoute(e.no);
  const identities:Record<string,string>={R02:'受拘',R03:'废居',R04:'有名无权',R05:'退居',R06:'宗室',R07:'流亡',R08:'两中心协商'};
  if(identities[route])e.effects=[`旗标.身份 = ${identities[route]}`,`旗标.人生路线 = ${route}`];
 }}
 function endInfoRoute(n:number){return [21,22,23,24,59].includes(n)?'R02':[18,88].includes(n)?'R03':n===17?'R04':[41,42,47].includes(n)?'R05':n===46?'R06':n===43?'R07':'current';}
}
