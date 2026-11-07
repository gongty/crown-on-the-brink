import {fitStage} from './layout';
import './style.css';
import release from './generated/build.json';
// Keep the first screen independent of the full script, portraits and animation files.
const stage=document.querySelector<HTMLElement>('#stage')!;
function layout(){fitStage(stage);}
stage.classList.toggle('responsive-stage',(release as any).storyVersion?.startsWith('forward-'));stage.classList.toggle('forward-ui',(release as any).storyVersion?.startsWith('forward-'));layout();addEventListener('resize',layout);
stage.innerHTML='<header id="hud">'+['guan','bing','min','qian','shen'].map((id,i)=>`<div class="bar"><i style="height:50%"></i><img class="hud-icon" alt="${'官兵民钱身'[i]}" src="assets/art/icon/icon.${id}.png"><span class="bar-letter">${'官兵民钱身'[i]}</span></div>`).join('')+'<div class="march"><span style="left:10%"><img src="assets/art/map/map.flag_jin.gif" alt="金军"></span><b><img src="assets/art/map/map.flag_song.gif" alt="东京"></b></div></header><section id="overlay" class="title"><div class="title-art"><img style="width:100%;height:100%;object-fit:cover" src="assets/art/end/end.21_jingkang.gif" alt=""></div><div class="title-words"><strong class="v">开局就亡国</strong><small class="v">魂穿宋钦宗</small></div><div class="title-bottom"><p class="scarlet">离靖康还有 356 天</p><p class="caption">架空：自你接位起，历史分岔</p><button class="primary" id="boot-start">改命</button><button class="plain" id="boot-continue">续前缘</button><p class="caption">十种国家命运 · 一路向前</p><p class="caption" id="boot-status"></p></div></section>';
const isContract=false;document.querySelector('#boot-status')!.textContent='每次一件事，每次都向前';
let loading=false;
async function launch(action:string){if(loading)return;loading=true;const status=document.querySelector('#boot-status')!;status.textContent='史书展开中……';try{await import('./main');removeEventListener('resize',layout);document.querySelector<HTMLButtonElement>('#'+action)?.click();}catch(e){loading=false;status.textContent='新卷暂未加载，请再试一次。';console.error(e);}}
document.querySelector('#boot-start')!.addEventListener('click',()=>void launch('start'));document.querySelector('#boot-continue')!.addEventListener('click',()=>void launch('continue'));
try{document.querySelector<HTMLElement>('#boot-continue')!.hidden=!Object.keys(localStorage).some(k=>k.startsWith('guanjia.save.v2.guanjia-forward.'));}catch{document.querySelector<HTMLElement>('#boot-continue')!.hidden=true;}
stage.dataset.version=(release as any).storyVersion||'';stage.dataset.storyHash=(release as any).storyHash||'';

if(!(release as any).storyVersion?.startsWith('forward-')){document.querySelector<HTMLElement>('#boot-status')!.textContent='新版正在接入，旧存档已保留';document.querySelector<HTMLButtonElement>('#boot-start')!.disabled=true;document.querySelector<HTMLButtonElement>('#boot-continue')!.hidden=true;}
