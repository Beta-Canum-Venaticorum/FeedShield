/* Local authored prompts, not generated responses or clinical guidance. */
(function(root){
 const comfort=[
  'You do not have to finish everything today. One small thing is enough for now.',
  'A pause does not erase your progress.',
  'You can take this moment at your own pace.',
  'It is okay to step away from a feed that feels like too much.',
  'You deserve a little kindness, including from yourself.',
  'If company would help, you could send someone you trust a small hello.'
 ];
 const activities={
  grounding:{title:'Notice your surroundings',steps:['Look around and name three things you can see.','Notice one sound, if that feels comfortable.','Feel a comfortable surface beneath your hand or feet.','Take your time. You can finish here or repeat any step.']},
  small:{title:'One small next step',steps:['Choose one thing you would like to make a little easier. No need to write it down here.','Make the next step small: open a document, put one thing away, or send a short hello.','Decide whether to try it now or leave it for later. Either is okay.']},
  rest:{title:'A screen break',steps:['Look away from your screen for a moment.','Let your shoulders rest in a comfortable position. Skip any movement that does not feel good.','Notice whether you would like to keep resting or return. There is no timer to beat.']},
  water:{title:'A little water break',steps:['If you would like a drink, keep some water within reach.','Take a comfortable sip when you are ready.','That is your break. No targets or catch-up needed.']}
 };
 const api={comfort,activities};if(typeof module==='object'&&module.exports)module.exports=api;else root.FeedShieldChippyCare=api;
})(globalThis);
