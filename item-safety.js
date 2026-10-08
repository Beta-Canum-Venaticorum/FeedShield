(() => {
  const hosts={
    TikTok:new Set(['tiktok.com','www.tiktok.com']),Etsy:new Set(['etsy.com','www.etsy.com']),
    Instagram:new Set(['instagram.com','www.instagram.com']),Facebook:new Set(['facebook.com','www.facebook.com']),
    YouTube:new Set(['youtube.com','www.youtube.com','youtu.be']),X:new Set(['x.com','www.x.com','twitter.com','www.twitter.com']),
    Reddit:new Set(['reddit.com','www.reddit.com']),Pinterest:new Set(['pinterest.com','www.pinterest.com']),Bluesky:new Set(['bsky.app'])
  };
  const nestedSelectors={TikTok:['article','[role="listitem"]','section[data-e2e="feed-video"]'],Etsy:['li','article','[data-listing-id]'],Instagram:['article'],Facebook:['[role="article"]'],YouTube:['ytd-rich-item-renderer','ytd-video-renderer','ytd-reel-item-renderer','ytd-reel-video-renderer'],X:['article'],Reddit:['shreddit-post','article'],Pinterest:['[data-test-id="pin"]'],Bluesky:['article','[data-testid]']};
  let nextToken=1;
  const ownToken=card=>card.dataset.feedshieldOwner||(card.dataset.feedshieldOwner=`fs-${nextToken++}`);
  function canonical(raw,site){
    try{
      const u=new URL(raw,location.href),host=u.hostname.toLowerCase();
      if(u.protocol!=="https:"||!hosts[site]?.has(host)||u.username||u.password)return"";
      let m,path=u.pathname;
      if(site==='TikTok'&&(m=path.match(/^\/@([^/]+)\/video\/(\d+)(?:\/|$)/)))return`https://www.tiktok.com/@${m[1]}/video/${m[2]}`;
      if(site==='Etsy'&&(m=path.match(/^\/listing\/(\d+)(?:\/|$)/)))return`https://www.etsy.com/listing/${m[1]}`;
      if(site==='Instagram'&&(m=path.match(/^\/(p|reel)\/([A-Za-z0-9_-]+)(?:\/|$)/)))return`https://www.instagram.com/${m[1]}/${m[2]}`;
      if(site==='Facebook'&&(m=path.match(/^\/(?:[^/]+\/posts|videos|reel)\/(\d+)(?:\/|$)/)))return`https://www.facebook.com${m[0].replace(/\/$/,'')}`;
      if(site==='YouTube'){
        if(host==='youtu.be'&&(m=path.match(/^\/([A-Za-z0-9_-]{6,})(?:\/|$)/)))return`https://www.youtube.com/watch?v=${m[1]}`;
        if((m=path.match(/^\/shorts\/([A-Za-z0-9_-]{6,})(?:\/|$)/)))return`https://www.youtube.com/shorts/${m[1]}`;
        const id=u.searchParams?.get('v')||String(raw).match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1];if(path==='/watch'&&id)return`https://www.youtube.com/watch?v=${id}`;
      }
      if(site==='X'&&(m=path.match(/^\/([^/]+)\/status\/(\d+)(?:\/|$)/)))return`https://x.com/${m[1]}/status/${m[2]}`;
      if(site==='Reddit'&&(m=path.match(/^\/r\/([^/]+)\/comments\/([A-Za-z0-9]+)(?:\/|$)/)))return`https://www.reddit.com/r/${m[1]}/comments/${m[2]}`;
      if(site==='Pinterest'&&(m=path.match(/^\/pin\/(\d+)\/?$/)))return`https://www.pinterest.com/pin/${m[1]}`;
      if(site==='Bluesky'&&(m=path.match(/^\/profile\/([^/]+)\/post\/([^/]+)(?:\/|$)/)))return`https://bsky.app/profile/${m[1]}/post/${m[2]}`;
    }catch{}
    return"";
  }
  // Observed For You layout: the video ID lives on the player wrapper, while
  // the publisher is in the dedicated creator header. Neither alone suffices.
  // No first-profile fallback, page URL fallback, or hidden application state.
  function tiktokMediaIdentity(card){
    if(card.tagName!=='SECTION'||card.getAttribute('data-e2e')!=='feed-video'||!/^media-card-\d+$/.test(card.id))return '';
    if(card.querySelectorAll('section[data-e2e="feed-video"]').length||card.querySelectorAll('video').length!==1)return '';
    const wrappers=[...card.querySelectorAll('[id]')].filter(el=>/^xgwrapper-\d+-\d{15,25}$/.test(el.id)&&el.querySelector('video'));
    const headers=[...card.querySelectorAll('[class*="DivCreatorInfoContainer"]')];
    if(wrappers.length!==1||headers.length!==1)return '';
    const publishers=new Set();
    for(const a of headers[0].querySelectorAll('a[href]')){try{
      const u=new URL(a.href,location.href),m=u.pathname.match(/^\/@([a-zA-Z0-9_.]{1,24})\/?$/);
      if(u.protocol!=='https:'||!hosts.TikTok.has(u.hostname)||u.username||u.password||u.search||u.hash||!m)return '';
      publishers.add(m[1]);
    }catch{return '';}}
    if(publishers.size!==1)return '';
    const id=wrappers[0].id.split('-').pop();return canonical(`https://www.tiktok.com/@${[...publishers][0]}/video/${id}`,'TikTok');
  }
  function identities(card,site){
    const values=new Set();
    if(card.tagName==='A'){const key=canonical(card.href,site);if(key)values.add(key)}
    for(const link of card.querySelectorAll('a[href]')){const key=canonical(link.href,site);if(key)values.add(key)}
    if(site==='TikTok'){const key=tiktokMediaIdentity(card);if(key)values.add(key);}
    return[...values];
  }
  function inspect(card,site){
    if(!card)return{safe:false,key:"",reason:'missing-container'};
    if(['HTML','BODY','MAIN'].includes(card.tagName)||['main','feed'].includes(card.getAttribute?.('role')))return{safe:false,key:"",reason:'broad-root'};
    const ids=identities(card,site);if(ids.length!==1)return{safe:false,key:"",reason:ids.length?'multiple-identities':'missing-identity'};
    for(const selector of nestedSelectors[site]||[]){
      for(const nested of card.querySelectorAll(selector))if(nested!==card&&identities(nested,site).length)return{safe:false,key:"",reason:'nested-item'};
    }
    return{safe:true,key:ids[0],reason:""};
  }
  // Read page evidence without our controls, form values, or hidden metadata.
  // Keep reading our own hidden card so diagnostics remain reproducible.
  const evidence=new WeakMap();
  function pageText(card){
    if(card.dataset.feedshieldHiddenBy==='FeedShield'&&evidence.has(card))return evidence.get(card);
    const parts=[];
    function visit(node){
      if(node.nodeType===3){parts.push(node.textContent);return;}
      if(node.nodeType!==1)return;
      if(node.matches('script,style,template,noscript,input,textarea,select,[hidden],[aria-hidden="true"],.feedshield-flag-button,.feedshield-flag-panel,.feedshield-etsy-controls,.feedshield-placeholder,.feedshield-undo'))return;
      const style=globalThis.getComputedStyle?.(node);
      if(style?.visibility==='hidden'||style?.visibility==='collapse'||(style?.display==='none'&&!(node===card&&node.dataset.feedshieldHiddenBy==='FeedShield')))return;
      for(const child of node.childNodes)visit(child);
    }
    visit(card);return parts.join(' ').replace(/\s+/g,' ').trim();
  }
  // Controls live outside site-owned cards: never become a grid/flex child or
  // change the containing block of native media. Keep ownership for cleanup.
  const overlays=new Map();let frame=0;
  function controls(card){return overlays.get(card)?.host;}
  function syncControls(){
    frame=0;
    for(const [card,entry]of overlays){
      if(!card.isConnected||card.dataset.feedshieldItemKey!==entry.key){restore(card);continue;}
      const r=card.getBoundingClientRect(),style=getComputedStyle(card);
      const masked=card.classList.contains('feedshield-masked');
      const hidden=(card.dataset.feedshieldHiddenBy==='FeedShield'&&!masked)||r.width<30||r.height<30||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth||(style.visibility==='hidden'&&!masked)||style.display==='none';
      entry.host.hidden=hidden;
      entry.host.style.left=Math.max(0,Math.min(r.left,innerWidth-160))+'px';
      entry.host.style.top=Math.max(0,r.top)+'px';
      entry.host.style.width=Math.min(Math.max(160,r.width),innerWidth-24)+'px';
      if(entry.replacement){
        const left=Math.max(0,r.left),top=Math.max(0,r.top),width=Math.max(0,Math.min(innerWidth,r.right)-left),height=Math.max(0,Math.min(innerHeight,r.bottom)-top);
        entry.host.style.left=left+'px';entry.host.style.top=top+'px';entry.host.style.width=width+'px';entry.host.style.setProperty('height',height+'px','important');
      }
    }
  }
  function scheduleControls(){if(!frame)frame=requestAnimationFrame(syncControls);}
  function mountControls(card,node,key){
    let entry=overlays.get(card);
    if(!entry){const host=document.createElement('div');host.className='feedshield-floating-controls';host.dataset.feedshieldOwnerRef=ownToken(card);host.dataset.feedshieldItemKey=key;document.documentElement.append(host);entry={host,key};overlays.set(card,entry);}
    entry.host.append(node);syncControls();return entry.host;
  }
  addEventListener('scroll',scheduleControls,true);addEventListener('resize',scheduleControls);
  setInterval(syncControls,500);
  function diagnostics(card){
    const r=card.getBoundingClientRect(),style=getComputedStyle(card),host=controls(card);
    const ancestors=[];for(let node=card.parentElement;node&&ancestors.length<3;node=node.parentElement){const css=getComputedStyle(node);if(css.display==='none'||css.visibility==='hidden'||node.classList.contains('feedshield-hidden')||node.classList.contains('feedshield-masked'))ancestors.push({tag:node.tagName,display:css.display,visibility:css.visibility,feedshieldOwned:node.dataset.feedshieldHiddenBy==='FeedShield',legacyHiddenClass:node.classList.contains('feedshield-hidden')});}return {hiddenAncestors:ancestors,presentation:card.dataset.feedshieldPresentation||'none',filterReason:card.dataset.feedshieldReason||null,layout:{position:style.position,display:style.display,visibility:style.visibility,width:Math.round(r.width),height:Math.round(r.height),inViewport:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth},controls:{mounted:!!host,visible:!!host&&!host.hidden},media:[...card.querySelectorAll('video,img')].slice(0,4).map(el=>{const b=el.getBoundingClientRect();return {kind:el.tagName.toLowerCase(),width:Math.round(b.width),height:Math.round(b.height),...(el.tagName==='VIDEO'?{readyState:el.readyState,networkState:el.networkState,paused:el.paused,errorCode:el.error?.code||null}:{complete:el.complete,naturalWidth:el.naturalWidth})};})};
  }
  function removeOwnedUi(card){
    overlays.get(card)?.host.remove();overlays.delete(card);
    const token=card.dataset.feedshieldOwner;
    card.querySelectorAll('.feedshield-flag-button,.feedshield-flag-panel,.feedshield-etsy-controls').forEach(node=>node.remove());
    if(token)document.querySelectorAll('[data-feedshield-owner-ref]').forEach(node=>{if(node.dataset.feedshieldOwnerRef===token)node.remove()});
  }
  function restore(card){
    if(card.dataset.feedshieldHiddenBy==='FeedShield'&&card.dataset.feedshieldHadHiddenClass!=='1')card.classList.remove('feedshield-hidden');
    evidence.delete(card);card.classList.remove('feedshield-masked');delete card.dataset.feedshieldPresentation;delete card.dataset.feedshieldReason;delete card.dataset.feedshieldReveal;delete card.dataset.feedshieldHiddenBy;delete card.dataset.feedshieldHadHiddenClass;delete card.dataset.feedshieldProcessed;delete card.dataset.feedshieldProcessing;
    delete card.dataset.feedshieldFlagButton;delete card.dataset.feedshieldGeneric;delete card.dataset.feedshieldEtsy;
    card.classList.remove('feedshield-flag-host');removeOwnedUi(card);
  }
  function bind(card,site){
    const result=inspect(card,site),previous=card.dataset.feedshieldItemKey;
    if(previous!==undefined&&previous!==result.key)restore(card);
    if(!result.safe){restore(card);delete card.dataset.feedshieldItemKey;delete card.dataset.feedshieldItemSite;return null}
    card.dataset.feedshieldItemKey=result.key;card.dataset.feedshieldItemSite=site;ownToken(card);return result.key;
  }
  function current(card,site,key){return card?.isConnected&&inspect(card,site).safe&&inspect(card,site).key===key&&card.dataset.feedshieldItemKey===key}
  function hide(card,key,options={}){
    const site=card.dataset.feedshieldItemSite;
    if(!current(card,site,key)||card.dataset.feedshieldReveal===key)return false;
    const replace=options.replace!==false,mode=replace?'replace':'block';
    if(card.dataset.feedshieldHiddenBy==='FeedShield'&&card.dataset.feedshieldPresentation===mode)return true;
    const text=pageText(card);removeOwnedUi(card);evidence.set(card,text);
    delete card.dataset.feedshieldFlagButton;delete card.dataset.feedshieldGeneric;delete card.dataset.feedshieldEtsy;
    card.classList.remove('feedshield-hidden','feedshield-masked');
    card.dataset.feedshieldHiddenBy='FeedShield';card.dataset.feedshieldPresentation=mode;card.dataset.feedshieldReason=options.reason||'Saved hidden item';
    for(const video of card.querySelectorAll('video')){try{video.pause();}catch{}}
    if(!replace){card.classList.add('feedshield-hidden');return true;}
    card.classList.add('feedshield-masked');
    const message=options.node||document.createElement('section');message.classList.add('feedshield-replacement');
    if(!options.node){
      const title=document.createElement('strong');title.textContent='Replaced by FeedShield';
      const reason=document.createElement('p');reason.textContent=card.dataset.feedshieldReason;
      const reveal=document.createElement('button');reveal.type='button';reveal.className='feedshield-primary';reveal.textContent='Reveal';reveal.onclick=()=>{if(!current(card,site,key))return;restore(card);card.dataset.feedshieldReveal=key;card.dataset.feedshieldProcessed='shown';};
      message.append(title,reason,reveal);
    }
    const inner=document.createElement('div');inner.className='feedshield-replacement-card';while(message.firstChild)inner.append(message.firstChild);message.append(inner);const host=mountControls(card,message,key);host.classList.add('feedshield-replacement-host');overlays.get(card).replacement=true;syncControls();return true;
  }
  function savedMatch(values,key,site){return Array.isArray(values)&&values.some(value=>typeof value==='string'&&(()=>{const saved=canonical(value,site);return !!saved&&(saved===key||(site==='TikTok'&&saved.split('/').pop()===key.split('/').pop()));})());}
  function placeholder(card,node,key){if(card.dataset.feedshieldItemKey!==key)return false;node.dataset.feedshieldOwnerRef=ownToken(card);node.dataset.feedshieldItemKey=key;card.before(node);return true}
  function restoreAll(){document.querySelectorAll('[data-feedshield-owner],[data-feedshield-hidden-by]').forEach(restore);document.querySelectorAll('.feedshield-undo').forEach(node=>node.remove())}
  globalThis.FeedShieldItemSafety=Object.freeze({savedMatch,canonical,identities,inspect,bind,current,hide,placeholder,restore,restoreAll,removeOwnedUi,pageText,mountControls,controls,diagnostics});
})();
