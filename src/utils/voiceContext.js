/**
 * Builds AI context from brand voice + dislike history.
 * Used by all content generators for consistent, improving output.
 */

// Bloco de frases banidas — compartilhado por todos os geradores do Studio
// (Studio Livre, Reels, Carrossel, Stories), não só pelo que já usava
// buildVoiceContext. A lista é da Karen, cresce com o botão "Banir" em
// qualquer aba, e essa é a única redação do bloco no app.
export function buildBannedWordsBlock(bannedWords = []) {
  if (!bannedWords?.length) return ''
  return `\n\nPALAVRAS/EXPRESSÕES PROIBIDAS (NUNCA use estas palavras ou variações delas no conteúdo gerado):\n${bannedWords.map(w => `- "${w}"`).join('\n')}\nEsta é uma regra ABSOLUTA. O criador baniu essas palavras permanentemente.\n`
}

/**
 * Bloco do Posicionamento (âncora, públicos, concorrência, pilares, teste de
 * coerência, trade-off) — a fonte única editada em /posicionamento. A lista
 * negra fica de fora daqui porque já entra via buildBannedWordsBlock, com sua
 * própria seção — os dois blocos ficam concatenados por buildVoiceContext.
 */
export function buildPositioningBlock(posicionamento) {
  if (!posicionamento) return ''
  let ctx = ''

  if (posicionamento.ancora?.trim()) {
    ctx += `\n\nPOSICIONAMENTO — ÂNCORA (a ideia central que todo conteúdo deve reforçar):\n${posicionamento.ancora.trim()}\n`
  }

  if (posicionamento.publicos?.length) {
    ctx += `\nPÚBLICOS:\n${posicionamento.publicos.map(p =>
      `- ${p.nome || 'Sem nome'} (${p.papel === 'nucleo' ? 'núcleo' : 'topo de funil'})${p.descricao ? `: ${p.descricao}` : ''}`
    ).join('\n')}\n`
  }

  if (posicionamento.concorrencia_espaco_vago?.trim()) {
    ctx += `\nCONCORRÊNCIA / ESPAÇO VAGO (o que os outros fazem, e o espaço que sobra):\n${posicionamento.concorrencia_espaco_vago.trim()}\n`
  }

  if (posicionamento.pilares?.length) {
    ctx += `\nPILARES DE CONTEÚDO:\n${posicionamento.pilares.map(p => {
      const parts = [p.nome || 'Pilar sem nome']
      if (p.objetivo) parts.push(`objetivo: ${p.objetivo}`)
      if (p.gancho_tipico) parts.push(`gancho típico: ${p.gancho_tipico}`)
      return `- ${parts.join(' — ')}`
    }).join('\n')}\n`
  }

  if (posicionamento.trade_off?.trim()) {
    ctx += `\nTRADE-OFF ACEITO (não se desvie por atalho que contradiga isso):\n${posicionamento.trade_off.trim()}\n`
  }

  if (posicionamento.teste_coerencia?.trim()) {
    ctx += `\nTESTE DE COERÊNCIA — todo conteúdo gerado deve responder SIM a esta pergunta:\n"${posicionamento.teste_coerencia.trim()}"\n`
  }

  return ctx
}

export function buildVoiceContext(brandVoice, dislikedContent = [], bannedWords = [], posicionamento = null) {
  let ctx = ''

  ctx += buildBannedWordsBlock(bannedWords)
  ctx += buildPositioningBlock(posicionamento)

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

    const allPatterns = [...new Set(recent.flatMap(d => d.patterns || []).filter(Boolean))]
    if (allPatterns.length > 0) {
      ctx += `\nPADRÕES DETECTADOS E REPROVADOS — nunca use:\n${allPatterns.map(p => `- "${p}"`).join('\n')}\n`
    }

    const hooks = recent.map(d => d.hook).filter(Boolean)
    if (hooks.length > 0) {
      ctx += `\nGANCHOS REPROVADOS — evite estruturas similares:\n${hooks.slice(0, 5).map(h => `- "${h.slice(0, 80)}"`).join('\n')}\n`
    }

    const items = recent.map(d => {
      const parts = []
      if (d.title) parts.push(`título: "${d.title}"`)
      if (d.reason) parts.push(`motivo: ${d.reason}`)
      return parts.join(', ')
    }).filter(Boolean)
    if (items.length > 0) {
      ctx += `\nCONTEÚDOS REJEITADOS PELO CRIADOR (NUNCA repetir esses padrões):\n${items.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`
    }

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
