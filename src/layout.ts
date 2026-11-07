import {fitDialogue} from './dialogue';
/** Keep artwork on whole physical pixels; text uses its own readable CSS size. */
export function fitStage(stage:HTMLElement){
 const dpr=devicePixelRatio||1;
 if(stage.classList.contains('responsive-stage')){
  const available=Math.min(innerWidth,540),width=Math.max(180/dpr,Math.floor(available*dpr/180)*180/dpr),height=Math.min(innerHeight,900),paper=stage.classList.contains('paper-dialogue'),decision=stage.classList.contains('decision-card')&&!paper,frameHeight=paper||stage.classList.contains('opening-cinematic')?height:decision?(height-42)*.55:height-42;
  stage.style.width=width+'px';stage.style.height=height+'px';stage.style.transform='none';stage.style.left=Math.round((innerWidth-width)/2*dpr)/dpr+'px';stage.style.top=Math.round((innerHeight-height)/2*dpr)/dpr+'px';
  if(!paper)for(const face of stage.querySelectorAll<HTMLElement>('.face'))for(const key of ['top','bottom','width','height'])face.style.removeProperty(key);
  const sceneScale=Math.ceil(Math.max(width/180,decision?0:frameHeight/320)*dpr)/dpr,actorScale=Math.max(1/dpr,Math.floor(Math.min(width*.46/96,(frameHeight-12)/128)*dpr)/dpr);
  stage.style.setProperty('--scene-scale',String(sceneScale));stage.style.setProperty('--actor-width',96*actorScale+'px');stage.style.setProperty('--actor-height',128*actorScale+'px');
  const id=stage.querySelector<HTMLElement>('#background>[data-asset]')?.dataset.asset;
  stage.style.setProperty('--scene-shift',decision&&['bg.v3.modern_home','cut.v3.modern_breakfast'].includes(id||'')?60*sceneScale+'px':'0px');fitDialogue(stage);return;
 }
 const k=Math.max(1/dpr,Math.min(Math.floor(innerWidth*dpr/180)/dpr,Math.floor(innerHeight*dpr/300)/dpr)),h=Math.min(Math.floor(innerHeight/k),440);stage.style.height=h+'px';stage.style.transform=`scale(${k})`;stage.style.left=Math.round((innerWidth-180*k)/2*dpr)/dpr+'px';stage.style.top=Math.round((innerHeight-h*k)/2*dpr)/dpr+'px';
}
