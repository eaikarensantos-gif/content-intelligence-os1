// api/renderVideo.js — renderização via Shotstack (https://shotstack.io)
// Variável de ambiente necessária: SHOTSTACK_KEY

const SHOTSTACK_BASE = 'https://api.shotstack.io/edit/v1'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { videoUrl, cuts, videoDuration } = req.body

  if (!videoUrl || !cuts) {
    return res.status(400).json({ error: 'videoUrl e cuts são obrigatórios' })
  }

  try {
    // PASSO 1 — Inverte os cortes: monta os segmentos que FICAM
    const segments = buildSegments(cuts)

    // PASSO 2 — Monta o timeline do Shotstack
    const payload = buildTimeline(videoUrl, segments, videoDuration)

    // PASSO 3 — Envia para renderização
    const { id } = await submitRender(payload)

    // PASSO 4 — Polling até completar (máx 5 minutos)
    const result = await pollUntilDone(id)

    // PASSO 5 — Retorna URL do vídeo final
    res.json({
      downloadUrl: result.url,
      filename: `video-editado-${id}.mp4`,
      size: result.filesize || null,
    })

  } catch (error) {
    console.error('Erro na renderização:', error)
    res.status(500).json({ error: error.message })
  }
}

// ─── Inverte os cortes ────────────────────────────────────────────────────────
// cuts = [{ start: 5.2, end: 8.1 }, { start: 15.0, end: 17.3 }]
// O que remove: 5.2→8.1 e 15.0→17.3
// O que fica:   0→5.2, 8.1→15.0, 17.3→fim

function buildSegments(cuts) {
  const segments = []
  let cursor = 0

  for (const cut of cuts) {
    if (cursor < cut.start) {
      segments.push({ start: cursor, end: cut.start })
    }
    cursor = cut.end
  }

  // Segmento final — do último corte até o fim do vídeo
  segments.push({ start: cursor, end: null })

  return segments
}

// ─── Monta o timeline do Shotstack ───────────────────────────────────────────
// Cada segmento vira um clip com trim (ponto de entrada no vídeo original)
// e length (duração do trecho). O último segmento usa videoDuration ou 3600s
// como fallback seguro — o Shotstack clipla no fim real do vídeo.

function buildTimeline(videoUrl, segments, videoDuration) {
  let timelineCursor = 0

  const clips = segments.map((seg) => {
    const duration = seg.end != null
      ? seg.end - seg.start
      : (videoDuration != null ? videoDuration - seg.start : 3600)

    const clip = {
      asset: {
        type: 'video',
        src: videoUrl,
        trim: seg.start,
      },
      start: timelineCursor,
      length: duration,
    }

    timelineCursor += duration
    return clip
  })

  return {
    timeline: {
      tracks: [{ clips }],
    },
    output: {
      format: 'mp4',
      resolution: 'original',
    },
  }
}

// ─── Envia para o Shotstack ───────────────────────────────────────────────────

async function submitRender(payload) {
  const response = await fetch(`${SHOTSTACK_BASE}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SHOTSTACK_KEY,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.message || `Shotstack error ${response.status}`)
  }

  const data = await response.json()
  return data.response // { id, message, success }
}

// ─── Polling ──────────────────────────────────────────────────────────────────
// Checa o status a cada 3 segundos
// Status possíveis: queued → fetching → rendering → saving → done | failed

async function pollUntilDone(renderId, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000)

    const response = await fetch(`${SHOTSTACK_BASE}/render/${renderId}`, {
      headers: { 'x-api-key': process.env.SHOTSTACK_KEY },
    })

    const data = await response.json()
    const render = data.response

    if (render.status === 'done') return render
    if (render.status === 'failed') {
      throw new Error(`Shotstack falhou: ${render.error || 'erro desconhecido'}`)
    }

    // queued / fetching / rendering / saving — continua polling
  }

  throw new Error('Timeout: renderização demorou mais de 5 minutos')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
