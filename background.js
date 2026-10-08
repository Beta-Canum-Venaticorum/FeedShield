/* Chromium worker; Firefox loads dependencies as background scripts. */
if(typeof importScripts==='function')importScripts('settings-model.js','chippy-appearance.js','chippy-care.js','coordinator.js');
const extension=globalThis.browser||globalThis.chrome;
// Serialize simultaneous popup launches; remember only an owned tab ID.
let openTail=Promise.resolve();
async function openApp(route){
 const allowed=['protection','activity','feed','sources','chippy'];if(!allowed.includes(route))route='protection';
 const base=extension.runtime.getURL('app.html'),url=base+'#'+route;
 const saved=await extension.storage.local.get('feedshieldAppTab');let tab;
 if(Number.isInteger(saved.feedshieldAppTab)){try{const existing=await extension.tabs.get(saved.feedshieldAppTab);if(existing.url?.split('#')[0]===base)tab=existing;}catch{}}
 if(!tab){const tabs=await extension.tabs.query({});tab=tabs.find(t=>t.url?.split('#')[0]===base);}
 if(tab){await extension.tabs.update(tab.id,{url,active:true});await extension.windows.update(tab.windowId,{focused:true});}
 else tab=await extension.tabs.create({url});
 await extension.storage.local.set({feedshieldAppTab:tab.id});return {tabId:tab.id};
}
// Open the compact companion on the active supported page, without a new window.
async function openChippy(){
 const [tab]=await extension.tabs.query({active:true,lastFocusedWindow:true});
 if(tab?.id){try{const result=await extension.tabs.sendMessage(tab.id,{type:'chippy.show'});if(result?.shown)return {shown:true};}catch{}}
 await openApp('chippy');return {shown:false,workspace:true};
}
const coordinator=FeedShieldCoordinator.create({storage:extension.storage.local,eligible:async (sender,message)=>{
 const owned=sender.url?.startsWith(extension.runtime.getURL(''));const id=sender.tab?.id??(owned?message.tabId:null);
 if(!Number.isInteger(id))return false;
 const tabs=await extension.tabs.query({active:true,lastFocusedWindow:true});
 return tabs.some(tab=>tab.id===id);
}});
extension.runtime.onMessage.addListener((message,sender,reply)=>{
 if(sender.id===extension.runtime.id&&(message?.type==='chippy.open'||message?.type==='app.open'&&(sender.url?.startsWith(extension.runtime.getURL(''))||message.route==='chippy'))){
  const job=openTail.then(()=>message.type==='chippy.open'?openChippy():openApp(message.route));openTail=job.catch(()=>{});job.then(value=>reply({ok:true,value}),error=>reply({ok:false,error:error.message}));return true;
 }
 if(sender.id!==extension.runtime.id||!message?.type?.match(/^(activity\.change|settings\.patch|appearance\.patch|sources\.merge|chippy\.(claim|action))$/))return;
 const owned=sender.url?.startsWith(extension.runtime.getURL(''));
 if(!owned&&(['sources.merge','appearance.patch'].includes(message.type)||message.clear===true)){reply({ok:false,error:'Extension page required'});return;}
 coordinator.dispatch(message,sender).then(value=>reply({ok:true,value}),error=>reply({ok:false,error:error.message}));return true;
});
