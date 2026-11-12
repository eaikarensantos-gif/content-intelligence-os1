// Normaliza a lista de publicações da API do Instagram (GET /me/media) para o
// seletor de post da tela de regras. Função pura, usada no servidor (api/ai.js)
// e testável isolada.

const TIPOS = { CAROUSEL_ALBUM: 'Carrossel', VIDEO: 'Vídeo', IMAGE: 'Imagem' }

export function mapearPublicacoes(items = []) {
  return items
    .filter((m) => m?.id)
    .map((m) => ({
      id: String(m.id),
      legenda: (m.caption || '').trim(),
      tipo: m.media_product_type === 'REELS' ? 'Reel' : TIPOS[m.media_type] || 'Publicação',
      // Em vídeo, media_url é o arquivo de vídeo, não uma imagem: só serve thumbnail_url.
      miniatura: m.thumbnail_url || (m.media_type === 'VIDEO' ? null : m.media_url) || null,
      link: m.permalink || null,
      data: m.timestamp || null,
    }))
}

export function legendaCurta(texto = '', max = 70) {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length > max ? `${limpo.slice(0, max - 1).trimEnd()}…` : limpo
}

// O servidor só baixa imagem de CDN do Instagram/Facebook, para a rota de leitura de cor não virar um proxy aberto.
const HOSTS_CDN = [/(^|\.)cdninstagram\.com$/, /(^|\.)fbcdn\.net$/]

export function urlDeImagemInstagram(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && !u.username && !u.password && HOSTS_CDN.some((re) => re.test(u.hostname))
  } catch {
    return false
  }
}
