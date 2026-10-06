# FeedShield v0.9.3 clean beta

This hotfix recognizes TikTok's visible “Creator labeled as AI-generated” notice automatically. It also prevents one TikTok report from hiding subsequently loaded videos and removes broad saved page addresses from earlier builds.

FeedShield is a browser-extension prototype for choosing what enters your feeds. This build is for small, supervised beta testing—not public release.

## What works in this beta

| Site | Current capability |
|---|---|
| TikTok Web | `Tell FeedShield`, saved hiding, muted terms, sponsored-post rules, and an optional experimental visual check |
| Etsy | `Tell FeedShield`, saved listing hiding, shop hiding, and muted terms |
| Instagram, Facebook, YouTube, X, Reddit, Pinterest, Bluesky | `Tell FeedShield`, saved post hiding, and muted terms |

All supported sites receive access when the extension is installed and begin enabled. Testers do not have to approve each site separately. Individual site switches pause or resume FeedShield without requesting another browser permission.

## Important limitations

- The boundary choices capture tester preferences; most are not yet automatic detectors.
- TikTok visual checking is experimental and currently estimates sexual/suggestive visual risk only. It can be wrong.
- Other social platforms use manual feedback and muted terms; they do not yet have visual detection.
- FeedShield does not submit reports, punish accounts, or claim that content violates a platform policy.
- Website layout changes can temporarily break buttons or hiding.

## Install

1. Unzip this package.
2. Open `chrome://extensions` or `edge://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the unzipped `FeedShield_Clean_Beta_v0.9.3` folder—the one containing `manifest.json`.
5. Pin FeedShield, open its popup, and turn on only the sites you want to test.
6. Reload an already-open site after enabling it.

## Suggested beta test

For each enabled site, confirm that:

1. **Tell FeedShield** appears on feed items.
2. **Hide and remember** keeps the same item hidden after a reload.
3. **Undo** restores the item.
4. A muted word or hashtag hides a matching item.
5. All supported sites begin enabled without repeated permission prompts.
6. **Copy activity for beta testing** produces a useful local test record.

On TikTok, also test **Reveal once**, **Always allow**, **Not a match**, and the optional visual checker.

## Privacy in this build

Settings, saved item links, short text excerpts, and feedback stay in Chrome local extension storage. Nothing is reported automatically. FeedShield does not read passwords, forms, browsing history, or local files. The visual checker runs on-device, but its JavaScript/model dependencies are downloaded from jsDelivr when the tester starts it. Those dependencies should be bundled locally before any store release.
