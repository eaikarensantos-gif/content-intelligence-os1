// Cria menus de contexto (botao direito)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-page',
    title: 'Salvar pagina no segundo cerebro',
    contexts: ['page']
  })
  chrome.contextMenus.create({
    id: 'clip-selection',
    title: 'Salvar selecao no segundo cerebro',
    contexts: ['selection']
  })
  chrome.contextMenus.create({
    id: 'clip-image',
    title: 'Salvar imagem no segundo cerebro',
    contexts: ['image']
  })
  chrome.contextMenus.create({
    id: 'clip-link',
    title: 'Salvar link no segundo cerebro',
    contexts: ['link']
  })
})

// Abre o app com o clip via context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  let clip = {
    url: tab.url,
    title: tab.title,
    clippedAt: new Date().toISOString(),
    favicon: tab.favIconUrl || '',
    hostname: new URL(tab.url).hostname,
  }

  if (info.menuItemId === 'clip-selection') {
    clip.type = 'selection'
    clip.content = info.selectionText || ''
  } else if (info.menuItemId === 'clip-image') {
    clip.type = 'full_page'
    clip.image = info.srcUrl || ''
    clip.content = info.srcUrl || ''
  } else if (info.menuItemId === 'clip-link') {
    clip.type = 'full_page'
    clip.url = info.linkUrl || tab.url
    clip.content = info.linkUrl || ''
  } else {
    clip.type = 'article'
  }

  clip.id = 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
  clip.status = 'inbox'
  clip.savedAt = clip.clippedAt
  clip.tags = []
  clip.notes = ''

  openClipper(clip)
})

// Mensagem do popup
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'OPEN_CLIPPER') {
    openClipper(msg.clip)
    sendResponse({ ok: true })
  }
})

function openClipper(clip) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(clip))))
  const url = `https://content-intelligence-os1.vercel.app/clipper?clip=${encoded}`
  chrome.tabs.query({ url: 'https://content-intelligence-os1.vercel.app/*' }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true, url })
      chrome.windows.update(tabs[0].windowId, { focused: true })
    } else {
      chrome.tabs.create({ url })
    }
  })
}
