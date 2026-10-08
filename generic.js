(()=>{
 const siteMap={
  "www.instagram.com":["Instagram","instagramEnabled","article"],
  "www.facebook.com":["Facebook","facebookEnabled",'[role="article"]'],
  "www.youtube.com":["YouTube","youtubeEnabled","ytd-rich-item-renderer,ytd-video-renderer,ytd-reel-item-renderer,ytd-reel-video-renderer"],
  "x.com":["X","xEnabled",'article[data-testid="tweet"]'],"twitter.com":["X","xEnabled",'article[data-testid="tweet"]'],
  "www.reddit.com":["Reddit","redditEnabled","shreddit-post,article"],
  "www.pinterest.com":["Pinterest","pinterestEnabled",'[data-test-id="pin"]'],
  "bsky.app":["Bluesky","blueskyEnabled",'main a[href*="/post/"]']
 };
 const cfg=siteMap[location.hostname];if(!cfg)return;const[site,key,selector]=cfg,S=FeedShieldItemSafety;
 let settings={showPlaceholder:true,protectionEnabled:true,[key]:true,manualFlags:[],hiddenItems:[],customTerms:""};
 const norm=s=>(typeof s==='string'?s:"").toLowerCase().replace(/\s+/g," ").trim();
 const custom=()=>String(settings.customTerms||"").split(/\n|,/).map(norm).filter(Boolean);
 function cards(){if(site==="Bluesky"){const s=new Set();document.querySelectorAll(selector).forEach(a=>{const c=a.closest('div[data-testid],article');if(c)s.add(c)});return[...s]}return[...document.querySelectorAll(selector)]}
 // Pinterest cards can contain only an image. Read local card text and the
 // alternative text of images linked to this exact pin, excluding our own UI.
 function pinText(card,url){
  const parts=[];
  function visit(node){
   if(node.nodeType===3){parts.push(node.textContent);return}
   if(node.nodeType!==1||node.matches('script,style,template,[hidden],[aria-hidden="true"],.feedshield-etsy-controls'))return;
   if(node.tagName==='IMG'&&S.canonical(node.closest('a[href]')?.href,site)===url)parts.push(node.getAttribute('alt')||'');
   for(const child of node.childNodes)visit(child);
  }
  visit(card);return parts.join(' ').replace(/\s+/g,' ').trim();
 }
 function persistFlag(meta){if(FeedShieldBrowser.activity)return FeedShieldBrowser.activity({report:meta,operations:meta.url?[{key:"hiddenItems",value:meta.url}]:[]});return new Promise(r=>FeedShieldBrowser.legacy.storage.local.get({manualFlags:[],hiddenItems:[]},o=>{const flags=Array.isArray(o.manualFlags)?o.manualFlags:[],hidden=Array.isArray(o.hiddenItems)?o.hiddenItems:[];flags.unshift(meta);if(meta.url&&!hidden.includes(meta.url))hidden.unshift(meta.url);FeedShieldBrowser.legacy.storage.local.set({manualFlags:flags,hiddenItems:hidden},r)}))}
 function hide(card,url){
  if(!S.current(card,site,url)||!settings.protectionEnabled||!settings[key])return;
  S.hide(card,url,{replace:settings.showPlaceholder,reason:'You chose to hide this item'});const old=document.querySelector(".feedshield-undo");if(old)old.remove();const bar=document.createElement("div");bar.className="feedshield-undo";bar.dataset.feedshieldOwnerRef=card.dataset.feedshieldOwner;bar.textContent="Hidden and saved ";const b=document.createElement("button");b.textContent="Undo";b.onclick=()=>FeedShieldBrowser.activity?FeedShieldBrowser.activity({operations:[{key:"hiddenItems",value:url,remove:true}]}).then(update=>{Object.assign(settings,update);if(S.current(card,site,url)){S.restore(card);add(card);}bar.remove();}).catch(FeedShieldBrowser.report):FeedShieldBrowser.legacy.storage.local.get({hiddenItems:[]},o=>{const hidden=(o.hiddenItems||[]).filter(x=>x!==url);FeedShieldBrowser.legacy.storage.local.set({hiddenItems:hidden},()=>{settings.hiddenItems=hidden;if(S.current(card,site,url))S.restore(card);bar.remove();add(card)})});bar.append(b);document.documentElement.append(bar);setTimeout(()=>bar.remove(),7000)
 }
 function add(card){
  const url=S.bind(card,site);if(!url)return;
  const text=site==='Pinterest'?pinText(card,url):S.pageText(card);
  
  if(card.dataset.feedshieldReveal!==url&&(S.savedMatch(settings.hiddenItems,url,site)||custom().some(x=>norm(text).includes(x)))){S.hide(card,url,{replace:settings.showPlaceholder,reason:S.savedMatch(settings.hiddenItems,url,site)?'You chose to hide this item':'Matched a muted word'});return}
  if(card.dataset.feedshieldHiddenBy==='FeedShield')S.restore(card);
  if(card.dataset.feedshieldGeneric==="1")return;
  card.dataset.feedshieldGeneric="1";const wrap=document.createElement("div");wrap.className="feedshield-etsy-controls";const trigger=document.createElement("button");trigger.textContent="Tell FeedShield";
  trigger.onclick=e=>{e.preventDefault();e.stopPropagation();if(!S.current(card,site,url))return;const old=wrap.querySelector(".feedshield-etsy-menu");if(old){old.remove();return}const menu=document.createElement("div");menu.className="feedshield-etsy-menu";
   ["Sexualized or coercive","Graphic, frightening or self-harm","Animal harm","Hate or targeted harassment","AI-generated image or video","AI-generated music or voice","Scam or impersonation","Breaking news or conflict footage","Old news presented as current","Propaganda or misleading claims","Promotional content","Something else"].forEach(reason=>{const b=document.createElement("button");b.textContent=reason;b.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();if(!S.current(card,site,url))return;const meta={site,reason,url,textExcerpt:(site==='Pinterest'?pinText(card,url):S.pageText(card)).trim().slice(0,240),flaggedAt:new Date().toISOString()};await persistFlag(meta);if(!S.current(card,site,url)||!settings.protectionEnabled||!settings[key])return;menu.remove();hide(card,url)};menu.append(b)});wrap.append(menu)
  };wrap.append(trigger);S.mountControls(card,wrap,url)
 }
 let ready=false;globalThis.FeedShieldProtectionSnapshot=()=>({ready,enabled:settings.protectionEnabled,siteEnabled:settings[key],...(site==='Pinterest'?{detectedContainers:cards().length,rejected:cards().filter(card=>!S.inspect(card,site).safe).slice(0,10).map(card=>({reason:S.inspect(card,site).reason,...S.diagnostics(card)})),cards:cards().filter(card=>S.inspect(card,site).safe).map(card=>({key:S.inspect(card,site).key,hidden:card.dataset.feedshieldHiddenBy==='FeedShield',...S.diagnostics(card)}))}:{})});
 function cleanup(){document.querySelectorAll(`[data-feedshield-item-site="${site}"]`).forEach(S.restore)}
 function run(reevaluate=false){if(!settings.protectionEnabled||!settings[key]){cleanup();return}if(reevaluate)cleanup();const candidates=cards();
  document.querySelectorAll(`[data-feedshield-item-site="${site}"]`).forEach(card=>{if(!candidates.includes(card)){S.restore(card);delete card.dataset.feedshieldItemKey;delete card.dataset.feedshieldItemSite;}});
  candidates.forEach(add)}
 FeedShieldBrowser.legacy.storage.local.get(settings,c=>{settings={...settings,...c};run();ready=true;});FeedShieldBrowser.legacy.storage.onChanged.addListener((ch,a)=>{if(a==="local"){for(const[k,v]of Object.entries(ch))settings[k]=v.newValue;run(['protectionEnabled',key,'showPlaceholder','hiddenItems','customTerms'].some(k=>Object.hasOwn(ch,k)))}});new MutationObserver(()=>{clearTimeout(window.__fsg);window.__fsg=setTimeout(()=>run(),200)}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,characterData:true,attributeFilter:['href','alt','data-test-id','hidden','aria-hidden']});setInterval(()=>run(),3000)
})();
