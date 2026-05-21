// Content script — extracts page content when requested by popup

function getMeta(name) {
  const el =
    document.querySelector(`meta[property="${name}"]`) ||
    document.querySelector(`meta[name="${name}"]`)
  return el ? el.getAttribute('content') || '' : ''
}

function extractArticleText() {
  // Try semantic article containers first
  const candidates = [
    'article',
    '[role="main"]',
    'main',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content',
    '#content',
  ]
  for (const sel of candidates) {
    const el = document.querySelector(sel)
    if (el) {
      const text = el.innerText.trim()
      if (text.length > 200) return text.slice(0, 8000)
    }
  }
  // Fallback: collect all paragraphs
  const paras = Array.from(document.querySelectorAll('p'))
    .map((p) => p.innerText.trim())
    .filter((t) => t.length > 40)
    .join('\n\n')
  return paras.slice(0, 8000)
}

function getPageData() {
  const selection = window.getSelection()?.toString().trim()

  return {
    url: location.href,
    title:
      getMeta('og:title') ||
      document.title ||
      '',
    description:
      getMeta('og:description') ||
      getMeta('description') ||
      '',
    image: getMeta('og:image') || '',
    favicon: `https://www.google.com/s2/favicons?domain=${location.hostname}&sz=64`,
    hostname: location.hostname,
    selectedText: selection || '',
    articleText: extractArticleText(),
    clippedAt: new Date().toISOString(),
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_PAGE_DATA') {
    sendResponse(getPageData())
  }
})
