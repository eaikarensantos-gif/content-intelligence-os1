/**
 * Builds AI context from brand voice + dislike history.
 * Used by all content generators for consistent, improving output.
 */

export function buildVoiceContext(brandVoice, dislikedContent = [], bannedWords = []) {
  let ctx = ''

  if (bannedWords?.length > 0) {
    ctx += `\n\nPALAVRAS/EXPRESSÕES PROIBIDAS (NUNCA use estas palavras ou variações delas no conteúdo gerado):\n${bannedWords.map(w => `- "${w}"`).join('\n')}\nEsta é uma regra ABSOLUTA. O criador baniu essas palavras permanentemente.\n`
  }

  if (brandVoice?.prompt) {
    ctx += `\n\nIDENTIDADE E VOZ DO CRIADOR:\n${brandVoice.prompt}\n`
  }

  if (brandVoice?.calibration) {
    const c = brandVoice.calibration
    ctx += `\nCALIBRAÇÃO DE VOZ (extraída de posts reais do criador):\n`
    if (c.abertura_padrao) ctx += `- Padrão de abertura: ${c.abertura_padrao}\n`
    if (c.estrutura_narrativa) ctx += `- Estrutura narrativa: ${c.estrutura_narrativa}\n`
    if (c.tom_linguistico) ctx += `- Tom: ${c.tom_linguistico}\n`
    if (c.padrao_cta) ctx += `- CTA/Fechamento: ${c.padrao_cta}\n`
    if (c.elementos_transversais?.length) ctx += `- Elementos-chave: ${c.elementos_transversais.join(', ')}\n`
    if (c.palavras_frequentes?.length) ctx += `- Vocabulário frequente: ${c.palavras_frequentes.join(', ')}\n`
    ctx += `\nUse estes padrões para manter autenticidade na voz.\n`
  }

  if (dislikedContent.length > 0) {
    const recent = dislikedContent.slice(-15)
    const patterns = recent.map(d => {
      const parts = []
      if (d.title) parts.push(`título: "${d.title}"`)
      if (d.reason) parts.push(`motivo: ${d.reason}`)
      if (d.hook) parts.push(`gancho: "${d.hook}"`)
      return parts.join(', ')
    })
    ctx += `\nCONTEÚDOS REJEITADOS PELO CRIADOR (NUNCA repetir esses padrões):\n${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`
    ctx += `\nREGRA: Analise os padrões rejeitados acima e EVITE abordagens similares. O criador está buscando algo diferente.\n`
  }

  return ctx
}

export function buildRegenerateInstruction(attempt = 0) {
  const variations = [
    'Use um tom COMPLETAMENTE diferente da geração anterior. Mude a abertura, o ângulo, a metáfora e a estrutura.',
    'Reinvente totalmente. Use uma abordagem OPOSTA: se antes foi reflexivo, seja provocativo. Se foi lista, use storytelling. Surpreenda.',
    'Pense fora da caixa. Use referências culturais, dados surpreendentes ou uma perspectiva contraintuitiva que ninguém esperaria.',
    'Vá pelo caminho mais inesperado. Use humor, ironia inteligente, ou uma confissão pessoal. Quebre o padrão.',
    'Foque em uma dor ESPECÍFICA e real. Nada genérico. Conte uma micro-história ou use um exemplo concreto que gere identificação.',
  ]
  return `\n\nINSTRUÇÃO CRÍTICA DE VARIAÇÃO (tentativa ${attempt + 1}): ${variations[attempt % variations.length]}\nNUNCA repita títulos, ganchos ou estruturas de gerações anteriores.\n`
}
