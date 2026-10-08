
(() => {
 const defaults={
  blockSponsored:false,blockDrama:true,blockSexualized:true,blockAI:true,
  showPlaceholder:true,
  customTerms:"DramaBox\nReelShort\nShortMax\nGoodShort\nFlexTV\nMoboReels",
  blockedAdvertisers:[],blockedCategories:[],allowedAdvertisers:[],protectionEnabled:true,tiktokEnabled:true,manualFlags:[],hiddenItems:[]
 };
 let ready=false,settings={...defaults};const S=FeedShieldItemSafety;

 const {drama,sexual,ai}=FeedShieldPolicy;
 const norm=s=>(s||"").toLowerCase().replace(/\s+/g," ").trim();
 const uniq=a=>[...new Set(a)];
 const custom=()=>String(settings.customTerms||"").split(/\n|,/).map(norm).filter(Boolean);
 const sponsored=t=>/\bsponsored\b|\bad\b|\bpaid partnership\b|\bpromoted\b/i.test(t);
 const aiLabeled=FeedShieldPolicy.aiLabeled;

 function publisherId(el,text){
   // A viewer profile, a mentioned account or a comment is not the publisher.
   const identity=S.inspect(el,'TikTok');if(!identity.safe)return 'Unknown advertiser';
   const handle=new URL(identity.key).pathname.match(/^\/@([^/]+)\/video\//)?.[1];
   if(!handle)return 'Unknown advertiser';
   return /^[a-zA-Z0-9_.]{1,24}$/.test(handle)?'tiktok:@'+handle.toLowerCase():'Unknown advertiser';
 }
 function publisherName(el){
   const id=publisherId(el),handle=id.startsWith('tiktok:@')?id.slice(8):'';
   if(!handle)return 'Unknown publishing account';
   for(const link of el.querySelectorAll('a[href]')){try{const u=new URL(link.href,location.href);if(u.protocol==='https:'&&['www.tiktok.com','tiktok.com'].includes(u.hostname)&&u.pathname.replace(/\/$/,'').toLowerCase()==='/@'+handle){const label=link.textContent?.trim();if(label&&label.length<80)return label;}}catch{}}
   // A profile header can supply the legacy label only when its username and
   // the current profile URL both agree with the identified post publisher.
   const profile=location.pathname.replace(/\/$/,'').toLowerCase();
   const username=document.querySelector('[data-e2e="user-subtitle"]')?.textContent?.trim().replace(/^@/,'').toLowerCase();
   const title=document.querySelector('[data-e2e="user-title"]')?.textContent?.trim();
   if(profile==='/@'+handle&&username===handle&&title&&title.length<80)return title;
   return '@'+handle;
 }
 function categories(text){return FeedShieldPolicy.categories(text,settings)}
 function textReasons(el,text){return FeedShieldPolicy.tiktokTextReasons(text,publisherId(el,text),settings,publisherName(el))}
 function itemUrl(el){return S.inspect(el,'TikTok').key}
 function validSavedUrl(url){
   try{
     const u=new URL(url),host=u.hostname.toLowerCase();
     return u.protocol==="https:"&&(host==="tiktok.com"||host==="www.tiktok.com")&&/^\/@[^/]+\/video\/\d+\/?$/.test(u.pathname);
   }catch{return false}
 }
 function savedTikTokItems(){return(Array.isArray(settings.hiddenItems)?settings.hiddenItems:[]).filter(validSavedUrl).map(url=>S.canonical(url,'TikTok'))}
 function candidates(){
   const all=[...document.querySelectorAll('article,[data-e2e*="feed"],[data-e2e*="video"],div[role="listitem"]')];
   const valid=all.filter(el=>el.querySelector('video')&&S.inspect(el,'TikTok').safe);
   const cards=valid.filter(el=>!valid.some(other=>other!==el&&el.contains(other)));
   // Profile thumbnails need no playable video or caption. Use only the exact
   // permalink anchor with media, never the surrounding multi-post grid.
   for(const a of document.querySelectorAll('a[href]'))if(a.querySelector('img,video')&&S.canonical(a.href,'TikTok')&&S.inspect(a,'TikTok').safe&&!cards.some(el=>el.contains(a)||a.contains(el)))cards.push(a);
   return cards;
 }
 function feedCards(){return candidates();}
 function addList(key,value){
   if(FeedShieldBrowser.activity&&value&&value!=="Unknown advertiser")return FeedShieldBrowser.activity({operations:[{key,value}]}).then(()=>true);
   if(!value||value==="Unknown advertiser")return Promise.resolve(false);
   return new Promise(resolve=>FeedShieldBrowser.legacy.storage.local.get({[key]:[]},o=>{
     const a=o[key]||[];if(!a.map(norm).includes(norm(value)))a.push(value);
     FeedShieldBrowser.legacy.storage.local.set({[key]:a},()=>resolve(true));
   }));
 }

 function note(meta){
   return [
    "FeedShield report note","",
    `Publishing account: ${meta.publisherName} (${meta.publisherId})`,
    `Local text-rule categories: ${meta.categories.join(", ")||"unknown"}`,
    `Reason flagged: ${meta.reasons.join(", ")||"user flagged"}`,
    "",
    "This post matched my local filtering preferences. Please review the stated evidence against the applicable platform policies.",
    "",`Page: ${location.href}`
   ].filter(Boolean).join("\n");
 }

 function manualReport(meta){
   return [
     "FeedShield manual flag","",
     `Reason: ${meta.reason}`,
     `Publishing account: ${meta.publisherName} (${meta.publisherId})`,
     `Sponsorship wording matched: ${meta.sponsored?"yes (not verified)":"no"}`,
     `Local text-rule categories: ${meta.categories.join(", ")||"none"}`,
     meta.details?`User note: ${meta.details}`:"",
     `Flagged at: ${meta.flaggedAt}`,
     "",`Page: ${meta.url}`
   ].filter(Boolean).join("\n");
 }

 function saveManualFlag(meta){
   if(FeedShieldBrowser.activity)return FeedShieldBrowser.activity({report:meta,operations:validSavedUrl(meta.url)?[{key:"hiddenItems",value:meta.url}]:[]});
   return new Promise(resolve=>FeedShieldBrowser.legacy.storage.local.get({manualFlags:[],hiddenItems:[]},o=>{
     const flags=Array.isArray(o.manualFlags)?[...o.manualFlags]:[];
     flags.unshift(meta);
     const hidden=Array.isArray(o.hiddenItems)?[...o.hiddenItems]:[];if(validSavedUrl(meta.url)&&!hidden.includes(meta.url))hidden.unshift(meta.url);
     FeedShieldBrowser.legacy.storage.local.set({manualFlags:flags,hiddenItems:hidden},()=>resolve());
   }));
 }

 function addFlagButton(el){
   const canonical=S.bind(el,'TikTok');if(!canonical)return;
   if(el.dataset.feedshieldFlagButton==="1"||el.dataset.feedshieldHiddenBy==='FeedShield')return;
   if(S.savedMatch(settings.hiddenItems,canonical,'TikTok')&&el.dataset.feedshieldReveal!==canonical){S.hide(el,canonical,{replace:settings.showPlaceholder,reason:'You chose to hide this post'});return}
   el.dataset.feedshieldFlagButton="1";
   const btn=document.createElement("button");btn.className="feedshield-flag-button";btn.type="button";btn.textContent="Tell FeedShield";btn.title="Save a report and hide this post locally";
   btn.onclick=e=>{
     e.preventDefault();e.stopPropagation();
     const old=S.controls(el)?.querySelector('.feedshield-flag-panel');if(old){old.remove();return}
     const panel=document.createElement("div");panel.className="feedshield-flag-panel";
     const title=document.createElement("strong");title.textContent="Save a local report";
     const label=document.createElement("label");label.textContent="Reason";
     const sel=document.createElement("select");
     ["Sexualized or coercive","Graphic, frightening or self-harm","Animal harm","Hate or targeted harassment","AI-generated or synthetic","Scam or impersonation","Breaking news or conflict footage","Old news presented as current","Propaganda or misleading claims","Promotional or short-drama content","Other"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;sel.append(o)});
     const dl=document.createElement("label");dl.textContent="Optional note";
     const details=document.createElement("textarea");details.placeholder="Why are you hiding this post? Do not include private information.";
     const actions=document.createElement("div");actions.className="feedshield-flag-actions";
     const save=document.createElement("button");save.className="primary";save.textContent="Hide and remember";
     const copy=document.createElement("button");copy.textContent="Prepare platform report";
     const cancel=document.createElement("button");cancel.textContent="Cancel";
     const status=document.createElement("div");status.className="feedshield-flag-status";
     const makeMeta=()=>{const text=S.pageText(el);return {site:"TikTok",reason:sel.value,details:details.value.trim().slice(0,500),publisherId:publisherId(el,text),publisherName:publisherName(el),advertiser:null,sponsored:sponsored(text),categories:categories(text),url:itemUrl(el),flaggedAt:new Date().toISOString(),textExcerpt:norm(text).slice(0,240)}};
     save.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();if(!S.current(el,'TikTok',canonical))return;const meta=makeMeta();await saveManualFlag(meta);if(!S.current(el,'TikTok',canonical)||!settings.protectionEnabled||!settings.tiktokEnabled)return;panel.remove();btn.remove();hideWithUndo(el,"Hidden and saved",meta.url)};
     copy.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();if(!S.current(el,'TikTok',canonical))return;const report=manualReport(makeMeta());try{await navigator.clipboard.writeText(report);status.textContent="Report copied"}catch{status.textContent="Could not copy; save the flag instead"}};
     cancel.onclick=ev=>{ev.preventDefault();ev.stopPropagation();panel.remove()};
     actions.append(save,copy,cancel);panel.append(title,label,sel,dl,details,actions,status);S.mountControls(el,panel,canonical);
   };
   S.mountControls(el,btn,canonical);
 }

 function attachFlagButtons(){for(const el of feedCards())addFlagButton(el)}
 function removeFlagButtons(){document.querySelectorAll('[data-feedshield-item-site="TikTok"]').forEach(el=>{S.removeOwnedUi(el);delete el.dataset.feedshieldFlagButton;el.classList.remove('feedshield-flag-host')})}
 function restoreSite(){document.querySelectorAll('[data-feedshield-item-site="TikTok"]').forEach(S.restore)}

 function hideWithUndo(el,message,url){
   const key=S.bind(el,'TikTok');if(!key||key!==url||!settings.protectionEnabled||!settings.tiktokEnabled)return;S.hide(el,key,{replace:settings.showPlaceholder,reason:'You chose to hide this post'});
   const old=document.querySelector(".feedshield-undo");if(old)old.remove();
   const bar=document.createElement("div");bar.className="feedshield-undo";bar.dataset.feedshieldOwnerRef=el.dataset.feedshieldOwner;bar.textContent=message+" ";
   const undo=document.createElement("button");undo.textContent="Undo";undo.onclick=()=>{if(FeedShieldBrowser.activity){FeedShieldBrowser.activity({operations:[{key:"hiddenItems",value:url,remove:true}]}).then(update=>{Object.assign(settings,update);if(S.current(el,"TikTok",url)){S.restore(el);addFlagButton(el);}bar.remove();}).catch(FeedShieldBrowser.report);return;}FeedShieldBrowser.legacy.storage.local.get({hiddenItems:[]},o=>FeedShieldBrowser.legacy.storage.local.set({hiddenItems:(o.hiddenItems||[]).filter(x=>x!==url)},()=>{settings.hiddenItems=(o.hiddenItems||[]).filter(x=>x!==url);S.restore(el);bar.remove();addFlagButton(el)}))};
   bar.append(undo);document.documentElement.append(bar);setTimeout(()=>bar.remove(),7000);
 }

 function render(el,reasons){
   const key=S.bind(el,'TikTok');if(!key||el.dataset.feedshieldProcessed==="1")return;
   el.dataset.feedshieldProcessed="1";
   const text=S.pageText(el),adv=publisherId(el,text),cats=categories(text);
   const meta={publisherId:adv,publisherName:publisherName(el),advertiser:null,categories:uniq(cats),reasons:uniq(reasons)};

   if(!settings.showPlaceholder){S.hide(el,key,{replace:false,reason:reasons.join(' · ')});return}

   const ph=document.createElement("div");ph.className="feedshield-placeholder";
   const title=document.createElement("strong");title.textContent="Replaced by FeedShield";
   const info=document.createElement("div");info.className="feedshield-meta";info.textContent=`${meta.reasons.join(" · ")} · ${meta.publisherName} (${adv})`;
   ph.append(title,info);

   const actions=document.createElement("div");actions.className="feedshield-actions";
   const ba=document.createElement("button");ba.textContent="Block publishing account";
   const bc=document.createElement("button");bc.textContent="Block category";
   const br=document.createElement("button");br.textContent="Prepare platform report";
   const show=document.createElement("button");show.textContent="Reveal once";
   const allow=document.createElement("button");allow.textContent="Always allow";
   const mistake=document.createElement("button");mistake.textContent="Not a match";
   const toast=document.createElement("div");toast.className="feedshield-toast";

   ba.onclick=async()=>toast.textContent=(await addList("blockedAdvertisers",adv))?`Blocked ${adv}`:"Publishing account not identified";
   bc.onclick=async()=>{
     const c=meta.categories.find(x=>x!=="sponsored");
     if(!c){toast.textContent="No specific category detected";return}
     await addList("blockedCategories",c);toast.textContent=`Blocked category: ${c}`;
   };
   show.onclick=()=>{S.restore(el);el.dataset.feedshieldReveal=key;el.dataset.feedshieldProcessed="shown"};
   allow.onclick=async()=>{
     const saved=await addList("allowedAdvertisers",adv);
     if(!saved){toast.textContent="Creator or advertiser not identified — use Reveal once";return}
     S.restore(el);el.dataset.feedshieldReveal=key;el.dataset.feedshieldProcessed="shown";
   };
   mistake.onclick=async()=>{const correction={site:"TikTok",reason:"Incorrect automatic match",publisherId:adv,publisherName:publisherName(el),advertiser:null,url:itemUrl(el),detectedReasons:meta.reasons,flaggedAt:new Date().toISOString()};if(FeedShieldBrowser.activity)await FeedShieldBrowser.activity({report:correction});else FeedShieldBrowser.legacy.storage.local.get({manualFlags:[]},o=>{const flags=o.manualFlags||[];flags.unshift(correction);FeedShieldBrowser.legacy.storage.local.set({manualFlags:flags})});S.restore(el);el.dataset.feedshieldReveal=key;el.dataset.feedshieldProcessed="shown"};

   const rep=document.createElement("div");rep.className="feedshield-report";
   const ta=document.createElement("textarea");ta.readOnly=true;ta.value=note(meta);
   const cp=document.createElement("button");cp.textContent="Copy report note";
   cp.onclick=async()=>{try{await navigator.clipboard.writeText(ta.value);toast.textContent="Report note copied"}catch{ta.select();document.execCommand("copy");toast.textContent="Copied"}};
   rep.append(ta,cp);br.onclick=()=>rep.classList.toggle("open");

   show.className='feedshield-primary';actions.append(show,allow,mistake);const more=document.createElement('details');const summary=document.createElement('summary');summary.textContent='More options';more.append(summary,ba,bc,br);actions.append(more);
   ph.append(actions,rep,toast);
   S.hide(el,key,{replace:true,reason:reasons.join(' · '),node:ph});
 }

 function process(el){
   if(!S.bind(el,'TikTok')||el.dataset.feedshieldProcessed==="1"||el.dataset.feedshieldProcessing==="1")return;
   let reasons=textReasons(el,S.pageText(el));
   if(reasons.length)render(el,uniq(reasons));
 }

 function rescan(force=false){
   if(force)restoreSite();
   // Recycled cards can lose their identity or become ambiguous and disappear
   // from candidates. Restore those old bindings before selecting fresh cards.
   document.querySelectorAll('[data-feedshield-item-site="TikTok"]').forEach(el=>S.bind(el,'TikTok'));
   for(const el of candidates()){
     if(el.dataset.feedshieldProcessed==="shown"&&!force)continue;
     process(el);
   }
 }

 globalThis.FeedShieldProtectionSnapshot=()=>({ready,enabled:settings.protectionEnabled,siteEnabled:settings.tiktokEnabled,rules:{blockAI:settings.blockAI,blockSponsored:settings.blockSponsored},pageContext:/^\/@[^/]+\/?$/.test(location.pathname)?'profile':location.pathname.includes('/video/')?'post':'feed',savedRules:{hiddenItems:Array.isArray(settings.hiddenItems)?settings.hiddenItems.length:0,blockedAccounts:Array.isArray(settings.blockedAdvertisers)?settings.blockedAdvertisers.length:0},candidates:candidates().length,unboundMedia:[...document.querySelectorAll('video')].filter(v=>!candidates().some(c=>c.contains(v))).slice(0,4).map(v=>({readyState:v.readyState,networkState:v.networkState,paused:v.paused,errorCode:v.error?.code||null,width:Math.round(v.getBoundingClientRect().width),height:Math.round(v.getBoundingClientRect().height)})),cards:feedCards().map(el=>({identity:S.inspect(el,'TikTok'),publisher:publisherId(el),aiWordingMatch:aiLabeled(S.pageText(el)),sponsorshipWordingMatch:sponsored(S.pageText(el)),evidenceBasis:'page text only; not a verified platform label',reasons:textReasons(el,S.pageText(el)),processed:el.dataset.feedshieldProcessed||null,hidden:el.dataset.feedshieldHiddenBy==='FeedShield',...S.diagnostics(el)}))});
 FeedShieldBrowser.legacy.storage.local.get(defaults,c=>{settings={...defaults,...c,hiddenItems:Array.isArray(c.hiddenItems)?c.hiddenItems:[]};if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}ready=true;});
 FeedShieldBrowser.legacy.storage.onChanged.addListener((ch,a)=>{
   if(a!=="local")return;
   for(const[k,v]of Object.entries(ch))settings[k]=v.newValue;
   if(settings.protectionEnabled&&settings.tiktokEnabled){const relevant=['blockSponsored','blockDrama','blockSexualized','blockAI','showPlaceholder','customTerms','blockedAdvertisers','blockedCategories','allowedAdvertisers','hiddenItems','protectionEnabled','tiktokEnabled'].some(k=>Object.hasOwn(ch,k));rescan(relevant);attachFlagButtons()}else restoreSite();
 });

 const mo=new MutationObserver(()=>{
   clearTimeout(window.__fst);
   window.__fst=setTimeout(()=>{if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}},180)
 });
 mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true,attributeFilter:['href','id','data-e2e','hidden','aria-hidden']});
 setInterval(()=>{if(settings.protectionEnabled&&settings.tiktokEnabled){rescan();attachFlagButtons()}},3000);
})();
