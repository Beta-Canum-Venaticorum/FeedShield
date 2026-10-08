const defaults={protectionEnabled:true,protectSexual:true,protectGraphic:true,protectAnimalHarm:true,protectHate:true,protectAI:true,protectMisleading:true,protectNews:true,protectPromotional:true,tiktokEnabled:true,instagramEnabled:true,facebookEnabled:true,youtubeEnabled:true,xEnabled:true,redditEnabled:true,pinterestEnabled:true,blueskyEnabled:true,etsyEnabled:true,blockSponsored:false,blockDrama:true,blockSexualized:true,blockAI:true,showPlaceholder:true,customTerms:"DramaBox\nReelShort\nShortMax\nGoodShort\nFlexTV\nMoboReels",blockedAdvertisers:[],blockedCategories:[],allowedAdvertisers:[],blockedEtsyShops:[],blockedCreators:[],manualFlags:[],hiddenItems:[]};

const ids=["protectionEnabled","protectSexual","protectGraphic","protectAnimalHarm","protectHate","protectAI","protectMisleading","protectNews","protectPromotional","tiktokEnabled","instagramEnabled","facebookEnabled","youtubeEnabled","xEnabled","redditEnabled","pinterestEnabled","blueskyEnabled","etsyEnabled","blockSponsored","showPlaceholder","customTerms"],$=id=>document.getElementById(id);

function status(text){$("status").textContent=text;setTimeout(()=>{if($("status").textContent===text)$("status").textContent=""},2200)}

function renderActivity(current){

 const box=document.getElementById('saved-activity');if(!box)return;box.textContent='';

 for(const record of (Array.isArray(current.manualFlags)?current.manualFlags:[]).slice(0,20)){

  if(!record||typeof record!=='object')continue;const row=document.createElement('p');row.textContent=[record.site,record.reason,record.publisherName||record.publisherId].filter(v=>typeof v==='string').join(' · ')||'Legacy saved report';

  try{const url=new URL(record.url);if(url.protocol==='https:'&&!url.username&&!url.password){const a=document.createElement('a');a.href=url.href;a.textContent=' Open original';a.target='_blank';a.rel='noopener noreferrer';row.append(a);}}catch{}box.append(row);

 }

 const rules=document.createElement('p');rules.textContent='Saved TikTok account rules: '+[...(Array.isArray(current.blockedAdvertisers)?current.blockedAdvertisers:[]).map(v=>'Block '+v),...(Array.isArray(current.allowedAdvertisers)?current.allowedAdvertisers:[]).map(v=>'Allow '+v)].join(';');box.append(rules);

}

function counts(current){renderActivity(current);const protection=document.getElementById("protection-status");if(protection)protection.textContent=current.protectionEnabled?"Website protection preference enabled · check a website from the toolbar":"Protection off";$("manualFlagsCount").textContent=(current.manualFlags||[]).length;$("blockedSourcesCount").textContent=(current.blockedEtsyShops||[]).length+(current.blockedAdvertisers||[]).length+(current.blockedCreators||[]).length}

const local=FeedShieldBrowser.storage.local;

const failure=error=>status('Could not access settings: '+error.message);

let revision=0;const changed=new Set();

function populate(current){for(const id of ids){const input=$(id);if(input.type==='checkbox')input.checked=current[id];else input.value=current[id]}counts(current);}

const start=revision;local.get(defaults).then(current=>{if(revision===start)populate(current);else for(const id of ids)if(!changed.has(id)){const input=$(id);if(input.type==='checkbox')input.checked=current[id];else input.value=current[id];}}).catch(failure);

for(const id of ids)$(id).addEventListener('change',()=>{const input=$(id),value=id==='showPlaceholder'?input.value==='true':input.type==='checkbox'?input.checked:input.value,patch={[id]:value};const alias={protectPromotional:'blockDrama',protectSexual:'blockSexualized',protectAI:'blockAI'}[id];if(alias)patch[alias]=value;local.set(patch).then(()=>status('Settings saved')).catch(failure);});

$('copyFlags').onclick=()=>local.get(defaults).then(async current=>{const data={exportedAt:new Date().toISOString()};for(const key of ['manualFlags','hiddenItems','blockedAdvertisers','allowedAdvertisers','blockedCategories','blockedCreators','blockedEtsyShops'])data[key]=current[key]||[];await navigator.clipboard.writeText(JSON.stringify(data,null,2));status('Beta activity copied')}).catch(failure);

$('clearLists').onclick=()=>(FeedShieldBrowser.activity?FeedShieldBrowser.activity({clear:true}):local.set({manualFlags:[],hiddenItems:[],blockedAdvertisers:[],blockedCategories:[],allowedAdvertisers:[],blockedCreators:[],blockedEtsyShops:[]})).then(()=>{counts({...defaults,protectionEnabled:$("protectionEnabled").checked});status('Saved activity cleared')}).catch(failure);

FeedShieldBrowser.storage.onChanged.addListener((changes,area)=>{if(area!=='local')return;revision++;for(const id of ids)if(changes[id]){changed.add(id);const input=$(id),value=changes[id].newValue??defaults[id];if(input.type==='checkbox')input.checked=value;else input.value=value;}local.get(defaults).then(counts).catch(failure);});

