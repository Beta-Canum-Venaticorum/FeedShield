
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "FEEDSHIELD_CAPTURE_VISIBLE") {
    chrome.tabs.captureVisibleTab(sender?.tab?.windowId, {format:"jpeg", quality:75}, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ok:false, error:chrome.runtime.lastError.message});
      } else {
        sendResponse({ok:true, dataUrl});
      }
    });
    return true;
  }
});
