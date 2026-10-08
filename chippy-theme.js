/* Shared local appearance, independent of companion consent. */
(()=>{const key='feedshieldChippyAppearanceV1',motion=matchMedia('(prefers-color-scheme: dark)');let value={},revision=0;function paint(){const vars=FeedShieldChippyAppearance.theme(value,motion.matches);for(const [k,v]of Object.entries(vars))document.documentElement.style.setProperty(k,v);}
paint();motion.addEventListener('change',paint);FeedShieldBrowser.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes[key]){revision++;value=changes[key].newValue;paint();}});const initial=revision;FeedShieldBrowser.storage.local.get(key).then(data=>{if(revision===initial){value=data[key];paint();}}).catch(()=>{});
})();
