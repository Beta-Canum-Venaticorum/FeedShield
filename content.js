
(() => {
 const defaults={
  blockSponsored:false,blockDrama:true,blockSexualized:true,blockAI:true,
  visualScan:true,autoHideVisual:true,visualThreshold:60,showPlaceholder:true,
  frameCount:4,sampleWindowMs:3000,
  customTerms:"DramaBox\nReelShort\nShortMax\nGoodShort\nFlexTV\nMoboReels",
  blockedAdvertisers:[],blockedCategories:[],allowedAdvertisers:[],protectionEnabled:true,tiktokEnabled:true,manualFlags:[],hiddenItems:[]
 };
 let settings={...defaults},neuralEnabled=false,scanBusy=false;
 const pending=new Map();let seq=0;

 const frame=document.createElement("iframe");
 frame.src=chrome.runtime.getURL("sandbox.html");
 frame.style.cssText="position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;border:0";
 document.documentElement.appendChild(frame);

 window.addEventListener("message",e=>{
   const m=e.data;if(!m||m.__feedshield!==true||!m.id)return;
   const p=pending.get(m.id);
   if(p){pending.delete(m.id);m.ok?p.resolve(m):p.reject(new Error(m.error||"Classifier error"))}
 });
 function sandboxCall(type,payload={},timeout=30000){
   return new Promise((resolve,reject)=>{
     const id=`fs_${Date.now()}_${++seq}`;
     const timer=setTimeout(()=>{pending.delete(id);reject(new Error("Classifier timeout"))},timeout);
     pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
     frame.contentWindow.postMessage({__feedshield:true,type,id,...payload},"*");
   });
 }

 chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
   if(msg?.type==="FEEDSHIELD_ENABLE_VISUAL_CHECK"){
     neuralEnabled=true;
     sandboxCall("PING_MODEL",{},45000)
       .then(()=>{sendResponse({ok:true});rescan(true)})
       .catch(err=>sendResponse({ok:false,error:err.message}));
     return true;
   }
 });

 const drama=["dramabox","reelshort","shortmax","goodshort","flextv","moboreels","billionaire","alpha","werewolf","rejected mate","secret heir","contract marriage","ceo romance"];
 const sexual=["seduce","seduced","naked","strip","stripping","in bed","pregnant by","sleep with","slept with","mistress","lover","one night stand","affair"];
 const ai=["creator labeled as ai-generated","creator labelled as ai-generated","ai-generated content","ai generated","ai-generated","generated with ai","synthetic media","created with ai","made with ai"];
 const norm=s=>(s||"").toLowerCase().replace(/\s+/g," ").trim();
 const uniq=a=>[...new Set(a)];
 const custom=()=>settings.customTerms.split(/\n|,/).map(norm).filter(Boolean);
 const sponsored=t=>/\bsponsored\b|\bad\b|\bpaid partnership\b|\bpromoted\b/i.test(t);
 const aiLabeled=t=>ai.some(x=>norm(t).includes(x));

 function advertiser(el,text){
   for(const sel of ['a[href*="/@"]','[data-e2e*="author"]','[data-e2e*="username"]','[data-e2e*="user-title"]']){
     const v=el.querySelector(sel)?.textContent?.trim();
     if(v&&v.length<80)return v;
   }
   const t=norm(text);for(const x of [...drama,...custom()])if(t.includes(x))return x;
   return "Unknown advertiser";
 }
 function categories(text){
   const t=norm(text),o=[];
   if([...drama,...custom()].some(x=>t.includes(x)))o.push("short-drama");
   if(sexual.some(x=>t.includes(x)))o.push("sexualized");
   if(ai.some(x=>t.includes(x)))o.push("ai-labeled");
   if(sponsored(text))o.push("sponsored");
   return uniq(o);
 }
 function textReasons(el,text){
   const muted=custom().some(x=>norm(text).includes(x));
   if(!sponsored(text)&&!muted&&!aiLabeled(text))return[];
   const t=norm(text),ad=norm(advertiser(el,text)),c=categories(text),o=[];
   if((settings.allowedAdvertisers||[]).map(norm).includes(ad))return[];
   if((settings.blockedAdvertisers||[]).map(norm).includes(ad))o.push("blocked advertiser");
   if((settings.blockedCategories||[]).some(x=>c.includes(x)))o.push("blocked category");
   if(settings.blockSponsored)o.push("sponsored content");
   if(muted)o.push("muted word, hashtag or source");
   if(settings.blockDrama&&drama.some(x=>t.includes(x)))o.push("short-drama / blocked brand");
   if(settings.blockSexualized&&sexual.some(x=>t.includes(x)))o.push("sexualized ad wording");
   if(settings.blockAI&&aiLabeled(text))o.push("Creator labeled this as AI-generated");
   return uniq(o);
 }
 function itemUrl(el){
   const raw=el.querySelector('a[href*="/video/"]')?.href||(/\/video\/\d+/.test(location.pathname)?location.href:"");
   if(!raw)return"";
   try{const u=new URL(raw,location.href),m=u.pathname.match(/\/video\/(\d+)/);return m?`${u.origin}${u.pathname.slice(0,m.index)}/video/${m[1]}`:""}catch{return""}
 }
 function validSavedUrl(url){try{return /\/video\/\d+\/?$/.test(new URL(url).pathname)}catch{return false}}
 function candidates(){
   const s=new Set();
   document.querySelectorAll('article,[data-e2e*="feed"],[data-e2e*="video"],div[role="listitem"]').forEach(x=>s.add(x));
   const matching=[...s].filter(el=>{const t=el.innerText||"";return el.querySelector('video')&&t.length>5&&t.length<10000&&(sponsored(t)||aiLabeled(t)||custom().some(x=>norm(t).includes(x)))});
   return matching.filter(el=>!matching.some(other=>other!==el&&el.contains(other)));
 }
 function feedCards(){
   const s=new Set();
   document.querySelectorAll('article,[data-e2e*="feed"],[data-e2e*="video"],div[role="listitem"]').forEach(el=>{
     const t=el.innerText||"";
     if(t.length>5&&t.length<10000&&el.querySelector('video'))s.add(el);
   });
   // Keep the smallest matching container for each visible video so buttons are not duplicated.
   return [...s].filter(el=>![...s].some(other=>other!==el&&el.contains(other)&&other.querySelector('video')));
 }
 function visible(el){
   const r=el.getBoundingClientRect();
   const w=Math.max(0,Math.min(r.right,innerWidth)-Math.max(r.left,0));
   const h=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0));
   return w*h>Math.min(Math.max(1,r.width*r.height),innerWidth*innerHeight)*.25;
 }
 function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
 function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}
 async function cropVisibleAd(el){
   const shot=await chrome.runtime.sendMessage({type:"FEEDSHIELD_CAPTURE_VISIBLE"});
   if(!shot?.ok)throw new Error(shot?.error||"Screen capture failed");
   const img=await loadImage(shot.dataUrl),r=el.getBoundingClientRect();
   const sx=img.width/innerWidth,sy=img.height/innerHeight;
   const x=Math.max(0,Math.floor(r.left*sx)),y=Math.max(0,Math.floor(r.top*sy));
   const w=Math.max(1,Math.min(img.width-x,Math.floor(r.width*sx)));
   const h=Math.max(1,Math.min(img.height-y,Math.floor(r.height*sy)));
   const scale=Math.min(1,448/Math.max(w,h));
   const cw=Math.max(1,Math.floor(w*scale)),ch=Math.max(1,Math.floor(h*scale));
   const c=document.createElement("canvas");c.width=cw;c.height=ch;
   c.getContext("2d").drawImage(img,x,y,w,h,0,0,cw,ch);
   return c.toDataURL("image/jpeg",.82);
 }

 function aggregateFrames(frames){
   const scores=frames.map(f=>f.score).sort((a,b)=>a-b);
   const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
   const max=Math.max(...scores);
   const median=scores.length%2?scores[(scores.length-1)/2]:(scores[scores.length/2-1]+scores[scores.length/2])/2;
   const above=scores.filter(s=>s>=settings.visualThreshold).length;
   // Conservative blend: favors sustained risk, but still notices repeated spikes.
   const combined=Math.round((avg*.45)+(median*.35)+(max*.20));
   return {avg:Math.round(avg),median:Math.round(median),max:Math.round(max),combined,above,total:scores.length};
 }

 async function neuralMultiFrameScan(el){
   if(!neuralEnabled||scanBusy||!visible(el))return null;
   scanBusy=true;
   try{
     const count=Math.max(2,Math.min(6,Number(settings.frameCount)||4));
     const windowMs=Math.max(1200,Math.min(6000,Number(settings.sampleWindowMs)||3000));
     const gap=count>1?Math.floor(windowMs/(count-1)):0;
     const frames=[];
     for(let i=0;i<count;i++){
       if(!visible(el)) break;
       const dataUrl=await cropVisibleAd(el);
       const r=await sandboxCall("CLASSIFY_IMAGE",{dataUrl},45000);
       frames.push({
         score:Math.round((r.sexualRisk||0)*100),
         predictions:r.predictions||[]
       });
       if(i<count-1) await sleep(gap);
     }
     if(!frames.length)return null;
     const agg=aggregateFrames(frames);
     return {frames,...agg};
   } finally {scanBusy=false}
 }

 function addList(key,value){
   if(!value||value==="Unknown advertiser")return Promise.resolve(false);
   return new Promise(resolve=>chrome.storage.local.get({[key]:[]},o=>{
     const a=o[key]||[];if(!a.map(norm).includes(norm(value)))a.push(value);
     chrome.storage.local.set({[key]:a},()=>resolve(true));
   }));
 }

 function note(meta){
   const per=(meta.neural?.frames||[]).map((f,i)=>`Frame ${i+1}: ${f.score}%`).join(", ");
   return [
    "FeedShield report note","",
    `Advertiser: ${meta.advertiser}`,
    `Detected categories: ${meta.categories.join(", ")||"unknown"}`,
    `Reason flagged: ${meta.reasons.join(", ")||"user flagged"}`,
    meta.neural?`Visual sensitivity match: ${meta.neural.combined}%`:"Visual check: not run",
    meta.neural?`Average: ${meta.neural.avg}% | Median: ${meta.neural.median}% | Max: ${meta.neural.max}% | Frames above threshold: ${meta.neural.above}/${meta.neural.total}`:"",
    per?`Per-frame: ${per}`:"",
    "",
    "This sponsored post appears to contain content I do not want to see. Please review it against TikTok's advertising and AI-generated content policies.",
    "",`Page: ${location.href}`
   ].filter(Boolean).join("\n");
 }

 function manualReport(meta){
   return [
     "FeedShield manual flag","",
     `Reason: ${meta.reason}`,
     `Advertiser or creator: ${meta.advertiser}`,
     `Sponsored marker detected: ${meta.sponsored?"yes":"no"}`,
     `Detected categories: ${meta.categories.join(", ")||"none"}`,
     meta.details?`User note: ${meta.details}`:"",
     `Flagged at: ${meta.flaggedAt}`,
     "",`Page: ${meta.url}`
   ].filter(Boolean).join("\n");
 }

 function saveManualFlag(meta){
   return new Promise(resolve=>chrome.storage.local.get({manualFlags:[],hiddenItems:[]},o=>{
     const flags=Array.isArray(o.manualFlags)?o.manualFlags:[];
     flags.unshift(meta);
     const hidden=(Array.isArray(o.hiddenItems)?o.hiddenItems:[]).filter(validSavedUrl);if(validSavedUrl(meta.url)&&!hidden.includes(meta.url))hidden.unshift(meta.url);
     // Keep bounded local logs. No screenshots or uploads.
     chrome.storage.local.set({manualFlags:flags.slice(0,200),hiddenItems:hidden.slice(0,500)},()=>resolve());
   }));
 }

 function addFlagButton(el){
   const canonical=itemUrl(el);
   if(el.dataset.feedshieldItemKey!==undefined&&el.dataset.feedshieldItemKey!==canonical){
     el.classList.remove("feedshield-hidden");delete el.dataset.feedshieldFlagButton;delete el.dataset.feedshieldProcessed;
     el.querySelector(':scope > .feedshield-flag-button')?.remove();el.querySelector(':scope > .feedshield-flag-panel')?.remove();
   }
   el.dataset.feedshieldItemKey=canonical;
   if(el.dataset.feedshieldFlagButton==="1")return;
   if(canonical&&(settings.hiddenItems||[]).includes(canonical)){el.classList.add("feedshield-hidden");return}
   el.dataset.feedshieldFlagButton="1";el.classList.add("feedshield-flag-host");
   const btn=document.createElement("button");btn.className="feedshield-flag-button";btn.type="button";btn.textContent="Tell FeedShield";btn.title="Teach FeedShield about this post";
   btn.onclick=e=>{
     e.preventDefault();e.stopPropagation();
     const old=el.querySelector(':scope > .feedshield-flag-panel');if(old){old.remove();return}
     const panel=document.createElement("div");panel.className="feedshield-flag-panel";
     const title=document.createElement("strong");title.textContent="What should FeedShield learn?";
     const label=document.createElement("label");label.textContent="Reason";
     const sel=document.createElement("select");
     ["Sexualized or coercive","Graphic, frightening or self-harm","Animal harm","Hate or targeted harassment","AI-generated or synthetic","Scam or impersonation","Breaking news or conflict footage","Old news presented as current","Propaganda or misleading claims","Promotional or short-drama content","Other"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;sel.append(o)});
     const dl=document.createElement("label");dl.textContent="Optional note";
     const details=document.createElement("textarea");details.placeholder="What did the detector miss? Do not include private information.";
     const actions=document.createElement("div");actions.className="feedshield-flag-actions";
     const save=document.createElement("button");save.className="primary";save.textContent="Hide and remember";
     const copy=document.createElement("button");copy.textContent="Prepare platform report";
     const cancel=document.createElement("button");cancel.textContent="Cancel";
     const status=document.createElement("div");status.className="feedshield-flag-status";
     const makeMeta=()=>{const text=el.innerText||"";return {site:"TikTok",reason:sel.value,details:details.value.trim().slice(0,500),advertiser:advertiser(el,text),sponsored:sponsored(text),categories:categories(text),url:itemUrl(el),flaggedAt:new Date().toISOString(),textExcerpt:norm(text).slice(0,240)}};
     save.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();const meta=makeMeta();await saveManualFlag(meta);panel.remove();btn.remove();hideWithUndo(el,"Hidden and saved",meta.url)};
     copy.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();const report=manualReport(makeMeta());try{await navigator.clipboard.writeText(report);status.textContent="Report copied"}catch{status.textContent="Could not copy; save the flag instead"}};
     cancel.onclick=ev=>{ev.preventDefault();ev.stopPropagation();panel.remove()};
     actions.append(save,copy,cancel);panel.append(title,label,sel,dl,details,actions,status);el.append(panel);
   };
   el.append(btn);
 }

 function attachFlagButtons(){for(const el of feedCards())addFlagButton(el)}
 function removeFlagButtons(){document.querySelectorAll('.feedshield-flag-button,.feedshield-flag-panel').forEach(x=>x.remove());document.querySelectorAll('.feedshield-flag-host').forEach(x=>x.classList.remove('feedshield-flag-host'))}

 function hideWithUndo(el,message,url){
   el.classList.add("feedshield-hidden");
   const old=document.querySelector(".feedshield-undo");if(old)old.remove();
   const bar=document.createElement("div");bar.className="feedshield-undo";bar.textContent=message+" ";
   const undo=document.createElement("button");undo.textContent="Undo";undo.onclick=()=>{chrome.storage.local.get({hiddenItems:[]},o=>chrome.storage.local.set({hiddenItems:(o.hiddenItems||[]).filter(x=>x!==url)},()=>{settings.hiddenItems=(o.hiddenItems||[]).filter(x=>x!==url);delete el.dataset.feedshieldFlagButton;el.classList.remove("feedshield-hidden");bar.remove();addFlagButton(el)}))};
   bar.append(undo);document.documentElement.append(bar);setTimeout(()=>bar.remove(),7000);
 }

 function render(el,reasons,neural){
   if(el.dataset.feedshieldProcessed==="1")return;
   el.dataset.feedshieldProcessed="1";
   const text=el.innerText||"",adv=advertiser(el,text),cats=categories(text);
   if(neural&&neural.combined>=settings.visualThreshold)cats.push("visual-sexual-risk");
   const meta={advertiser:adv,categories:uniq(cats),reasons:uniq(reasons),neural};

   if(!settings.showPlaceholder){el.classList.add("feedshield-hidden");return}

   const ph=document.createElement("div");ph.className="feedshield-placeholder";
   const title=document.createElement("strong");title.textContent="FeedShield hid an ad";
   const info=document.createElement("div");info.className="feedshield-meta";info.textContent=`${meta.reasons.join(" · ")} · ${adv}`;
   ph.append(title,info);

   if(neural){
     const box=document.createElement("div");box.className="feedshield-score";
     const frames=neural.frames.map((f,i)=>`F${i+1} ${f.score}%`).join(" · ");
     box.innerHTML=`Visual sensitivity match: <b>${neural.combined}%</b>
       <div class="feedshield-meter"><i style="width:${neural.combined}%"></i></div>
       <div class="feedshield-predictions">Average ${neural.avg}% · Median ${neural.median}% · Max ${neural.max}% · Above threshold ${neural.above}/${neural.total}</div>
       <div class="feedshield-frames">${frames}</div>`;
     ph.append(box);
   }

   const actions=document.createElement("div");actions.className="feedshield-actions";
   const ba=document.createElement("button");ba.textContent="Block advertiser";
   const bc=document.createElement("button");bc.textContent="Block category";
   const bs=document.createElement("button");bs.textContent=neural?"Check again":"Check visuals";
   const br=document.createElement("button");br.textContent="Prepare platform report";
   const show=document.createElement("button");show.textContent="Reveal once";
   const allow=document.createElement("button");allow.textContent="Always allow";
   const mistake=document.createElement("button");mistake.textContent="Not a match";
   const toast=document.createElement("div");toast.className="feedshield-toast";

   ba.onclick=async()=>toast.textContent=(await addList("blockedAdvertisers",adv))?`Blocked ${adv}`:"Advertiser not identified";
   bc.onclick=async()=>{
     const c=meta.categories.find(x=>!["sponsored","visual-sexual-risk"].includes(x));
     if(!c){toast.textContent="No specific category detected";return}
     await addList("blockedCategories",c);toast.textContent=`Blocked category: ${c}`;
   };
   show.onclick=()=>{ph.remove();el.classList.remove("feedshield-hidden");el.dataset.feedshieldProcessed="shown"};
   allow.onclick=async()=>{
     const saved=await addList("allowedAdvertisers",adv);
     if(!saved){toast.textContent="Creator or advertiser not identified — use Reveal once";return}
     ph.remove();el.classList.remove("feedshield-hidden");el.dataset.feedshieldProcessed="shown";
   };
   mistake.onclick=async()=>{const correction={site:"TikTok",reason:"Incorrect automatic match",advertiser:adv,url:itemUrl(el),detectedReasons:meta.reasons,flaggedAt:new Date().toISOString()};chrome.storage.local.get({manualFlags:[]},o=>{const flags=o.manualFlags||[];flags.unshift(correction);chrome.storage.local.set({manualFlags:flags.slice(0,200)})});ph.remove();el.classList.remove("feedshield-hidden");el.dataset.feedshieldProcessed="shown"};

   const rep=document.createElement("div");rep.className="feedshield-report";
   const ta=document.createElement("textarea");ta.readOnly=true;ta.value=note(meta);
   const cp=document.createElement("button");cp.textContent="Copy report note";
   cp.onclick=async()=>{try{await navigator.clipboard.writeText(ta.value);toast.textContent="Report note copied"}catch{ta.select();document.execCommand("copy");toast.textContent="Copied"}};
   rep.append(ta,cp);br.onclick=()=>rep.classList.toggle("open");

   bs.onclick=async()=>{
     ph.remove();el.classList.remove("feedshield-hidden");await sleep(160);
     try{
       const n=await neuralMultiFrameScan(el);el.dataset.feedshieldProcessed="";
       const rs=[...meta.reasons];
       if(n&&n.combined>=settings.visualThreshold)rs.push("likely sensitive visual content");
       render(el,rs,n||neural);
     }catch(e){
       el.dataset.feedshieldProcessed="";render(el,meta.reasons,neural);
       const t=el.previousElementSibling?.querySelector(".feedshield-toast");
       if(t)t.textContent=`Visual check failed: ${e.message}`;
     }
   };

   actions.append(ba,bc,bs,br,show,allow,mistake);
   ph.append(actions,rep,toast);
   el.before(ph);el.classList.add("feedshield-hidden");
 }

 async function process(el){
   if(el.dataset.feedshieldProcessed==="1"||el.dataset.feedshieldProcessing==="1")return;
   let reasons=textReasons(el,el.innerText||"");
   el.dataset.feedshieldProcessing="1";
   let n=null;

   if(settings.visualScan&&neuralEnabled&&visible(el)){
     try{
       n=await neuralMultiFrameScan(el);
       if(n&&n.combined>=settings.visualThreshold&&settings.autoHideVisual){
         reasons.push("likely sensitive visual content");
       }
     }catch{}
   }

   delete el.dataset.feedshieldProcessing;
   if(reasons.length)render(el,uniq(reasons),n);
 }

 async function rescan(force=false){
   for(const el of candidates()){
     if(el.dataset.feedshieldProcessed==="shown"&&!force)continue;
     await process(el);
   }
 }

 chrome.storage.local.get(defaults,c=>{const cleaned=(c.hiddenItems||[]).filter(validSavedUrl);if(cleaned.length!==(c.hiddenItems||[]).length)chrome.storage.local.set({hiddenItems:cleaned});settings={...c,hiddenItems:cleaned};if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}});
 chrome.storage.onChanged.addListener((ch,a)=>{
   if(a!=="local")return;
   for(const[k,v]of Object.entries(ch))settings[k]=v.newValue;
   if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}else removeFlagButtons();
 });

 const mo=new MutationObserver(()=>{
   clearTimeout(window.__fst);
   window.__fst=setTimeout(()=>{if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}},180)
 });
 mo.observe(document.documentElement,{childList:true,subtree:true});
 setInterval(()=>{if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}},3000);
})();
