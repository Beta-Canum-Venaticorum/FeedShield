/* Current-tab status requires an installed content-script handshake. */
(function(root){
 const sites={'www.tiktok.com':'tiktok','www.etsy.com':'etsy','www.instagram.com':'instagram','www.facebook.com':'facebook','www.youtube.com':'youtube','x.com':'x','twitter.com':'x','www.reddit.com':'reddit','www.pinterest.com':'pinterest','bsky.app':'bluesky'};
 async function inspect(api,settings){
  const [tab]=await api.tabs.query({active:true,currentWindow:true});
  let url;try{url=new URL(tab?.url);}catch{return {state:'unsupported',text:'Current page unavailable or unsupported',tabId:tab?.id};}
  const site=url.protocol==='https:'?sites[url.hostname]:null,base={tabId:tab?.id,site,host:url.hostname};
  if(!site)return {...base,state:'unsupported',text:'This page is not supported'};
  if(!settings.protectionEnabled)return {...base,state:'off',text:'Website protection preference is off'};
  if(!settings[site+'Enabled'])return {...base,state:'site-off',text:'Protection paused for '+url.hostname};
  if(!await api.permissions.contains({origins:[url.origin+'/*']}))return {...base,state:'no-access',text:'Site access unavailable · allow this site in the browser extension menu'};
  try{
   const reply=await api.tabs.sendMessage(tab.id,{type:'protection.status'});
   if(api.runtime?.version&&reply?.version!==api.runtime.version)return {...base,state:'reload',text:'Extension updated · reload this page to connect the current version',diagnostics:reply};
   if(!reply?.connected||!reply.ready)return {...base,state:'failed',text:'Protection initialization failed or is still pending · reload this page',diagnostics:reply};
   if(reply.enabled!==true||reply.siteEnabled!==true)return {...base,state:'pending',text:'Settings are still applying · check again',diagnostics:reply};
   if((site==='tiktok'||site==='pinterest')&&Array.isArray(reply.cards)&&reply.cards.length===0)return {...base,state:'no-items',text:'Connected · no safely identified posts on this page',diagnostics:reply};
   return {...base,state:'active',text:'Protection active · content script connected on '+url.hostname,diagnostics:reply};
  }catch{return {...base,state:'reload',text:'Content script not connected · reload this page'};}
 }
 const api={inspect,sites};if(typeof module==='object'&&module.exports)module.exports=api;else root.FeedShieldCurrentSite=api;
})(globalThis);
