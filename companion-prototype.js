(() => {
  const KEY="feedshieldCompanionPrototypeV1",defaults={enabled:false,siteEnabled:true,reducedMotion:false,tucked:false,suppressedDay:null,cooldownUntil:0,promptCount:0,timerMinutes:35,position:"bottom-right"};
  const $=id=>document.getElementById(id),companion=$("companion"),face=$("companion-face"),card=$("companion-card"),eyes=$("eyes"),actions=$("prompt-actions"),tucked=$("tucked-tab"),restore=$("restore-companion");
  let settings={...defaults},timerStartedAt=null,timerHandle=null,drag=null,eyeIndex=0;
  const storage=FeedShieldBrowser.available?{get:async()=>(await FeedShieldBrowser.storage.local.get(KEY))[KEY],set:value=>FeedShieldBrowser.storage.local.set({[KEY]:value})}:{get:async()=>null,set:async()=>{}};
  const save=()=>storage.set(settings).catch(error=>{$("timer-status").textContent="Settings could not be saved: "+error.message});
  const today=()=>new Date().toISOString().slice(0,10);
  const setEyes=value=>{eyes.textContent=value;const names={"• •":"neutral","─ •":"winking","─ ─":"resting","^ ^":"happy"};face.setAttribute("aria-label",`FeedShield companion, ${names[value]||"expressive"} face`)};
  function visible(){return settings.enabled&&settings.siteEnabled}
  function syncVisibility(){companion.hidden=!visible()||settings.tucked;tucked.hidden=!visible()||!settings.tucked;restore.hidden=visible();}
  function overlaps(a,b,margin=8){return a.left<b.right+margin&&a.right>b.left-margin&&a.top<b.bottom+margin&&a.bottom>b.top-margin}
  function protectedRects(){return [...document.querySelectorAll("[data-feedshield-protected-control]")].map(node=>node.getBoundingClientRect())}
  function placeSafely(){
    if(!visible()||settings.tucked)return true;
    companion.hidden=false;
    companion.style.left=companion.style.top=companion.style.right=companion.style.bottom="";
    const candidates=[settings.position,"bottom-right","top-right","bottom-left","top-left"].filter((value,index,array)=>array.indexOf(value)===index);
    for(const position of candidates){companion.dataset.position=position;const rect=companion.getBoundingClientRect();if(!protectedRects().some(control=>overlaps(rect,control))){settings.position=position;$("placement-status").textContent=`Companion placed at ${position.replace("-"," ")}.`;save();return true}}
    companion.hidden=true;$("placement-status").textContent="Companion was not shown because no safe placement was available.";return false;
  }
  function closeCard(){card.hidden=true;face.setAttribute("aria-expanded","false");actions.hidden=false;face.classList.remove("nudge");placeSafely()}
  function openCard(message,badge="• •",focusChoices=false){
    if(!visible())return;card.hidden=false;face.setAttribute("aria-expanded","true");$("prompt-text").textContent=message;actions.hidden=false;setEyes(badge);face.classList.add("nudge");placeSafely();if(focusChoices)$("prompt-actions").querySelector("button")?.focus();
  }
  function stopTimer(message="Timer is off."){if(timerHandle)clearInterval(timerHandle);timerHandle=null;timerStartedAt=null;$("timer-status").textContent=message}
  function dueAllowed(){return settings.enabled&&settings.siteEnabled&&settings.suppressedDay!==today()&&Date.now()>=settings.cooldownUntil}
  function checkTimer(){
    if(timerStartedAt==null)return;const elapsed=Math.floor((Date.now()-timerStartedAt)/60000),remaining=Math.max(0,settings.timerMinutes-elapsed);$("timer-status").textContent=remaining?`${remaining} minute${remaining===1?"":"s"} until a gentle check-in.`:"Session check-in is due.";
    if(elapsed>=settings.timerMinutes&&dueAllowed()){stopTimer("Session check-in shown.");settings.promptCount++;save();openCard(`Your ${settings.timerMinutes}-minute session timer is up. Want a five-minute pause?`,`─ •`)}
  }
  function startTimer(){if(!visible()){$("timer-status").textContent="Turn companion on before starting a timer.";return}if(settings.suppressedDay===today()){$("timer-status").textContent="Companion prompts remain off for today.";return}const minutes=Number($("timer-minutes").value);settings.timerMinutes=[1,15,25,35].includes(minutes)?minutes:35;timerStartedAt=Date.now();if(timerHandle)clearInterval(timerHandle);timerHandle=setInterval(checkTimer,1000);checkTimer();save()}
  function tuckAway(){settings.tucked=true;closeCard();syncVisibility();save();$("placement-status").textContent="Companion tucked at the edge."}
  face.addEventListener("click",()=>card.hidden?openCard("Would a brief pause help, or shall I stay quietly at the edge?","• •",true):closeCard());
  $("close-card").addEventListener("click",closeCard);$("start-timer").addEventListener("click",startTimer);
  $("manual-pause").addEventListener("click",()=>openCard("You asked for a pause. Shall we take five quiet minutes?","^ ^",true));
  $("prompt-actions").addEventListener("click",event=>{
    const choice=event.target.dataset.choice;if(!choice)return;
    if(choice==="continue"){settings.cooldownUntil=Date.now()+10*60000;closeCard();$("timer-status").textContent="Continuing. Companion prompts are quiet for 10 minutes."}
    if(choice==="pause"){stopTimer("Five-minute pause selected.");$("prompt-text").textContent="Pause started. Step away, breathe, or look somewhere distant for a moment.";actions.hidden=true;setEyes("─ ─");face.classList.remove("nudge")}
    if(choice==="today"){settings.suppressedDay=today();stopTimer("Companion prompts are off for today.");closeCard()}save();
  });
  $("site-enabled").addEventListener("change",event=>{settings.siteEnabled=event.target.checked;if(!settings.siteEnabled)stopTimer();closeCard();syncVisibility();save()});
  $("reduced-motion").addEventListener("change",event=>{settings.reducedMotion=event.target.checked;face.classList.toggle("reduced",settings.reducedMotion);if(settings.reducedMotion)setEyes("• •");save()});
  $("tuck-away").addEventListener("click",tuckAway);tucked.addEventListener("click",()=>{settings.tucked=false;syncVisibility();placeSafely();save();face.focus()});
  $("turn-off").addEventListener("click",()=>{settings.enabled=false;settings.tucked=false;stopTimer();closeCard();syncVisibility();save()});
  restore.addEventListener("click",()=>{settings.enabled=true;settings.optedIn=true;settings.siteEnabled=true;settings.tucked=false;$("site-enabled").checked=true;syncVisibility();placeSafely();save();face.focus()});
  face.addEventListener("keydown",event=>{
    if(event.key==="Escape"){closeCard();return}if(event.key.toLowerCase()==="t"){event.preventDefault();tuckAway();return}
    const moves={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(!moves[event.key])return;event.preventDefault();const rect=companion.getBoundingClientRect(),[dx,dy]=moves[event.key];
    companion.dataset.position="custom";companion.style.right=companion.style.bottom="auto";companion.style.left=`${Math.max(4,Math.min(innerWidth-rect.width-4,rect.left+dx))}px`;companion.style.top=`${Math.max(4,Math.min(innerHeight-rect.height-4,rect.top+dy))}px`;if(protectedRects().some(control=>overlaps(companion.getBoundingClientRect(),control)))placeSafely();
  });
  face.addEventListener("pointerdown",event=>{if(event.button!==0)return;const rect=companion.getBoundingClientRect();drag={x:event.clientX-rect.left,y:event.clientY-rect.top};face.setPointerCapture?.(event.pointerId)});
  face.addEventListener("pointermove",event=>{if(!drag)return;companion.dataset.position="custom";companion.style.right=companion.style.bottom="auto";companion.style.left=`${Math.max(4,Math.min(innerWidth-companion.offsetWidth-4,event.clientX-drag.x))}px`;companion.style.top=`${Math.max(4,Math.min(innerHeight-companion.offsetHeight-4,event.clientY-drag.y))}px`});
  face.addEventListener("pointerup",()=>{if(!drag)return;drag=null;if(protectedRects().some(control=>overlaps(companion.getBoundingClientRect(),control)))placeSafely();else $("placement-status").textContent="Companion moved."});
  window.addEventListener("resize",placeSafely);
  window.addEventListener("feedshield-appearance-change",placeSafely);
  storage.get().then(saved=>{settings={...defaults,...(saved&&typeof saved==="object"?saved:{})};settings.enabled=saved?.optedIn===true&&saved.enabled===true;settings.reducedMotion=settings.reducedMotion||globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;$("timer-minutes").value=String(settings.timerMinutes);$("site-enabled").checked=settings.siteEnabled;$("reduced-motion").checked=settings.reducedMotion;face.classList.toggle("reduced",settings.reducedMotion);syncVisibility();placeSafely()}).catch(error=>{$("timer-status").textContent="Settings unavailable: "+error.message;syncVisibility()});
  setInterval(()=>{if(settings.reducedMotion||!card.hidden||!visible())return;const states=["• •","─ •","─ ─","^ ^"];eyeIndex=(eyeIndex+1)%states.length;setEyes(states[eyeIndex])},2400);
})();
