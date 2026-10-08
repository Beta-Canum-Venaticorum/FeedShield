/* Local atlas renderer. Original images remain the fallback if canvas or an asset fails. */
(function(root){
 const active=new WeakMap();
 function stop(image){const old=active.get(image);if(!old)return;old.disposed=true;clearTimeout(old.timer);old.canvas.remove();image.style.display='';active.delete(image);}
 function paint(image,value,reduced,url=p=>p){
  const api=root.FeedShieldChippyAppearance,v=api.normalize(value);stop(image);if(!v.coatColor)return;
  const id=api.catId(v),meta=root.FeedShieldChippyFrames[String(id)],canvas=document.createElement('canvas'),atlas=document.createElement('canvas'),state={canvas,disposed:false,timer:null};
  active.set(image,state);canvas.width=320;canvas.height=350;canvas.setAttribute('aria-hidden','true');canvas.style.cssText=`width:${v.size}px;max-width:40vw;max-height:25dvh;object-fit:contain;image-rendering:pixelated;transform:${v.mirror?'scaleX(-1)':'none'}`;
  const source=new Image();source.crossOrigin='anonymous';let frame=0;
  function draw(){if(state.disposed)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,320,350);ctx.imageSmoothingEnabled=false;ctx.drawImage(atlas,frame%6*meta.width,Math.floor(frame/6)*meta.height,meta.width,meta.height,0,350-meta.height,meta.width,meta.height);if(v.animate&&!reduced)state.timer=setTimeout(()=>{frame=(frame+1)%meta.delays.length;draw();},meta.delays[frame]);}
  source.onload=()=>{if(state.disposed)return;try{atlas.width=source.width;atlas.height=source.height;const ctx=atlas.getContext('2d');ctx.drawImage(source,0,0);const pixels=ctx.getImageData(0,0,atlas.width,atlas.height);api.recolor(pixels.data,v.coatColor,id);ctx.putImageData(pixels,0,0);draw();image.parentNode.append(canvas);image.style.display='none';image.dispatchEvent(new Event('load'));}catch{stop(image);}};
  source.onerror=()=>{if(!state.disposed)stop(image);};source.src=url(`assets/chippy/${id}-atlas.png`);
 }
 root.FeedShieldChippyRenderer={paint,stop};
})(globalThis);
