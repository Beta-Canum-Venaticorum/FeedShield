/* Respond only from the top-level installed content script. No page text is stored. */
(()=>{const api=globalThis.browser||globalThis.chrome;
 api.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==api.runtime.id||message?.type!=='protection.status')return;
  try{const state=globalThis.FeedShieldProtectionSnapshot?.();reply({version:api.runtime.getManifest().version,connected:true,...(state||{ready:false,error:'Protection handler did not initialize'})});}
  catch(error){reply({connected:true,ready:false,error:error.message});}
 });
})();
