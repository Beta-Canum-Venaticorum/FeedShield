(function(root){
  const defaults={name:'Chippy',cat:1,textColor:'#ffffff',backgroundColor:'#202124',size:96,mirror:false,animate:true,coatColor:null,hat:'original',theme:'dark',accent:'#215fc4'};
  function normalize(value={}){
    if(!value||typeof value!=="object"||Array.isArray(value))value={};
    const color=(v,f)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:f;
    return {name:typeof value.name==='string'?value.name.trim().slice(0,24)||'Chippy':'Chippy',cat:Number.isInteger(value.cat)&&value.cat>=1&&value.cat<=10?value.cat:1,
      textColor:color(value.textColor,defaults.textColor),backgroundColor:color(value.backgroundColor,defaults.backgroundColor),size:[64,96,128].includes(value.size)?value.size:96,mirror:value.mirror===true,animate:value.animate!==false,coatColor:color(value.coatColor,null),hat:['original','none','flower','bow','spark','bucket','top','banana','wizard'].includes(value.hat)?value.hat:'original',theme:['dark','light','system'].includes(value.theme)?value.theme:'dark',accent:color(value.accent,defaults.accent)};
  }
  const hats={none:1,flower:4,bow:5,spark:6,bucket:7,top:8,banana:9,wizard:10};
  function catId(value){const v=normalize(value);return hats[v.hat]||v.cat;}
  function recolor(data,color,id){
    if(!color)return;const base=[1,5,8].includes(id)?[255,255,255,182,182,182]:[3,7,9].includes(id)?[100,87,89,60,56,57]:[247,145,71,186,96,62];
    const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),shadows={'#ffffff':[182,182,182],'#f79147':[186,96,62],'#645759':[60,56,57]},shadow=shadows[color.toLowerCase()]||rgb.map(c=>Math.round(c*.69));
    for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;const shade=base.slice(3).every((c,j)=>data[i+j]===c),fur=base.slice(0,3).every((c,j)=>data[i+j]===c);if(shade||fur)for(let j=0;j<3;j++)data[i+j]=(shade?shadow:rgb)[j];}
  }
  function theme(value,systemDark){const v=normalize(value),dark=v.theme==='dark'||v.theme==='system'&&systemDark;const rgb=[1,3,5].map(i=>{const c=parseInt(v.accent.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}),l=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return {'color-scheme':dark?'dark':'light','--ink':dark?'#f7f8fc':'#20212a','--muted':dark?'#c8cbd6':'#505461','--surface':dark?'#25272e':'#ffffff','--control':dark?'#30323b':'#ffffff','--page':dark?'#202126':'#f5f6fa','--line':dark?'#727786':'#b6bbc7','--accent':v.accent,'--action-ink':l>.179?'#000000':'#ffffff','--link':dark?'#adcaff':'#174ca7'};}
  function asset(value,reduced){const v=normalize(value);return `assets/chippy/${catId(v)}.${v.animate&&!reduced?'gif':'png'}`;}
  const api={defaults,normalize,asset,catId,recolor,theme};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FeedShieldChippyAppearance=api;
})(globalThis);
