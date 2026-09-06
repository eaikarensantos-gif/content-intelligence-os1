// Vercel Serverless Function — proxy para a API REST do Figma.
// Routing (action via body.action):
//   'list-frames'   → lista páginas + frames de topo de um arquivo (GET /v1/files/:key?depth=2)
//   'render-frames' → renderiza frames escolhidos como PNG e devolve como data URL
//                     (o cliente sobe cada um pro Supabase Storage, igual a um upload manual)

async function figmaFetch(path, token) {
  const res = await fetch(`https://api.figma.com/v1${path}`, {
    headers: { 'X-Figma-Token': token },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.err || data.message || `Figma API error ${res.status}`)
  }
  return data
}

function extractFileKey(input) {
  const trimmed = (input || '').trim()
  if (!trimmed) return ''
  const urlMatch = trimmed.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
  if (urlMatch) return urlMatch[1]
  return trimmed // já era o file key
}

const FRAME_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'SECTION'])

async function listFrames(figmaToken, fileKeyInput) {
  const fileKey = extractFileKey(fileKeyInput)
  if (!fileKey) throw new Error('Link ou file key do Figma inválido.')

  const data = await figmaFetch(`/files/${fileKey}?depth=2`, figmaToken)
  const pages = (data.document?.children || [])
    .filter((page) => page.type === 'CANVAS')
    .map((page) => ({
      id: page.id,
      name: page.name,
      frames: (page.children || [])
        .filter((node) => FRAME_TYPES.has(node.type))
        .map((node) => ({
          id: node.id,
          name: node.name,
          width: Math.round(node.absoluteBoundingBox?.width || 0),
          height: Math.round(node.absoluteBoundingBox?.height || 0),
        })),
    }))
    .filter((page) => page.frames.length > 0)

  return { fileKey, fileName: data.name || '', pages }
}

async function renderFrames(figmaToken, fileKeyInput, nodeIds) {
  const fileKey = extractFileKey(fileKeyInput)
  if (!fileKey) throw new Error('Link ou file key do Figma inválido.')
  if (!nodeIds?.length) throw new Error('Selecione ao menos um frame.')

  const data = await figmaFetch(
    `/images/${fileKey}?ids=${nodeIds.map(encodeURIComponent).join(',')}&format=png&scale=2`,
    figmaToken,
  )
  if (data.err) throw new Error(data.err)

  const images = []
  for (const nodeId of nodeIds) {
    const url = data.images?.[nodeId]
    if (!url) continue
    const imgRes = await fetch(url)
    if (!imgRes.ok) continue
    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    images.push({ nodeId, dataUrl: `data:image/png;base64,${base64}` })
  }
  return { images }
}

// ─── CORS (mesma política do api/ai.js) ───────────────────────────────────────

function isAllowedOrigin(origin) {
  if (!origin) return false
  const extra = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)
  if (extra.includes(origin)) return true
  try {
    const { hostname, protocol } = new URL(origin)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (hostname.endsWith('.vercel.app')) return true
  } catch { return false }
  return false
}

function applyCors(req, res) {
  const origin = req.headers.origin
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  return isAllowedOrigin(origin)
}

export default async function handler(req, res) {
  const originAllowed = applyCors(req, res)
  if (req.method === 'OPTIONS') return res.status(originAllowed ? 200 : 403).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })
  if (req.headers.origin && !originAllowed) return res.status(403).json({ error: 'Origin not allowed' })

  const { action, figmaToken, fileKey, nodeIds } = req.body || {}
  if (!figmaToken?.trim()) return res.status(400).json({ error: 'Token de acesso do Figma é obrigatório.' })

  try {
    if (action === 'list-frames') {
      if (!fileKey?.trim()) return res.status(400).json({ error: 'Link ou file key do arquivo é obrigatório.' })
      const result = await listFrames(figmaToken.trim(), fileKey)
      return res.status(200).json(result)
    }

    if (action === 'render-frames') {
      if (!fileKey?.trim()) return res.status(400).json({ error: 'Link ou file key do arquivo é obrigatório.' })
      const result = await renderFrames(figmaToken.trim(), fileKey, nodeIds)
      return res.status(200).json(result)
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Figma request failed' })
  }
}
