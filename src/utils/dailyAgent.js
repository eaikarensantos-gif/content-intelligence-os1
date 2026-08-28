// src/utils/dailyAgent.js
// Agente diário — gera 5 ideias às 10h e joga direto no store
// Sem dependências externas. Usa a mesma API key já salva no app.

const LS_KEY = 'cio-openai-key'
const LS_DAILY_PREFIX = 'cio-daily-agent-'

// Fallback: usado só quando /posicionamento ainda não tem pilares definidos.
const PILARES = [
  'transição CLT para PJ solo',
  'identidade profissional na era da IA',
  'como cobrar e precificar como consultora',
  'IA aplicada no trabalho real (não hype)',
  'bastidores de consultoria de UX e produto',
  'erros financeiros de quem virou PJ',
  'Samsung Galaxy AI e IA em dispositivos',
  'maturidade profissional sem performance',
]

function getTodayKey() {
  return LS_DAILY_PREFIX + new Date().toISOString().slice(0, 10)
}

export function getDailyAgentStatus() {
  const key = getTodayKey()
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function clearDailyAgentStatus() {
  localStorage.removeItem(getTodayKey())
}

export async function runDailyIdeasAgent(posicionamento = null) {
  const apiKey = localStorage.getItem(LS_KEY)
  if (!apiKey) throw new Error('API key não encontrada. Configure em Configurações.')

  // Pega 3 pilares aleatórios do dia pra variar — prioriza os pilares reais
  // cadastrados em /posicionamento, caindo pro fallback só se não houver nenhum.
  const nomesPilares = posicionamento?.pilares?.length
    ? posicionamento.pilares.map(p => p.nome).filter(Boolean)
    : PILARES
  const shuffled = [...nomesPilares].sort(() => Math.random() - 0.5)
  const pilaresDoDia = shuffled.slice(0, Math.min(3, shuffled.length)).join(', ')

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  const prompt = `Você é o agente de ideias de conteúdo da Karen Santos.

Karen Santos: consultora sênior de UX e estratégia de produto, especialista em IA para negócios, opera como PJ solo no Brasil. Clientes: Samsung (Galaxy AI), Banco do Brasil, Contabilizei, Oral-B. Audiência: profissionais em transição CLT→PJ e pessoas navegando a era da IA.

Hoje é ${today}. Pilares do dia: ${pilaresDoDia}.

Gere 5 ideias de conteúdo para o Instagram ou LinkedIn da Karen. Cada ideia deve:
- Ter título direto, sem clickbait, sem superlativo
- Ser específica (dado, situação concreta, ângulo claro)
- Soar como algo que uma consultora sênior falaria, não um coach motivacional
- Ter um hook de abertura que cria tensão real

PROIBIDO nos títulos: "Incrível", "Chocante", "Nunca", "Sempre", "Segredo", "Dica", "Transformação", "Mindset", frases genéricas.

Retorne SOMENTE JSON válido, sem markdown, sem explicações:
{
  "ideas": [
    {
      "title": "...",
      "description": "...",
      "hook": "primeira frase de abertura do conteúdo",
      "format": "carrossel|reel|artigo|thread",
      "platform": "instagram|linkedin",
      "priority": "high|medium|low",
      "topic": "pilar temático"
    }
  ]
}`

  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,

    },
    body: JSON.stringify({
      model: 'gpt-5.6-luna',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.find(b => b.type === 'text')?.text || ''
  const clean = text.replace(/```json|```/gi, '').trim()

  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Resposta inválida da API')
    parsed = JSON.parse(match[0])
  }

  if (!Array.isArray(parsed?.ideas)) throw new Error('Formato inesperado na resposta')

  const ideas = parsed.ideas.map((idea) => ({
    ...idea,
    platforms: [idea.platform || 'instagram'],
    tags: ['agente-diário', idea.topic].filter(Boolean).map(t =>
      t.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    ),
    status: 'agent',
    content_type: 'organic',
    scheduled_date: '',
    source: 'daily-agent',
  }))

  // Persiste status no localStorage
  const status = {
    ranAt: new Date().toISOString(),
    count: ideas.length,
    pilares: pilaresDoDia,
  }
  localStorage.setItem(getTodayKey(), JSON.stringify(status))

  return ideas
}
