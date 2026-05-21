const APP_URL = 'http://localhost:5173'
const STORAGE_KEY = 'content-intelligence-os-v3'

const TEST_POSTS = [
  { id: 'p1', title: '5 Dicas de Instagram', format: 'Reel', hook_type: 'problem', platform: 'instagram' },
  { id: 'p2', title: 'Like se você ama', format: 'Static', hook_type: 'engagement', platform: 'instagram' },
  { id: 'p3', title: 'Trending Sound', format: 'Reel', hook_type: 'curiosity', platform: 'instagram' },
  { id: 'p4', title: 'Carrossel Educativo', format: 'Carousel', hook_type: 'education', platform: 'instagram' },
  { id: 'p5', title: 'Story com Enquete', format: 'Story', hook_type: 'engagement', platform: 'instagram' },
  { id: 'p6', title: 'Conteúdo de Valor', format: 'Reel', hook_type: 'solution', platform: 'instagram' },
  { id: 'p7', title: 'Meme Viral', format: 'Static', hook_type: 'humor', platform: 'instagram' },
  { id: 'p8', title: 'Tutorial Rápido', format: 'Reel', hook_type: 'education', platform: 'instagram' },
  { id: 'p9', title: 'Depoimento', format: 'Static', hook_type: 'social-proof', platform: 'instagram' },
  { id: 'p10', title: 'Call to Action', format: 'Carousel', hook_type: 'cta', platform: 'instagram' },
]

const TEST_METRICS = [
  { id: 'm1', post_id: 'p1', platform: 'instagram', date: '2024-04-10', impressions: 5200, reach: 3500, likes: 450, comments: 85, shares: 25, saves: 120, link_clicks: 340 },
  { id: 'm2', post_id: 'p2', platform: 'instagram', date: '2024-04-11', impressions: 2100, reach: 1800, likes: 280, comments: 35, shares: 8,  saves: 45,  link_clicks: 85  },
  { id: 'm3', post_id: 'p3', platform: 'instagram', date: '2024-04-12', impressions: 8900, reach: 7200, likes: 920, comments: 180,shares: 95, saves: 310, link_clicks: 520 },
  { id: 'm4', post_id: 'p4', platform: 'instagram', date: '2024-04-13', impressions: 4500, reach: 3800, likes: 520, comments: 110,shares: 45, saves: 180, link_clicks: 250 },
  { id: 'm5', post_id: 'p5', platform: 'instagram', date: '2024-04-14', impressions: 3200, reach: 2900, likes: 320, comments: 60, shares: 15, saves: 90,  link_clicks: 120 },
  { id: 'm6', post_id: 'p6', platform: 'instagram', date: '2024-04-15', impressions: 7100, reach: 5900, likes: 750, comments: 145,shares: 85, saves: 250, link_clicks: 420 },
  { id: 'm7', post_id: 'p7', platform: 'instagram', date: '2024-04-16', impressions: 950,  reach: 820,  likes: 85,  comments: 12, shares: 3,  saves: 15,  link_clicks: 45  },
  { id: 'm8', post_id: 'p8', platform: 'instagram', date: '2024-04-17', impressions: 6200, reach: 5100, likes: 680, comments: 125,shares: 55, saves: 220, link_clicks: 380 },
  { id: 'm9', post_id: 'p9', platform: 'instagram', date: '2024-04-18', impressions: 3800, reach: 3200, likes: 420, comments: 75, shares: 35, saves: 140, link_clicks: 190 },
  { id: 'm10',post_id: 'p10',platform: 'instagram', date: '2024-04-19', impressions: 2500, reach: 2100, likes: 280, comments: 50, shares: 20, saves: 85,  link_clicks: 110 },
]

function injectData(tab) {
  return chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (key, posts, metrics) => {
      const existing = JSON.parse(localStorage.getItem(key) || '{}')
      const state = existing.state || {}
      state.posts   = [...(state.posts   || []), ...posts]
      state.metrics = [...(state.metrics || []), ...metrics]
      localStorage.setItem(key, JSON.stringify({ ...existing, state }))
      return true
    },
    args: [STORAGE_KEY, TEST_POSTS, TEST_METRICS],
  })
}

function showStatus(msg, type) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.className = 'status ' + type
}

document.getElementById('btnLoadAndOpen').addEventListener('click', async () => {
  const btn = document.getElementById('btnLoadAndOpen')
  btn.disabled = true
  btn.textContent = 'Carregando...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await injectData(tab)
    await chrome.tabs.create({ url: APP_URL + '/reports' })
    showStatus('✅ Dados carregados! Relatórios abertos.', 'success')
  } catch (e) {
    showStatus('Erro: ' + e.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '✅ Carregar Dados + Abrir Relatórios'
  }
})

document.getElementById('btnLoadOnly').addEventListener('click', async () => {
  const btn = document.getElementById('btnLoadOnly')
  btn.disabled = true
  btn.textContent = 'Carregando...'

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    await injectData(tab)
    showStatus('✅ Dados carregados! Recarregue a página.', 'success')
  } catch (e) {
    showStatus('Erro: ' + e.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '📥 Apenas Carregar Dados'
  }
})
