(()=>{
 const siteMap={
  "www.instagram.com":["Instagram","instagramEnabled","article"],
  "www.facebook.com":["Facebook","facebookEnabled",'div[role="article"]'],
  "www.youtube.com":["YouTube","youtubeEnabled","ytd-rich-item-renderer,ytd-video-renderer,ytd-reel-item-renderer,ytd-reel-video-renderer"],
  "x.com":["X","xEnabled",'article[data-testid="tweet"]'],"twitter.com":["X","xEnabled",'article[data-testid="tweet"]'],
  "www.reddit.com":["Reddit","redditEnabled","shreddit-post,article"],
  "www.pinterest.com":["Pinterest","pinterestEnabled",'[data-test-id="pin"]'],
  "bsky.app":["Bluesky","blueskyEnabled",'main a[href*="/post/"]']
 };
 const cfg=siteMap[location.hostname];if(!cfg)return;const[site,key,selector]=cfg;
 let settings={protectionEnabled:true,[key]:true,manualFlags:[],hiddenItems:[],customTerms:""};
 const norm=s=>(s||"").toLowerCase().replace(/\s+/g," ").trim();
 const custom=()=>settings.customTerms.split(/\n|,/).map(norm).filter(Boolean);
 function cards(){if(site==="Bluesky"){const s=new Set();document.querySelectorAll(selector).forEach(a=>{const c=a.closest('div[data-testid],article')||a.parentElement?.parentElement;if(c)s.add(c)});return[...s]}return[...document.querySelectorAll(selector)]}
 function itemUrl(card){const patterns={Instagram:'a[href*="/p/"],a[href*="/reel/"]',Facebook:'a[href*="/posts/"],a[href*="/videos/"]',YouTube:'a[href*="/watch"],a[href*="/shorts/"]',X:'a[href*="/status/"]',Reddit:'a[href*="/comments/"]',Pinterest:'a[href*="/pin/"]',Bluesky:'a[href*="/post/"]'};return card.querySelector(patterns[site]||'a[href]')?.href||""}
 function persistFlag(meta){return new Promise(r=>chrome.storage.local.get({manualFlags:[],hiddenItems:[]},o=>{const flags=Array.isArray(o.manualFlags)?o.manualFlags:[],hidden=Array.isArray(o.hiddenItems)?o.hiddenItems:[];flags.unshift(meta);if(meta.url&&!hidden.includes(meta.url))hidden.unshift(meta.url);chrome.storage.local.set({manualFlags:flags.slice(0,200),hiddenItems:hidden.slice(0,500)},r)}))}
 function hide(card,url){card.classList.add("feedshield-hidden");const old=document.querySelector(".feedshield-undo");if(old)old.remove();const bar=document.createElement("div");bar.className="feedshield-undo";bar.textContent="Hidden and saved ";const b=document.createElement("button");b.textContent="Undo";b.onclick=()=>chrome.storage.local.get({hiddenItems:[]},o=>{const hidden=(o.hiddenItems||[]).filter(x=>x!==url);chrome.storage.local.set({hiddenItems:hidden},()=>{settings.hiddenItems=hidden;card.classList.remove("feedshield-hidden");bar.remove()})});bar.append(b);document.documentElement.append(bar);setTimeout(()=>bar.remove(),7000)}
 function add(card){
  if(card.dataset.feedshieldGeneric==="1"||norm(card.innerText).length<2)return;
  const url=itemUrl(card);if((url&&(settings.hiddenItems||[]).includes(url))||custom().some(x=>norm(card.innerText).includes(x))){card.classList.add("feedshield-hidden");return}
  card.dataset.feedshieldGeneric="1";card.classList.add("feedshield-flag-host");const wrap=document.createElement("div");wrap.className="feedshield-etsy-controls";const trigger=document.createElement("button");trigger.textContent="Tell FeedShield";
  trigger.onclick=e=>{e.preventDefault();e.stopPropagation();const old=wrap.querySelector(".feedshield-etsy-menu");if(old){old.remove();return}const menu=document.createElement("div");menu.className="feedshield-etsy-menu";
   ["Sexualized or coercive","Graphic, frightening or self-harm","Animal harm","Hate or targeted harassment","AI-generated image or video","AI-generated music or voice","Scam or impersonation","Breaking news or conflict footage","Old news presented as current","Propaganda or misleading claims","Promotional content","Something else"].forEach(reason=>{const b=document.createElement("button");b.textContent=reason;b.onclick=async ev=>{ev.preventDefault();ev.stopPropagation();const meta={site,reason,url:itemUrl(card),textExcerpt:(card.innerText||"").trim().slice(0,240),flaggedAt:new Date().toISOString()};await persistFlag(meta);menu.remove();hide(card,meta.url)};menu.append(b)});wrap.append(menu)
  };wrap.append(trigger);card.append(wrap)
 }
 function cleanup(){document.querySelectorAll(".feedshield-etsy-controls").forEach(x=>x.remove());document.querySelectorAll("[data-feedshield-generic]").forEach(x=>{delete x.dataset.feedshieldGeneric;x.classList.remove("feedshield-flag-host")})}
 function run(){if(!settings.protectionEnabled||!settings[key]){cleanup();return}cards().forEach(add)}
 chrome.storage.local.get(settings,c=>{settings=c;run()});chrome.storage.onChanged.addListener((ch,a)=>{if(a==="local"){for(const[k,v]of Object.entries(ch))settings[k]=v.newValue;run()}});new MutationObserver(()=>{clearTimeout(window.__fsg);window.__fsg=setTimeout(run,200)}).observe(document.documentElement,{childList:true,subtree:true});setInterval(run,3000)
})();
