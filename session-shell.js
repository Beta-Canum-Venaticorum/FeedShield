/* Keep each view mounted for this tab's lifetime; never persist reading content. */
(()=>{
 const frames=new Map(),views=document.getElementById('views');
 const routes={protection:['protection','settings.html','Protection and saved activity'],activity:['protection','settings.html','Protection and saved activity'],feed:['reading','unified-feed.html#feed','Your feed'],sources:['reading','unified-feed.html#live-feed','Your sources'],chippy:['chippy','companion.html','Chippy']};
 function route(){
  for(const [id,view]of frames)if(!view.hidden){if(id==='reading')view.contentWindow?.FeedShieldRememberReading?.();else view.savedScroll=view.contentWindow?.scrollY||0;}
  const name=location.hash.slice(1),[key,url,title]=routes[name]||routes.protection;
  let frame=frames.get(key);
  if(!frame){frame=document.createElement('iframe');frame.title=title;frame.src=url;frames.set(key,frame);views.append(frame);}
  for(const [id,view]of frames)view.hidden=id!==key;
  if(key==='reading'&&frame.contentWindow?.FeedShieldRouteReading)frame.contentWindow.FeedShieldRouteReading(name==='sources');
  else if(frame.contentWindow?.scrollTo)requestAnimationFrame(()=>frame.contentWindow.scrollTo(0,frame.savedScroll||0));
  if(key==='protection'&&name==='activity'){const show=()=>frame.contentDocument?.querySelector('.activity')?.scrollIntoView();if(frame.contentDocument?.readyState==='complete')show();else frame.addEventListener('load',show,{once:true});}
  for(const link of document.querySelectorAll('nav a')){if(link.hash==='#'+(name==='activity'?'protection':routes[name]?name:'protection'))link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  document.title=title+' · FeedShield';
 }
 addEventListener('hashchange',route);route();
})();
