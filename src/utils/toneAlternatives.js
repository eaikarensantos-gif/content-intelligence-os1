import { extractJsonArray } from './aiJson.js'

const LS_KEY = 'cio-anthropic-key'

/**
 * Gera 3 alternativas de reescrita para um trecho sinalizado pelo Brand Linter.
 * Lógica compartilhada entre os painéis de linter (gate de salvamento e fixer inline).
 *
 * @param {string} match       Trecho sinalizado
 * @param {string} category    Categoria da violação
 * @param {string} suggestion  Explicação do problema
 * @returns {Promise<string[]|null>} Alternativas, ou null se não há API key
 */
export async function fetchToneAlternatives(match, category, suggestion) {
  const apiKey = localStorage.getItem(LS_KEY)
  if (!apiKey) return null

  const prompt = `Você é um consultor de tom de voz para Karen Santos, estrategista de conteúdo com posicionamento Premium/Analítico. Slogan: "Maturidade profissional na era da IA".

TOM: Direto, técnico, observacional, sem floreios. Fala como especialista — não como coach ou creator de massa.

O trecho abaixo foi sinalizado como violação de tom ("${category}"):
TRECHO ORIGINAL: "${match}"

Problema: ${suggestion}

Gere 3 alternativas concretas para reescrever APENAS a parte sinalizada, mantendo o sentido original mas no tom correto da Karen. As alternativas devem soar como uma pessoa real falando — não como IA, não como coach, não genérico.

Responda APENAS com JSON:
["alternativa 1", "alternativa 2", "alternativa 3"]`

  const res = await fetch('/api/ai?action=anthropic', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error('API error')
  const data = await res.json()
  const text = data.content?.[0]?.text || ''
  return extractJsonArray(text, 'No JSON')
}
