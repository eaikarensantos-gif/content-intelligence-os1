export async function generateMoreStoryPrompts(apiKey, { existing, count = 8 }) {
  const prompt = `Você ajuda criadores de conteúdo brasileiros a manter uma rotina de Stories no Instagram sem depender de roteiro pronto.

Gere ${count} ideias novas de Stories no MESMO estilo das já existentes abaixo: cada ideia é um convite curto (frase ou pergunta, poucas palavras) para a pessoa gravar falando na hora, sobre a própria rotina, trabalho ou bastidores — nunca um roteiro completo, nunca um tema genérico de "dica de conteúdo".

IDEIAS JÁ EXISTENTES (não repita, nem parafraseie):
${existing.map((p) => `- ${p}`).join('\n')}

REGRAS:
- Português brasileiro, tom direto e pessoal, sem clichê de coach ("jornada", "propósito", "vibe", "diquinhas")
- Cada ideia com no máximo 12 palavras
- Foco em bastidores reais, rotina, opinião rápida, processo de decisão — não em "dicas" ou "listas"

Responda SOMENTE com um array JSON de strings, sem markdown e sem texto antes ou depois:
["ideia 1", "ideia 2", ...]`

  const res = await fetch('/api/ai?action=openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,

    },
    body: JSON.stringify({
      model: 'gpt-5.6-terra',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
      max_tokens: 1200,
      system: 'You are a Brazilian content strategist writing short, natural Story prompts. Respond ONLY with a valid JSON array of strings. No markdown, no code blocks, no text before or after.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const { handleApiError } = await import('./apiError.js')
    await handleApiError(res)
  }

  const data = await res.json()
  const raw = data.content?.find((b) => b.type === 'text')?.text || ''
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Resposta da IA não contém uma lista válida')
  return JSON.parse(match[0])
}
