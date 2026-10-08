/* Shared API boundary. No storage schema conversion or permission widening. */
(function(root){
  function create(environment){
    const promiseNative = !!environment.browser;
    const api = environment.browser || environment.chrome;
    const error = () => api?.runtime?.lastError;
    function invoke(owner, method, args){
      return new Promise((resolve,reject)=>{
        if(typeof owner?.[method] !== 'function'){reject(new Error('Browser API unavailable: '+method));return;}
        try {
          if(promiseNative){Promise.resolve(owner[method](...args)).then(resolve,reject);return;}
          // Invoke immediately, preserving the permission request's user gesture.
          const result=owner[method](...args,value=>{const failure=error();failure?reject(new Error(failure.message||String(failure))):resolve(value);});
          if(result?.then) result.then(resolve,reject);
        } catch(failure){reject(failure);}
      });
    }
    async function get(keys){
      const changes=new Map();const changed=(value,area)=>{if(area==='local')for(const [key,event]of Object.entries(value))changes.set(key,event.newValue);};
      api?.storage?.onChanged?.addListener(changed);
      try{
        const model=environment.FeedShieldSettingsModel;
        const requested=keys&&typeof keys==='object'&&!Array.isArray(keys)&&model?Object.fromEntries(Object.entries(keys).map(([key,value])=>[key,Object.hasOwn(model.defaults,key)?model.defaults[key]:value])):keys;
        const raw=await invoke(api?.storage?.local,'get',[model?null:requested]);
        if(model){
          // Merge events before alias normalization, even if only the other
          // member of an alias pair was requested by this consumer.
          for(const [key,value]of changes){if(value===undefined)delete raw[key];else raw[key]=value;}
          const resolved=model.normalize(raw);
          if(keys==null)return resolved;
          if(typeof keys==='string'||Array.isArray(keys))return Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter(key=>Object.hasOwn(resolved,key)).map(key=>[key,resolved[key]]));
          return Object.fromEntries(Object.entries(requested).map(([key,value])=>[key,resolved[key]??value]));
        }
        const data=raw;
        for(const [key,value]of changes){const wanted=keys==null||typeof keys==='string'&&keys===key||Array.isArray(keys)&&keys.includes(key)||keys&&typeof keys==='object'&&key in keys;if(!wanted)continue;if(value===undefined){if(requested&&typeof requested==='object'&&!Array.isArray(requested))data[key]=requested[key];else delete data[key];}else data[key]=value;}
        return data;
      }finally{api?.storage?.onChanged?.removeListener(changed);}
    }
    function set(values){
      const model=environment.FeedShieldSettingsModel;
      if(model&&Object.keys(values).every(key=>Object.hasOwn(model.defaults,key)))return invoke(api?.runtime,'sendMessage',[{type:'settings.patch',patch:model.patch(values)}]).then(result=>{if(!result?.ok)throw Error(result?.error||'Settings unavailable');});
      return invoke(api?.storage?.local,'set',[values]);
    }
    const local={get,set};
    const events=event=>({addListener:fn=>event?.addListener(fn),removeListener:fn=>event?.removeListener(fn)});
    const permissions={};
    for(const name of ['contains','request','remove']) permissions[name]=details=>invoke(api?.permissions,name,[details]);
    for(const name of ['onAdded','onRemoved']) permissions[name]=events(api?.permissions?.[name]);
    const report=failure=>console.error('FeedShield browser operation failed:',failure.message);
    // Transitional callback bridge keeps existing platform decision order intact.
    // Failures never call a success callback or fabricate empty stored records.
    const legacyLocal={};
    for(const name of ['get','set']) legacyLocal[name]=(value,callback)=>{const work=local[name](value);work.then(result=>callback?.(result)).catch(report);return work;};
    const activity=message=>invoke(api?.runtime,'sendMessage',[{...message,type:'activity.change'}]).then(result=>{if(!result?.ok)throw Error(result?.error||'Activity unavailable');return result.value;});
    return {get activity(){return environment.FeedShieldSettingsModel?activity:null;},available:!!api?.storage?.local,storage:{local,onChanged:events(api?.storage?.onChanged)},permissions,
      tabs:{query:details=>invoke(api?.tabs,'query',[details]),sendMessage:(id,message)=>invoke(api?.tabs,'sendMessage',[id,message])},
      runtime:{version:api?.runtime?.getManifest?.().version,currentTab:()=>invoke(api?.tabs,'getCurrent',[]),getURL:path=>{if(!api?.runtime?.getURL)throw new Error('Browser API unavailable: getURL');return api.runtime.getURL(path);},sendMessage:message=>invoke(api?.runtime,'sendMessage',[message]),lastError:error},
      legacy:{storage:{local:legacyLocal,onChanged:events(api?.storage?.onChanged)}},report};
  }
  if(typeof module==='object'&&module.exports)module.exports={create};
  else root.FeedShieldBrowser=create(root);
})(typeof globalThis!=='undefined'?globalThis:this);
