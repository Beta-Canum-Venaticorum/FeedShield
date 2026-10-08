(()=>{
 const file=location.pathname.split('/').pop();
 const route=file==='companion.html'?'chippy':file==='settings.html'?'protection':location.hash==='#live-feed'?'sources':'feed';
 if(window===window.top){location.replace('app.html#'+route);return;}
 if(file!=='unified-feed.html')return;
 let previous=null,remembered=false;const positions={feed:0,sources:0};
 globalThis.FeedShieldRememberReading=()=>{if(previous)positions[previous]=scrollY;remembered=true;};
 globalThis.FeedShieldRouteReading=sources=>{
  const next=sources?'sources':'feed';
  if(previous&&!remembered)positions[previous]=scrollY;remembered=false;
  document.getElementById('live-feed').hidden=!sources;
  for(const selector of ['.controls','#count','#feed'])document.querySelector(selector).hidden=sources;
  document.body.dataset.readingView=next;document.querySelector('h1').textContent=sources?'RSS sources':'Article reader';previous=next;
  requestAnimationFrame(()=>scrollTo(0,positions[next]));
 };
 FeedShieldRouteReading(parent.location.hash==='#sources');
})();
