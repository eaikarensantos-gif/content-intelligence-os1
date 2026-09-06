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

// ─── Leitura das camadas de texto reais do frame (posição, fonte, cor) ───────
// Em vez de inventar 2 zonas genéricas, lemos a estrutura real do Figma —
// cada camada de tipo TEXT vira candidata a zona de título/subtítulo, na
// posição e estilo exatos definidos no design.

function solidFill(fills) {
  return (fills || []).find((f) => f.type === 'SOLID' && f.visible !== false) || null
}

function figmaColorToCss({ r, g, b, a = 1 }) {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
}

function collectTextLayers(node, frameBox, out) {
  if (node.type === 'TEXT' && node.visible !== false && node.absoluteBoundingBox && node.characters?.trim()) {
    const box = node.absoluteBoundingBox
    const fill = solidFill(node.fills)
    out.push({
      fontSize: node.style?.fontSize || 24,
      align: node.style?.textAlignHorizontal === 'CENTER' ? 'center' : 'left',
      color: fill ? figmaColorToCss(fill.color) : '#1a1a1a',
      xPct: ((box.x - frameBox.x) / frameBox.width) * 100,
      yPct: ((box.y - frameBox.y) / frameBox.height) * 100,
      wPct: (box.width / frameBox.width) * 100,
      hPct: (box.height / frameBox.height) * 100,
    })
  }
  for (const child of node.children || []) collectTextLayers(child, frameBox, out)
}

// Devolve, por frame: a cor de fundo do próprio frame (pra "apagar" o texto
// placeholder original antes de escrever o texto gerado por cima) e as 2
// camadas de texto de maior fonte, viradas zona de título/subtítulo.
async function fetchFrameDetails(figmaToken, fileKey, nodeIds) {
  const data = await figmaFetch(`/files/${fileKey}/nodes?ids=${nodeIds.map(encodeURIComponent).join(',')}`, figmaToken)
  const details = {}
  for (const nodeId of nodeIds) {
    const doc = data.nodes?.[nodeId]?.document
    if (!doc?.absoluteBoundingBox) continue
    const frameBox = doc.absoluteBoundingBox
    const bgFill = solidFill(doc.fills)
    const textLayers = []
    collectTextLayers(doc, frameBox, textLayers)
    textLayers.sort((a, b) => b.fontSize - a.fontSize)

    const toZone = (layer) => layer && {
      xPct: layer.xPct, yPct: layer.yPct, wPct: layer.wPct, hPct: layer.hPct,
      color: layer.color, align: layer.align,
    }
    details[nodeId] = {
      backgroundColor: bgFill ? figmaColorToCss(bgFill.color) : null,
      headline: toZone(textLayers[0]) || null,
      subtext: toZone(textLayers[1]) || null,
    }
  }
  return details
}

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

  const [imageData, frameDetails] = await Promise.all([
    figmaFetch(`/images/${fileKey}?ids=${nodeIds.map(encodeURIComponent).join(',')}&format=png&scale=2`, figmaToken),
    fetchFrameDetails(figmaToken, fileKey, nodeIds),
  ])
  if (imageData.err) throw new Error(imageData.err)

  const images = []
  for (const nodeId of nodeIds) {
    const url = imageData.images?.[nodeId]
    if (!url) continue
    const imgRes = await fetch(url)
    if (!imgRes.ok) continue
    const buffer = await imgRes.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const details = frameDetails[nodeId] || {}
    images.push({
      nodeId,
      dataUrl: `data:image/png;base64,${base64}`,
      headline: details.headline || null,
      subtext: details.subtext || null,
      backgroundColor: details.backgroundColor || null,
    })
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
