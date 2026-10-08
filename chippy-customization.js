(() => {
  const KEY='feedshieldChippyAppearanceV1',api=FeedShieldChippyAppearance,$=id=>document.getElementById(id);
  let revision=0;let appearance=api.normalize(),writeTail=Promise.resolve(),ready=false;
  const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const reposition=()=>window.dispatchEvent(new Event('feedshield-appearance-change'));
  $('chippy-image')?.addEventListener('load',reposition);
  function render(){
    const reduced=motion?.matches===true||$('reduced-motion')?.checked;
    for(const id of ['chippy-image','chippy-preview']){
      const image=$(id),url=api.asset(appearance,reduced);if(!image)continue;
      if(image.getAttribute('src')!==url)image.setAttribute('src',url);
      globalThis.FeedShieldChippyRenderer?.paint(image,appearance,reduced);
      image.style.width=appearance.size+'px';image.style.transform=appearance.mirror?'scaleX(-1)':'none';
    }
    for(const id of ['chippy-name','chippy-preview-name']){const label=$(id);if(!label)continue;label.textContent=appearance.name;label.style.color=appearance.textColor;label.style.backgroundColor=appearance.backgroundColor;}
    if($('companion-face'))$('companion-face').style.width=appearance.size+'px';
  }
  function populate(){for(const [id,key] of [['chippy-nickname','name'],['chippy-cat','cat'],['chippy-text','textColor'],['chippy-background','backgroundColor'],['chippy-size','size'],['chippy-hat','hat'],['chippy-theme','theme'],['chippy-accent','accent']])$(id).value=String(appearance[key]);$('chippy-coat').value=appearance.coatColor||'#f79147';$('chippy-original-coat').checked=!appearance.coatColor;$('chippy-coat').disabled=!appearance.coatColor;$('chippy-mirror').checked=appearance.mirror;$('chippy-animate').checked=appearance.animate;render();}
  function update(event){
    if(!ready)return;
    appearance=api.normalize({name:$('chippy-nickname').value,cat:Number($('chippy-cat').value),textColor:$('chippy-text').value,backgroundColor:$('chippy-background').value,size:Number($('chippy-size').value),mirror:$('chippy-mirror').checked,animate:$('chippy-animate').checked,coatColor:$('chippy-original-coat').checked?null:$('chippy-coat').value,hat:$('chippy-hat').value,theme:$('chippy-theme').value,accent:$('chippy-accent').value});
    $('chippy-coat').disabled=!appearance.coatColor;render();reposition();const key={ 'chippy-nickname':'name','chippy-cat':'cat','chippy-text':'textColor','chippy-background':'backgroundColor','chippy-size':'size','chippy-mirror':'mirror','chippy-animate':'animate','chippy-coat':'coatColor','chippy-original-coat':'coatColor','chippy-hat':'hat','chippy-theme':'theme','chippy-accent':'accent'}[event?.target?.id];const snapshot=key?{[key]:appearance[key]}:{...appearance};
    $('appearance-status').textContent='Saving appearance…';
    writeTail=writeTail.catch(()=>{}).then(()=>(globalThis.FeedShieldSettings?FeedShieldSettings.request({type:'appearance.patch',patch:snapshot}):FeedShieldBrowser.storage.local.set({[KEY]:snapshot})));
    writeTail.then(()=>{$('appearance-status').textContent='Appearance saved on this device.'},error=>{$('appearance-status').textContent='Could not save appearance: '+error.message});
  }
  for(const id of ['chippy-nickname','chippy-cat','chippy-text','chippy-background','chippy-size','chippy-mirror','chippy-animate','chippy-coat','chippy-original-coat','chippy-hat','chippy-theme','chippy-accent'])$(id).addEventListener('change',update);
  window.addEventListener?.('pagehide',()=>{for(const id of ['chippy-image','chippy-preview'])if($(id))globalThis.FeedShieldChippyRenderer?.stop($(id));});
  $('reduced-motion')?.addEventListener('change',render);motion?.addEventListener?.('change',render);
  FeedShieldBrowser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[KEY]){revision++;appearance=api.normalize(changes[KEY].newValue);populate();}if(area==='local'&&changes.feedshieldCompanionPrototypeV1)render();});
  FeedShieldBrowser.storage.local.get(KEY).then(data=>{if(!revision)appearance=api.normalize(data[KEY]);ready=true;$('chippy-customization').disabled=false;populate();$('appearance-status').textContent='Appearance loaded. Changes save locally.';}).catch(error=>{$('appearance-status').textContent='Appearance unavailable: '+error.message});
})();
