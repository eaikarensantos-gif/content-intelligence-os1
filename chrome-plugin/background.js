// Background service worker

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OPEN_CLIPPER') {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(msg.clip))))
    const url = `http://localhost:5173/clipper?clip=${encoded}`

    // Try to find existing app tab and focus it, otherwise open new tab
    chrome.tabs.query({ url: 'http://localhost:5173/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true, url })
        chrome.windows.update(tabs[0].windowId, { focused: true })
      } else {
        chrome.tabs.create({ url })
      }
    })
    sendResponse({ ok: true })
  }
})
