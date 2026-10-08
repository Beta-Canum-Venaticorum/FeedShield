/* Shared subscription guards late reads; writes carry only the edited field. */
(function(){
 const model=FeedShieldSettingsModel,api=FeedShieldBrowser;
 function request(message){return api.runtime.sendMessage(message).then(result=>{if(!result?.ok)throw Error(result?.error||'Coordinator unavailable');return result.value;});}
 function subscribe(fn){let live=true,revision=0,changedKeys=new Set(),current=model.normalize();const changed=(changes,area)=>{if(area!=='local')return;revision++;for(const [key,c]of Object.entries(changes)){changedKeys.add(key);current[key]=c.newValue;}current=model.normalize(current);if(live)fn(current);};api.storage.onChanged.addListener(changed);const start=revision;api.storage.local.get(null).then(data=>{if(!live)return;const merged={...data};if(revision!==start)for(const key of changedKeys)merged[key]=current[key];current=model.normalize(merged);fn(current);}).catch(error=>console.error(error));return()=>{live=false;api.storage.onChanged.removeListener(changed);};}
 globalThis.FeedShieldSettings={request,subscribe,patch:patch=>request({type:'settings.patch',patch:model.patch(patch)})};
})();
