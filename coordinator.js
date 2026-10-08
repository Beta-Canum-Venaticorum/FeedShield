/* One serialized writer, persistent deadlines, no network or browsing history. */
(function(root){
 const model=typeof module==='object'&&module.exports?require('./settings-model.js'):root.FeedShieldSettingsModel;
 const appearance=typeof module==='object'&&module.exports?require('./chippy-appearance.js'):root.FeedShieldChippyAppearance;
 const hydration=['A sip of water, human?','Your water is waiting. A little sip?','Tiny paws, big reminder: water break?'];
 const sass=['Tiny break? I have cleared a very important slot in my nap schedule.','I have inspected this corner. Excellent corner.','My schedule today: nap, stretch, supervise.'];
 const care=typeof module==='object'&&module.exports?require('./chippy-care.js'):root.FeedShieldChippyCare;
 const STATE='feedshieldChippyScheduleV1',SOURCES='experimentalFeedSourcesV1';
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function mergeSources(current,base,next){
  for(const v of [current,base,next])if(v&&(v.version!==1||!Array.isArray(v.sources)))throw Error('Unsupported source storage version');
  const records=new Map((current?.sources||[]).map(s=>[s.id,{...s}])),before=new Map((base?.sources||[]).map(s=>[s.id,s])),after=new Map((next?.sources||[]).map(s=>[s.id,s]));
  for(const id of before.keys())if(!after.has(id))records.delete(id);
  for(const [id,s]of after){const old=before.get(id),latest=records.get(id);if(!old){if(!latest)records.set(id,s);}else if(latest){for(const k of Object.keys(s))if(!equal(s[k],old[k]))latest[k]=s[k];}}
  if(records.size>30)throw Error('Source limit reached');return {version:1,revision:(Number.isSafeInteger(current?.revision)?current.revision:0)+1,sources:[...records.values()]};
 }
 function create({storage,now=Date.now,eligible=async()=>true}){
  let tail=Promise.resolve();
  function dispatch(message,sender={}){const job=tail.then(()=>handle(message,sender));tail=job.catch(()=>{});return job;}
  async function handle(m,sender){
   const data=await storage.get(null),settings=model.normalize(data),migration=model.migrate(data);
   if(Object.keys(migration).length)await storage.set(migration);
   if(m.type==='activity.change'){
    const keys=['manualFlags','hiddenItems','blockedAdvertisers','blockedCategories','allowedAdvertisers','blockedCreators','blockedEtsyShops'];const patch={};
    if(m.clear===true){for(const key of keys)patch[key]=[];}
    else{
     if(m.report&&typeof m.report==='object'&&!Array.isArray(m.report))patch.manualFlags=[m.report,...(Array.isArray(data.manualFlags)?data.manualFlags:[])];
     for(const operation of m.operations||[]){if(!keys.includes(operation.key)||operation.key==='manualFlags'||typeof operation.value!=='string')throw Error('Invalid activity operation');const list=patch[operation.key]||[...(Array.isArray(data[operation.key])?data[operation.key]:[])];const norm=v=>typeof v==='string'?v.toLowerCase().trim():v;const same=v=>operation.key==='hiddenItems'?v===operation.value:norm(v)===norm(operation.value);if(operation.remove)patch[operation.key]=list.filter(v=>!same(v));else{if(!list.some(same))list.unshift(operation.value);patch[operation.key]=list;}}
    }
    await storage.set(patch);return patch;
   }
   if(m.type==='settings.patch'){const patch=model.patch(m.patch);if(patch.chippyLiveEnabled===false)patch[STATE]=null;else if(patch.chippyFrequency&&data[STATE])patch[STATE]={...data[STATE],nextAt:now()+patch.chippyFrequency*60000};await storage.set(patch);return true;}
   if(m.type==='appearance.patch'){const value=appearance.normalize({...(data.feedshieldChippyAppearanceV1||{}),...m.patch});await storage.set({feedshieldChippyAppearanceV1:value});return true;}
   if(m.type==='sources.merge'){const current=data[SOURCES]?.version===0?{version:1,sources:(data[SOURCES].feeds||[]).map(s=>({...s,type:'rss',feedUrl:s.url,id:'rss:'+s.url}))}:data[SOURCES];const value=mergeSources(current,m.base,m.value);await storage.set({[SOURCES]:value});return value;}
   const t=now(),interval=settings.chippyFrequency*60000;
   let state=data[STATE]||{nextAt:t+interval,rotation:0,snoozeUntil:0,quietUntil:0};
   if(!settings.chippyLiveEnabled)return null;
   if(m.type==='chippy.action'){
    if(!['water','later','hour','quiet','dismiss'].includes(m.action))throw Error('Unknown companion action');
    if(m.action==='later'||m.action==='hour')state.snoozeUntil=t+(m.action==='hour'?60:10)*60000;
    if(m.action==='quiet'){const d=new Date(t);d.setHours(24,0,0,0);state.quietUntil=d.getTime();}
    state.nextAt=t+(m.action==='hour'?60*60000:m.action==='later'?10*60000:interval);state.message=null;state.silenceAt=t;await storage.set({[STATE]:state});return true;
   }
   if(m.type!=='chippy.claim')throw Error('Unknown coordinator request');
   if(!data[STATE]){await storage.set({[STATE]:state});return null;}
   if(!m.visible||!await eligible(sender,m)||t<Math.max(state.nextAt,state.snoozeUntil,state.quietUntil))return null;
   if(!settings.chippyHydration&&!settings.chippySass&&!settings.chippyComfort)return null;
   const rotation=Number.isSafeInteger(state.rotation)?state.rotation:0;
   const others=[...(settings.chippySass?['sass']:[]),...(settings.chippyComfort?['comfort']:[])];
   const kind=settings.chippyHydration&&(!others.length||rotation%2===0)?'hydration':others[Math.floor(rotation/(settings.chippyHydration?2:1))%others.length];
   const cycle=kind==='hydration'?(others.length?2:1):(settings.chippyHydration?2:1)*others.length;
   const sassChoices=[...sass,...(settings.chippyScrollSass?['If one more scroll has become twelve: impressive thumb stamina. Tiny break?','The feed has no finish line. Your water glass has a bottom. Priorities.']:[]),...(settings.chippyTaskSass?['If you are doing the same task again: even a professional cat takes stretch breaks.','Copy, paste, repeat? Add a tiny pause to that routine. Management approves.']:[])];const library=kind==='hydration'?hydration:kind==='comfort'?care.comfort:sassChoices;
   const message={text:library[Math.floor(rotation/cycle)%library.length],kind,expiresAt:t+60000};
   // Persist BEFORE returning: navigation, concurrent claims and worker restart cannot duplicate a due reminder.
   state={...state,nextAt:t+interval,rotation:rotation+1,message:null};await storage.set({[STATE]:state});return message;
  }
  return {dispatch};
 }
 const api={create,mergeSources,hydration,sass,STATE};if(typeof module==='object'&&module.exports)module.exports=api;else root.FeedShieldCoordinator=api;
})(globalThis);
