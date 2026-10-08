/* Geometry only: never reads page text or media. */
(function(root){
 function choose({viewportWidth,viewportHeight,width,height,corner=0,blocked=[]}){
  const gap=12,w=Math.min(width,viewportWidth-2*gap),h=Math.min(height,viewportHeight-2*gap);
  if(w<=0||h<=0)return null;
  for(let offset=0;offset<4;offset++){const index=(corner+offset)%4,left=index%2?gap:viewportWidth-gap-w,top=index>=2?gap:viewportHeight-gap-h;
   const box={left,top,right:left+w,bottom:top+h,corner:index};
   if(!blocked.some(b=>b.right>box.left&&b.left<box.right&&b.bottom>box.top&&b.top<box.bottom))return box;
  }return null;
 }
 const api={choose};if(typeof module==='object'&&module.exports)module.exports=api;else root.FeedShieldChippyPlacement=api;
})(globalThis);
