// src/lib/coherenceCheck.js
// Verificador de coerência do Posicionamento: manda um rascunho + o
// direcional pra IA e pede um veredito não-bloqueante — o criador decide,
// a checagem só avisa. Complementa a varredura determinística (clicheSweep):
// aquela pega estrutura e frase banida; esta julga se o CONTEÚDO em si
// reforça ou dilui o posicionamento — algo que regex não responde.

import { buildPositioningBlock } from '../utils/voiceContext'

export async function checkCoherence(apiKey, text, posicionamento) {
  if (!apiKey?.trim()) throw new Error('Nenhuma chave de API configurada.')
  if (!text?.trim()) throw new Error('Nada pra checar — o rascunho está vazio.')

  const positioningBlock = buildPositioningBlock(posicionamento)
  const testeCoerencia = posicionamento?.teste_coerencia?.trim()
    || 'Esse conteúdo reforça ou dilui o posicionamento descrito abaixo?'

  const prompt = `Você é um editor crítico que avalia coerência de posicionamento de marca. Leia o POSICIONAMENTO e o RASCUNHO abaixo e responda EXCLUSIVAMENTE com um JSON válido, sem texto fora do JSON.

POSICIONAMENTO:${positioningBlock || '\n(nenhum posicionamento configurado — avalie com bom senso)'}

RASCUNHO:
"""
${text.trim()}
"""

PERGUNTA DE COERÊNCIA A RESPONDER: "${testeCoerencia}"

Responda neste formato exato:
{
  "veredito": "aumenta" | "dilui" | "neutro",
  "justificativa": "<uma frase direta explicando o veredito>",
  "frases_lista_negra_encontradas": ["<frase da lista negra que aparece no rascunho, se houver>"],
  "ajustes": ["<ajuste concreto 1>", "<ajuste concreto 2 (opcional)>", "<ajuste concreto 3 (opcional)>"]
}

Regras: "aumenta" só se o rascunho reforça claramente a âncora/pilares. "dilui" se genérico, foge do posicionamento ou usa frase da lista negra. "neutro" se não ajuda nem atrapalha. ajustes: no máximo 3, concretos e acionáveis — nada de "seja mais autêntico".`

  const res = await fetch('/api/ai?action=anthropic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      thinking: { type: 'disabled' },
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Erro ${res.status}`)
  }

  const data = await res.json()
  const jsonText = data.content?.[0]?.text || ''
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta inválida da IA')

  const parsed = JSON.parse(jsonMatch[0])
  return {
    veredito: parsed.veredito === 'aumenta' || parsed.veredito === 'dilui' ? parsed.veredito : 'neutro',
    justificativa: parsed.justificativa || '',
    frases_lista_negra_encontradas: Array.isArray(parsed.frases_lista_negra_encontradas) ? parsed.frases_lista_negra_encontradas : [],
    ajustes: Array.isArray(parsed.ajustes) ? parsed.ajustes.slice(0, 3) : [],
  }
}
