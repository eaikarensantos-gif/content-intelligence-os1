// api/renderVideo.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { videoUrl, cuts } = req.body

  if (!videoUrl || !cuts) {
    return res.status(400).json({ error: 'videoUrl e cuts são obrigatórios' })
  }

  try {
    // PASSO 1 — Monta o comando FFmpeg com os cortes
    const ffmpegCommand = buildFFmpegCommand(videoUrl, cuts)

    // PASSO 2 — Cria a task no FFhub
    const taskResponse = await fetch('https://api.ffhub.io/v1/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FFHUB_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command: ffmpegCommand })
    })

    const { task_id } = await taskResponse.json()

    // PASSO 3 — Polling até completar (máx 5 minutos)
    const result = await pollUntilDone(task_id)

    // PASSO 4 — Retorna URL do vídeo final
    res.json({
      downloadUrl: result.outputs[0].url,
      filename: result.outputs[0].filename,
      size: result.outputs[0].size
    })

  } catch (error) {
    console.error('Erro na renderização:', error)
    res.status(500).json({ error: error.message })
  }
}

// ─── Monta o comando FFmpeg ───────────────────────────────────────────────────
// Recebe os cortes e constrói um comando que preserva
// só o que FICA — inverte a lógica dos cortes

function buildFFmpegCommand(videoUrl, cuts) {
  // cuts = [{ start: 5.2, end: 8.1 }, { start: 15.0, end: 17.3 }]
  // Isso significa: remover 5.2→8.1 e 15.0→17.3
  // O que fica: 0→5.2, 8.1→15.0, 17.3→fim

  if (!cuts || cuts.length === 0) {
    // Sem cortes — só reencoda
    return `ffmpeg -i "${videoUrl}" -c:v libx264 -preset fast -c:a aac output.mp4`
  }

  // Monta os segmentos que ficam usando o filtro select + concat
  // Exemplo com 2 cortes gera 3 segmentos
  const segments = []
  let cursor = 0

  cuts.forEach((cut, i) => {
    if (cursor < cut.start) {
      segments.push({ start: cursor, end: cut.start })
    }
    cursor = cut.end
  })

  // Adiciona o segmento final (do último corte até o fim)
  segments.push({ start: cursor, end: null })

  // Monta o filtro concat do FFmpeg
  const filterParts = segments.map((seg, i) => {
    const trimEnd = seg.end ? `:end=${seg.end}` : ''
    return `[0:v]trim=start=${seg.start}${trimEnd},setpts=PTS-STARTPTS[v${i}]; ` +
           `[0:a]atrim=start=${seg.start}${trimEnd},asetpts=PTS-STARTPTS[a${i}]`
  })

  const concatInputs = segments.map((_, i) => `[v${i}][a${i}]`).join('')
  const concatFilter = `${concatInputs}concat=n=${segments.length}:v=1:a=1[outv][outa]`

  const fullFilter = [...filterParts, concatFilter].join('; ')

  return `ffmpeg -i "${videoUrl}" -filter_complex "${fullFilter}" ` +
         `-map "[outv]" -map "[outa]" -c:v libx264 -preset fast -c:a aac output.mp4`
}

// ─── Polling ──────────────────────────────────────────────────────────────────
// Checa o status a cada 3 segundos
// Desiste após 5 minutos (100 tentativas)

async function pollUntilDone(taskId, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000)

    const response = await fetch(`https://api.ffhub.io/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${process.env.FFHUB_KEY}` }
    })

    const task = await response.json()

    if (task.status === 'completed') {
      return task
    }

    if (task.status === 'failed') {
      throw new Error(`FFhub falhou: ${task.error || 'erro desconhecido'}`)
    }

    // status pending ou running — continua polling
  }

  throw new Error('Timeout: renderização demorou mais de 5 minutos')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
