/* Pure FeedShield text and preference policy. No DOM, storage, or network access. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FeedShieldPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const drama = ["dramabox","reelshort","shortmax","goodshort","flextv","moboreels","billionaire","alpha","werewolf","rejected mate","secret heir","contract marriage","ceo romance"];
  const sexual = ["seduce","seduced","naked","strip","stripping","in bed","pregnant by","sleep with","slept with","mistress","lover","one night stand","affair"];
  const ai = ["creator labeled as ai-generated","creator labelled as ai-generated","ai-generated content","ai generated","ai-generated","generated with ai","synthetic media","created with ai","made with ai"];
  const norm = value => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const list = value => Array.isArray(value) ? value : [];
  const custom = settings => String(settings.customTerms || "").split(/\n|,/).map(norm).filter(Boolean);
  const sponsored = text => /\bsponsored\b|\bad\b|\bpaid partnership\b|\bpromoted\b/i.test(text);
  const aiLabeled = text => ai.some(value => phrase(text,value));
  const unique = values => [...new Set(values)];
  // Built-in words match complete words, not "strip" inside "striped".
  const phrase = (text, value) => {
    const t=norm(text), v=norm(value);let at=t.indexOf(v);
    while(at!==-1){
      const before=Array.from(t.slice(0,at)).pop()||'',after=Array.from(t.slice(at+v.length))[0]||'';
      if(!/[\p{L}\p{N}_]/u.test(before)&&!/[\p{L}\p{N}_]/u.test(after))return true;
      at=t.indexOf(v,at+1);
    }
    return false;
  };
  function resolveAdvertiser(text, author, settings = {}) {
    // A publisher name or keyword cannot establish a separate advertiser.
    return "Unknown advertiser";
  }

  function categories(text, settings = {}) {
    const t = norm(text), out = [];
    if (drama.some(value => phrase(t,value))) out.push("short-drama");
    if (sexual.some(value => phrase(t,value))) out.push("sexualized");
    if (aiLabeled(t)) out.push("ai-labeled");
    if (sponsored(text)) out.push("sponsored");
    return unique(out);
  }
  // Mirrors the existing TikTok textReasons decisions. The caller supplies the
  // platform-specific advertiser extracted by the existing content script.
  function tiktokTextReasons(text, advertiser, settings = {}, publisherName = "") {
    const muted = custom(settings).some(value => norm(text).includes(value));

    const t = norm(text), ad = norm(advertiser), cats = categories(text, settings), out = [];
    const matches=value=>{const v=norm(value);return ad.startsWith('tiktok:@')&&(v===ad||v==='@'+ad.slice(8)||v===ad.slice(8));};
    if (list(settings.allowedAdvertisers).some(matches)) return [];
    if (list(settings.blockedAdvertisers).some(value=>matches(value)||(publisherName&&!publisherName.startsWith('@')&&norm(value)===norm(publisherName)))) out.push("blocked publishing account");
    if (list(settings.blockedCategories).some(value => cats.includes(value))) out.push("blocked category");
    if (settings.blockSponsored && sponsored(text)) out.push("sponsorship wording matched (text rule; not verified)");
    if (muted) out.push("muted word, hashtag or source");
    if ((sponsored(text)||muted||aiLabeled(text)) && settings.blockDrama && drama.some(value => phrase(t,value))) out.push("short-drama / blocked brand");
    if ((sponsored(text)||muted||aiLabeled(text)) && settings.blockSexualized && sexual.some(value => phrase(t,value))) out.push("sexualized wording");
    if (settings.blockAI && aiLabeled(text)) out.push("AI-related wording matched (text rule; not verified)");
    return unique(out);
  }
  function savedReasons(item, settings = {}) {
    const out = [];
    if (item.sourceUrl && list(settings.hiddenItems).includes(item.sourceUrl)) out.push("saved hidden item");
    if (item.source !== "tiktok" && custom(settings).some(value => norm(item.text).includes(value))) out.push("muted word, hashtag or source");
    if (item.source === "etsy" && item.author && list(settings.blockedEtsyShops).map(norm).includes(norm(item.author))) out.push("blocked shop");
    return out;
  }
  return { drama, sexual, ai, resolveAdvertiser, categories, tiktokTextReasons, savedReasons, sponsored, aiLabeled, norm };
});
