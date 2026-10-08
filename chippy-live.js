/* Compact on-page companion. Comfort and activities; no chat or workspace panel. */
(()=>{
 'use strict';if(globalThis.__feedshieldChippyMounted==='0.9.19')return;globalThis.__feedshieldChippyMounted='0.9.19';
 const api=FeedShieldBrowser,appearance=FeedShieldChippyAppearance;
 const defaults={chippyLiveEnabled:false,chippyCorner:0,chippyTucked:false,chippyX:-1,chippyY:-1,feedshieldChippyAppearanceV1:{},feedshieldChippyScheduleV1:null};
 const care=globalThis.FeedShieldChippyCare;
 let current={...defaults},host,shadow,cat,art,panel,dock,catButton,dragButton,heartButton,menuButton,status,clock,view='',manual=false,disposed=false,polling=false,expires=0,revision=0,drag=null,phrase=0,activity=null,step=0;
 let returnFocus=null;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),systemTheme=matchMedia('(prefers-color-scheme: dark)');
 const request=message=>api.runtime.sendMessage(message).then(r=>{if(!r?.ok)throw Error(r?.error||'Chippy could not save that.');return r.value;});
 const element=(tag,text,parent)=>{const el=document.createElement(tag);if(text)el.textContent=text;parent?.append(el);return el;};
 function button(text,fn,parent){const b=element('button',text,parent);b.type='button';b.onclick=fn;return b;}
 function announce(text){if(status)status.textContent=text;}
 function rememberDraft(){}
 function remove(){rememberDraft();clearInterval(clock);clock=null;globalThis.FeedShieldChippyRenderer?.stop(cat);host?.remove();host=null;view='';expires=0;}
 function save(patch){Object.assign(current,patch);paint();if(panel&&host)renderPanel();return api.storage.local.set(patch).catch(e=>announce(e.message));}
 function close(){rememberDraft();view='';expires=0;renderPanel();returnFocus?.focus();}
 function open(next,trigger){rememberDraft();returnFocus=trigger||menuButton;view=next;expires=0;renderPanel();requestAnimationFrame(()=>{panel.querySelector('button')?.focus();});}
 async function snooze(action){try{await request({type:'chippy.action',action});close();}catch(e){announce(e.message);}}
 async function workspace(){try{await request({type:'app.open',route:'chippy'});}catch(e){announce(e.message);}}
 function title(text){const row=element('div',null,panel);row.className='panel-heading';element('strong',text,row);const x=button('×',close,row);x.setAttribute('aria-label','Close Chippy panel');}
 function renderPanel(){
  if(!panel)return;panel.replaceChildren();panel.hidden=!view;panel.setAttribute('aria-label',view==='menu'?'Chippy menu':'A little company');
menuButton.setAttribute('aria-expanded',String(view==='menu'));heartButton.setAttribute('aria-expanded',String(view==='comfort'));
  if(!view){layout();return;}
  if(view==='menu'){
   title(appearance.normalize(current.feedshieldChippyAppearanceV1).name);
   const links=element('div',null,panel);links.className='menu-links';

   const details=element('details',null,links);element('summary','A little company',details);
   button('A comforting thought',()=>{activity=null;open('comfort',menuButton);},details);
   for(const [id,a]of Object.entries(care.activities))button(a.title,()=>{activity=id;step=0;open('activity',menuButton);},details);
   button('Appearance & reminders',workspace,links);button('Snooze nudges · 1 hour',()=>snooze('hour'),links);
   button(current.chippyTucked?'Show Chippy':'Tuck away',()=>{view='';save({chippyTucked:!current.chippyTucked});},links);
   button('Turn off companion',()=>{manual=false;save({chippyLiveEnabled:false});},links);button('Close menu',close,links);
  }else if(view==='comfort'){
   title('A little boost');const thought=element('p',care.comfort[phrase++%care.comfort.length],panel);thought.setAttribute('role','status');button('Another kind thought',()=>open('comfort',returnFocus),panel);
  }else if(view==='activity'){
   const a=care.activities[activity];title(a.title);element('p',`Step ${step+1} of ${a.steps.length}`,panel).className='muted';element('p',a.steps[step],panel);
   button(step<a.steps.length-1?'Next step':'Done',()=>{if(step<a.steps.length-1){step++;renderPanel();}else close();},panel);button('Finish for now',close,panel);
  }else if(view==='reminder'){
   title('A little pause');element('p',current.reminder||'A sip of water, human?',panel);
   if(current.reminderKind==='hydration')button('Had some water',()=>snooze('water'),panel);button('Remind me later',()=>snooze('later'),panel);button('Dismiss',()=>snooze('dismiss'),panel);
  }
  status=element('p',null,panel);status.className='status';status.setAttribute('role','status');layout();
 }
 function layout(){
  if(!host)return;host.hidden=!!document.fullscreenElement;if(host.hidden)return;
  const box=dock.getBoundingClientRect(),w=box.width,h=box.height;
  const pinned=current.chippyX>=0&&current.chippyY>=0;
  let left,top;
  if(drag){left=drag.left;top=drag.top;}
  else if(pinned){left=12+current.chippyX*Math.max(0,innerWidth-w-24);top=12+current.chippyY*Math.max(0,innerHeight-h-24);}
  else{
   const blocked=[...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')].filter(el=>!host.contains(el)).map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height);
   const place=globalThis.FeedShieldChippyPlacement?.choose({viewportWidth:innerWidth,viewportHeight:innerHeight,width:w,height:h,corner:current.chippyCorner||0,blocked});
   if(!place&&!manual&&!view){host.hidden=true;return;}
   left=place?.left??innerWidth-w-12;top=place?.top??innerHeight-h-12;
  }
  left=Math.max(8,Math.min(left,innerWidth-w-8));top=Math.max(8,Math.min(top,innerHeight-h-8));host.style.left=left+'px';host.style.top=top+'px';
  if(view){
   const pw=Math.min(420,innerWidth-24);panel.style.width=pw+'px';panel.style.maxHeight=Math.max(80,innerHeight-24)+'px';
   const ph=Math.min(panel.scrollHeight,innerHeight-24),above=top-12,below=innerHeight-(top+h)-12;
   let py=above>=ph?top-ph-10:below>=ph?top+h+10:Math.max(12,Math.min(top-ph-10,innerHeight-ph-12));
   const px=Math.max(12,Math.min(left+w-pw,innerWidth-pw-12));panel.style.left=(px-left)+'px';panel.style.top=(py-top)+'px';
  }
 }
 function moveEnd(){if(!drag)return;const b=dock.getBoundingClientRect();const x=(drag.left-12)/Math.max(1,innerWidth-b.width-24),y=(drag.top-12)/Math.max(1,innerHeight-b.height-24);drag=null;save({chippyX:Math.max(0,Math.min(1,x)),chippyY:Math.max(0,Math.min(1,y))});}
 function mount(){
  document.querySelectorAll('#feedshield-chippy-live').forEach(node=>node.remove());host=document.createElement('div');host.id='feedshield-chippy-live';host.style.cssText='all:initial;position:fixed!important;z-index:2147483647!important;';shadow=host.attachShadow({mode:'closed'});
  const style=element('style',null,shadow);style.textContent=`:host([hidden]),[hidden]{display:none!important}*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer;color:var(--ink);background:var(--control);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-height:40px}button:hover{border-color:var(--link)}button:disabled{opacity:.5;cursor:default}:focus-visible{outline:3px solid var(--link);outline-offset:3px}.dock{display:flex;flex-direction:column;align-items:center;gap:10px;font:14px/1.5 system-ui,sans-serif;color:var(--ink)}.cat{border:0;background:transparent;padding:0;line-height:0}.cat img{image-rendering:pixelated;object-fit:contain}.toolbar{display:flex;gap:8px}.heart{color:#f3a9c5;font-size:20px;line-height:1;padding:10px 14px}.drag{cursor:grab;touch-action:none}.panel{position:absolute;font:14px/1.55 system-ui,sans-serif;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:24px;overflow:auto;box-shadow:0 12px 35px #0005}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px}.panel-heading strong{font-size:16px}.panel-heading button{padding:6px 12px}.menu-links{display:grid;gap:7px}.menu-links>button,.menu-links details button{width:100%;text-align:left}.menu-links details button{margin-top:6px}summary{cursor:pointer;font-size:12px;margin:12px 0}p{margin:14px 0}.chat-prompt{font-weight:600}.composer{display:flex;align-items:end;gap:12px;margin:24px 0 16px}.composer textarea{width:100%;min-width:0;min-height:84px;resize:vertical;border-radius:10px;padding:14px;background:var(--control);color:var(--ink);border:1px solid var(--line)}.messages{max-height:180px;overflow:auto}.messages p{border-radius:10px;padding:10px;background:var(--control)}.messages b,.messages span{display:block;white-space:pre-wrap;overflow-wrap:anywhere}.messages b{font-size:11px;color:var(--muted)}.muted,.status{font-size:12px;color:var(--muted)}.status:empty{display:none}.panel>button{margin:4px 6px 0 0}@media(max-width:420px){.panel{padding:18px}.composer{gap:8px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}`;
  dock=element('div',null,shadow);dock.className='dock';catButton=button('',()=>open('menu',menuButton),dock);catButton.className='cat';catButton.setAttribute('aria-label','Open Chippy menu');art=element('span',null,catButton);cat=element('img',null,art);cat.alt='';cat.onload=layout;
  const toolbar=element('div',null,dock);toolbar.className='toolbar';dragButton=button('⠿',()=>{},toolbar);dragButton.className='drag';dragButton.setAttribute('aria-label','Move Chippy; drag or use arrow keys');

  heartButton=button('♥',()=>{activity=null;open('comfort',heartButton);},toolbar);heartButton.className='heart';heartButton.setAttribute('aria-label','A little pep from Chippy');heartButton.title='A little pep from Chippy';
  menuButton=button('•••',()=>view==='menu'?close():open('menu',menuButton),toolbar);menuButton.setAttribute('aria-label','Chippy menu');
  panel=element('section',null,shadow);panel.className='panel';panel.hidden=true;
  dragButton.onpointerdown=e=>{if(e.button!==0)return;const b=host.getBoundingClientRect();drag={startX:e.clientX,startY:e.clientY,x:b.left,y:b.top,left:b.left,top:b.top};dragButton.setPointerCapture(e.pointerId);};
  dragButton.onpointermove=e=>{if(!drag)return;drag.left=drag.x+e.clientX-drag.startX;drag.top=drag.y+e.clientY-drag.startY;layout();};dragButton.onpointerup=moveEnd;dragButton.onpointercancel=moveEnd;
  dragButton.onkeydown=e=>{const delta={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(!delta)return;e.preventDefault();const b=host.getBoundingClientRect();drag={left:b.left+delta[0],top:b.top+delta[1]};layout();moveEnd();};
  shadow.addEventListener('keydown',e=>{if(e.key==='Escape'&&view){e.preventDefault();close();}});
  document.documentElement.append(host);clock=setInterval(tick,15000);
 }
 function paint(){
  if(disposed)return;if(globalThis.frameElement?.hidden){remove();return;}if(!current.chippyLiveEnabled&&!manual){remove();return;}if(!host)mount();
  const v=appearance.normalize(current.feedshieldChippyAppearanceV1);for(const [key,value]of Object.entries(appearance.theme(v,systemTheme.matches)))host.style.setProperty(key,value);
  catButton.hidden=current.chippyTucked;const size=v.size;cat.width=size;cat.height=size;cat.style.transform=v.mirror?'scaleX(-1)':'none';
  globalThis.FeedShieldChippyRenderer?.paint(cat,v,motion.matches,p=>api.runtime.getURL(p));cat.src=api.runtime.getURL(appearance.asset(v,motion.matches));layout();
 }
 async function tick(){
  if(!host||disposed||!current.chippyLiveEnabled||current.chippyTucked||polling||document.visibilityState==='hidden'||document.fullscreenElement||globalThis.frameElement?.hidden)return;
  if(expires&&Date.now()>=expires&&view==='reminder')close();
  if(view&&view!=='reminder')return;layout();if(host.hidden)return;polling=true;
  try{const owned=location.href.startsWith(api.runtime.getURL(''));const tab=owned?await api.runtime.currentTab():null;const message=await request({type:'chippy.claim',visible:true,...(tab?{tabId:tab.id}:{})});if(message&&host&&current.chippyLiveEnabled&&!disposed&&!view){current.reminder=message.text;current.reminderKind=message.kind;view='reminder';expires=message.expiresAt;renderPanel();}}catch(e){announce(e.message);}finally{polling=false;}
 }
 function show(){manual=true;current.chippyTucked=false;paint();open('menu',menuButton);return {shown:true};}
 globalThis.FeedShieldChippyOpen=show;if(globalThis.frameElement)new MutationObserver(()=>paint()).observe(frameElement,{attributes:true,attributeFilter:['hidden']});
 const native=globalThis.browser||globalThis.chrome;native?.runtime?.onMessage?.addListener((message,sender,reply)=>{if(message?.type==='chippy.show'){reply(show());}});
 const changed=(changes,area)=>{if(area!=='local')return;rememberDraft();revision++;for(const key of Object.keys(defaults))if(changes[key])current[key]=changes[key].newValue;if(changes.chippyLiveEnabled?.newValue===false)manual=false;if(changes.feedshieldChippyScheduleV1?.newValue?.silenceAt!==changes.feedshieldChippyScheduleV1?.oldValue?.silenceAt&&view==='reminder'){view='';expires=0;}paint();if(panel)renderPanel();};
 async function loadSettings(){const touched=new Set();const watch=(changes,area)=>{if(area==='local')for(const key of Object.keys(changes))touched.add(key);};api.storage.onChanged.addListener(watch);try{const value=await api.storage.local.get(defaults);for(const key of Object.keys(defaults))if(!touched.has(key))current[key]=value[key]??defaults[key];paint();tick();}finally{api.storage.onChanged.removeListener(watch);}}
 api.storage.onChanged.addListener(changed);loadSettings().catch(()=>remove());
 motion.addEventListener('change',paint);systemTheme.addEventListener('change',paint);addEventListener('resize',layout);document.addEventListener('fullscreenchange',layout);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&view==='reminder')close();else tick();});
 addEventListener('pagehide',()=>{disposed=true;remove();api.storage.onChanged.removeListener(changed);});
 addEventListener('pageshow',e=>{if(e.persisted){disposed=false;api.storage.onChanged.addListener(changed);loadSettings().catch(()=>remove());}});
})();
