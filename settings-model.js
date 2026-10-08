/* Versioned flat-key model: legacy records remain untouched. */
(function(root){
 const aliases={protectAI:'blockAI',protectSexual:'blockSexualized',protectPromotional:'blockDrama'};
 const defaults={chippyLiveEnabled:false,chippyHydration:true,chippySass:true,chippyScrollSass:true,chippyTaskSass:true,chippyComfort:true,chippyFrequency:45,chippyCorner:0,chippyTucked:false,chippyX:-1,chippyY:-1,feedSource:'all',feedSort:'source',feedPresentation:'replace',protectionEnabled:true,showPlaceholder:true,blockSponsored:false};
 for(const key of ['protectSexual','protectGraphic','protectAnimalHarm','protectHate','protectAI','protectMisleading','protectNews','protectPromotional','tiktokEnabled','instagramEnabled','facebookEnabled','youtubeEnabled','xEnabled','redditEnabled','pinterestEnabled','blueskyEnabled','etsyEnabled','blockDrama','blockSexualized','blockAI'])defaults[key]=true;
 defaults.customTerms='DramaBox\nReelShort\nShortMax\nGoodShort\nFlexTV\nMoboReels';
 function normalize(data={}){const out={...data};for(const [key,value]of Object.entries(defaults))out[key]=typeof data[key]===typeof value?data[key]:value;
 for(const [ui,rule]of Object.entries(aliases)){const value=typeof data[rule]==='boolean'?data[rule]:typeof data[ui]==='boolean'?data[ui]:defaults[rule];out[ui]=out[rule]=value;}
 if(![15,30,45,60,90].includes(out.chippyFrequency))out.chippyFrequency=45;
 for(const key of ['chippyX','chippyY'])if(!Number.isFinite(out[key])||out[key]<0||out[key]>1)out[key]=-1;
 if(![0,1,2,3].includes(out.chippyCorner))out.chippyCorner=0;
 if(!['all','rss','atom','tiktok','youtube','reddit','other'].includes(out.feedSource))out.feedSource='all';
 if(!['source','chronological'].includes(out.feedSort))out.feedSort='source';
 if(!['replace','blur'].includes(out.feedPresentation))out.feedPresentation='replace';return out;}
 function patch(value){const out={};for(const [key,v]of Object.entries(value||{})){if(!Object.hasOwn(defaults,key))throw Error('Unknown setting: '+key);out[key]=normalize({[key]:v})[key];}
 for(const [ui,rule]of Object.entries(aliases)){if(Object.hasOwn(out,ui)&&Object.hasOwn(out,rule)&&out[ui]!==out[rule])throw Error('Conflicting preference aliases');if(Object.hasOwn(out,ui)||Object.hasOwn(out,rule))out[ui]=out[rule]=out[rule]??out[ui];}return out;}
 function migrate(data){const version=data.feedshieldSettingsVersion??0;if(!Number.isInteger(version)||version<0||version>2)throw Error('Newer settings version; update FeedShield');if(version===2)return {};
 const resolved=normalize(data),out={feedshieldSettingsVersion:2,feedshieldLegacyAliasesV1:Object.fromEntries(Object.keys(aliases).flatMap(ui=>[ui,aliases[ui]]).filter(key=>Object.hasOwn(data,key)).map(key=>[key,data[key]]))};
 for(const [ui,rule]of Object.entries(aliases))out[ui]=out[rule]=resolved[rule];return out;}
 const api={defaults,normalize,patch,migrate};if(typeof module==='object'&&module.exports)module.exports=api;else root.FeedShieldSettingsModel=api;
})(globalThis);
