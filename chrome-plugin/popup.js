let pageData = null
let clipType = 'article'

async function loadPageData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) throw new Error('No active tab')

    pageData = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' })

    document.getElementById('pageTitle').textContent = pageData.title || tab.title || 'Sem título'
    document.getElementById('pageUrl').textContent = pageData.hostname || pageData.url
    document.getElementById('favicon').src = pageData.favicon || ''

    if (pageData.selectedText && pageData.selectedText.length > 10) {
      setType('selection')
    } else {
      document.getElementById('selectionBtn').style.opacity = '0.5'
      setType('article')
    }
  } catch (e) {
    document.getElementById('pageTitle').textContent = 'Não foi possível ler a página'
    document.getElementById('preview').textContent = 'Abra uma aba com conteúdo para recortar.'
  }
}

function setType(type) {
  clipType = type
  document.querySelectorAll('.clip-type').forEach((el) => {
    el.classList.toggle('active', el.dataset.type === type)
  })
  updatePreview()
}

function updatePreview() {
  if (!pageData) return
  let text = ''
  if (clipType === 'selection') {
    text = pageData.selectedText || '(nenhum texto selecionado)'
  } else if (clipType === 'article') {
    text = pageData.articleText || pageData.description || '(sem conteúdo extraído)'
  } else {
    text = pageData.description || pageData.articleText || '(página completa será salva)'
  }
  document.getElementById('preview').textContent = text.slice(0, 300)
}

function getContent() {
  if (!pageData) return ''
  if (clipType === 'selection') return pageData.selectedText || ''
  return pageData.articleText || ''
}

function saveClip() {
  if (!pageData) {
    showStatus('Nenhuma página carregada.', 'error')
    return
  }

  const btn = document.getElementById('saveBtn')
  btn.disabled = true
  btn.textContent = 'Salvando...'

  const rawTags = document.getElementById('tags').value
  const tags = rawTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

  const clip = {
    url: pageData.url,
    title: pageData.title,
    description: pageData.description,
    content: getContent(),
    image: pageData.image,
    favicon: pageData.favicon,
    hostname: pageData.hostname,
    type: clipType,
    tags,
    notes: document.getElementById('notes').value.trim(),
    clippedAt: pageData.clippedAt,
  }

  chrome.runtime.sendMessage({ type: 'OPEN_CLIPPER', clip }, (res) => {
    if (res && res.ok) {
      showStatus('✅ Clip salvo! Abrindo no app...', 'success')
      btn.textContent = '✅ Salvo!'
    } else {
      showStatus('Erro ao abrir o app. O app está rodando em localhost:5173?', 'error')
      btn.disabled = false
      btn.textContent = '✂️ Salvar no Segundo Cérebro'
    }
  })
}

function showStatus(msg, type) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.className = 'status ' + type
}

loadPageData()
