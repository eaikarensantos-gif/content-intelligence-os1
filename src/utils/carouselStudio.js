export const CAROUSEL_STRUCTURES = {
  diagnostico: {
    label: 'Diagnóstico', alavanca: 'Compreensão e compartilhamento',
    desc: 'Explique o problema e entregue critérios para agir.',
    roles: ['Gancho', 'Situação concreta', 'Mecanismo', 'Exemplo', 'Consequências', 'Critérios de decisão', 'Aplicação', 'Conclusão'],
  },
  tutorial: {
    label: 'Tutorial com exemplo', alavanca: 'Aplicação e salvamento',
    desc: 'Ensine um processo executável, com demonstração e checklist.',
    roles: ['Resultado prometido', 'Pré-requisitos', 'Passo 1', 'Passo 2', 'Demonstração', 'Erro comum', 'Checklist', 'Conclusão'],
  },
  tese: {
    label: 'Tese argumentada', alavanca: 'Autoridade e discussão',
    desc: 'Defenda uma posição com argumentos, evidência e contraponto.',
    roles: ['Tese', 'Contexto', 'Argumento', 'Evidência ou exemplo hipotético', 'Contraponto', 'Limites da tese', 'Implicação prática', 'Conclusão'],
  },
}

export const CAROUSEL_GOALS = ['Ajudar a compreender', 'Ensinar a aplicar', 'Apoiar uma decisão', 'Abrir uma discussão']
export const CAROUSEL_TONES = ['Direto', 'Próximo', 'Provocativo']

export const CAROUSEL_SYSTEM = `Você escreve carrosséis profissionais de Karen Santos, com precisão, exemplos e julgamento próprio.
Siga a estrutura solicitada. O formato define a progressão; o tom só muda a linguagem.
Planeje a promessa, a função de cada slide e a conclusão antes de redigir. Entregue apenas o JSON final.
A capa comunica uma promessa específica. O segundo slide confirma seu valor. Cada slide acrescenta informação.
Desenvolva mecanismo, exemplo, critério ou aplicação. Não entregue uma sequência de aforismos sobre a mesma tensão.
Entregue a promessa no fechamento. Uma pergunta pode abrir conversa depois da conclusão, nunca substituí-la.
Não force suspense, CTA binário, sofrimento ou indignação. Não prometa viralização nem taxas de engajamento.
Use título curto e corpo legível: em geral 20–50 palavras nos slides de desenvolvimento, sem preencher por preencher.
Alterne explicação com comparação, demonstração, checklist ou esquema visual quando útil.
Não invente estatísticas, fontes, experiências de Karen, clientes, resultados ou intenção de terceiros.
Só atribua fatos a fontes fornecidas. Sem fonte, use exemplo explicitamente hipotético ou sinalize a lacuna em pendencias.
Um caso hipotético ilustra um argumento, mas não comprova uma tese. Explicite esse limite.
Preserve nuances e a voz da autora. A legenda complementa o carrossel. Convites finais são opcionais e adequados ao objetivo.
Revise se cada slide avança, se o exemplo é concreto, se a tese admite limites e se o final entrega a abertura.`

export function buildProfessionalCarouselPrompt({ tema, ideia, texto, gerarIdeia, gerarTexto, structure = 'diagnostico', goal = CAROUSEL_GOALS[0], tone = CAROUSEL_TONES[0], audience = '' }) {
  const selected = CAROUSEL_STRUCTURES[structure] || CAROUSEL_STRUCTURES.diagnostico
  return `TEMA: ${tema}
PÚBLICO: ${audience || 'Inferir pelo tema, sem inventar características pessoais.'}
OBJETIVO: ${goal}
TOM: ${tone}
FORMATO: ${selected.label}
IDEIA: ${gerarIdeia ? 'Proponha um recorte específico.' : ideia || 'Defina um recorte específico para o tema.'}
MATERIAL FORNECIDO: ${gerarTexto ? 'Crie uma explicação com exemplos hipotéticos identificados; não invente relatos reais.' : texto || 'Sem fontes fornecidas. Não invente evidências.'}
Gere UMA versão completa com exatamente 8 slides, seguindo estas funções em ordem:
${selected.roles.map((role, index) => `${index + 1}. ${role}`).join('\n')}
Cada slide tem numero, funcao (exatamente como acima), titulo, texto e visual (orientação concreta de composição, não texto adicional obrigatório).
Responda exclusivamente com JSON válido neste formato:
${JSON.stringify({ versao_principal: { slides: selected.roles.map((funcao, i) => ({ numero: i + 1, funcao, titulo: 'Título específico', texto: 'Conteúdo desenvolvido', visual: 'Composição visual sugerida' })), pergunta_final: '' }, legenda: 'Complemento útil, sem repetir todos os slides.', pendencias: ['Liste apenas fatos ou fontes que ainda precisam ser confirmados; use [] quando não houver.'] })}`
}

export function validateCarouselResult(result, structure) {
  const roles = CAROUSEL_STRUCTURES[structure]?.roles
  const slides = result?.versao_principal?.slides
  if (!roles || !Array.isArray(slides) || slides.length !== roles.length) throw new Error('A resposta precisa conter os 8 slides da estrutura escolhida. Gere novamente.')
  slides.forEach((slide, index) => {
    if (slide?.numero !== index + 1 || slide.funcao !== roles[index] || ['titulo', 'texto', 'visual'].some(key => typeof slide[key] !== 'string' || !slide[key].trim())) {
      throw new Error(`O slide ${index + 1} veio incompleto ou fora da estrutura. Gere novamente.`)
    }
  })
  if (typeof result.legenda !== 'string' || !result.legenda.trim() || typeof result.versao_principal.pergunta_final !== 'string' || !Array.isArray(result.pendencias) || result.pendencias.some(p => typeof p !== 'string')) {
    throw new Error('A resposta veio sem legenda ou com revisão incompleta. Gere novamente.')
  }
}

// Heurísticas locais: sinalizam pontos de revisão, sem certificar qualidade ou veracidade.
export function reviewCarousel(result) {
  const slides = result?.versao_principal?.slides || []
  const findings = []
  const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').trim()
  slides.forEach((slide, index) => {
    const text = slide.texto || ''
    const count = text.trim().split(/\s+/).filter(Boolean).length
    if (index > 0 && index < slides.length - 1 && count < 20) findings.push(`Slide ${slide.numero}: desenvolvimento curto. Confira se explica, exemplifica ou entrega um critério.`)
    if (count > 65) findings.push(`Slide ${slide.numero}: texto longo para leitura no celular. Considere resumir ou usar um esquema.`)
    const tokens = new Set(normalize(text).split(/\s+/).filter(w => w.length > 3))
    const duplicate = slides.slice(0, index).find(previous => {
      if (normalize(previous.texto || '') === normalize(text)) return true
      const other = new Set(normalize(previous.texto || '').split(/\s+/).filter(w => w.length > 3))
      const union = new Set([...tokens, ...other]).size
      return union > 0 && [...tokens].filter(w => other.has(w)).length / union > 0.7
    })
    if (duplicate) findings.push(`Slides ${duplicate.numero} e ${slide.numero}: possível repetição. Acrescente uma informação nova.`)
  })
  return [...findings, ...(result?.pendencias || []).map(p => `Conferir antes de publicar: ${p}`)]
}

// Older saved slides only have numero/texto; keep them readable and exportable.
export function formatCarouselSlide(slide, includeVisual = false) {
  return [`[${slide.numero}]${slide.titulo ? ` ${slide.titulo}` : ''}`, slide.texto, includeVisual && slide.visual ? `Visual: ${slide.visual}` : ''].filter(Boolean).join('\n')
}
