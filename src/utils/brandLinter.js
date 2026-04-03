/**
 * Brand Linter — Anti-Generic Style Enforcer
 * Detecta padrões proibidos de tom de massa/coach em textos de conteúdo.
 */

export const LINTER_RULES = [
  // ── Oposições Estilizadas ────────────────────────────────────────────────
  {
    id: 'not-x-but-y',
    category: 'Oposição Estilizada',
    pattern: /não (é|se trata) (sobre|de) .{2,35},?\s*(é|se trata) (sobre|de)/gi,
    example: '"Não é sobre produtividade, é sobre presença"',
    suggestion: 'Use uma análise direta com dado ou observação técnica no lugar da oposição.',
  },

  // ── Estruturas de Massa ──────────────────────────────────────────────────
  {
    id: 'segredo-de',
    category: 'Estrutura de Massa',
    pattern: /o (segredo|poder|truque) (do|da|de|para)/gi,
    example: '"O segredo da produtividade"',
    suggestion: 'Substitua por análise direta: "O que os dados sobre X mostram é..."',
  },
  {
    id: 'proximo-nivel',
    category: 'Estrutura de Massa',
    pattern: /pr[oó]ximo n[ií]vel/gi,
    example: '"Levar sua carreira ao próximo nível"',
    suggestion: 'Especifique o que muda: "o que distingue X de Y em contextos de alta complexidade"',
  },
  {
    id: 'jornada-do',
    category: 'Estrutura de Massa',
    pattern: /a jornada (do|da|de|para)/gi,
    example: '"A jornada do empreendedor"',
    suggestion: 'Troque por "o processo", "a transição", "o percurso documentado de..."',
  },
  {
    id: 'guia-definitivo',
    category: 'Estrutura de Massa',
    pattern: /guia (definitivo|completo|essencial|pr[aá]tico)/gi,
    example: '"O guia definitivo de..."',
    suggestion: 'Use "análise de", "protocolo para", "framework de decisão em"',
  },
  {
    id: 'erro-que-90',
    category: 'Estrutura de Massa',
    pattern: /o erro que \d+% (das pessoas|dos profissionais|comete)/gi,
    example: '"O erro que 90% comete"',
    suggestion: 'Use dado real ou observação de padrão: "Em análise de N casos, o padrão recorrente é..."',
  },

  // ── Tom Clickbait ────────────────────────────────────────────────────────
  {
    id: 'vai-mudar-tudo',
    category: 'Tom Clickbait',
    pattern: /vai mudar (tudo|sua vida|o jogo|o mercado)/gi,
    example: '"Isso vai mudar tudo"',
    suggestion: 'Especifique a consequência real: "isso reduz X em Y% — e tem implicações para..."',
  },
  {
    id: 'ninguem-te-conta',
    category: 'Tom Clickbait',
    pattern: /ningu[eé]m (te conta|te fala|fala sobre|ensina)/gi,
    example: '"O que ninguém te conta sobre..."',
    suggestion: 'Use "o que raramente é documentado é...", "o dado que o mercado evita discutir é..."',
  },
  {
    id: 'a-verdade-e',
    category: 'Tom Clickbait',
    pattern: /a verdade [eé] que/gi,
    example: '"A verdade é que..."',
    suggestion: 'Apresente o argumento diretamente, sem preâmbulo de revelação.',
  },
  {
    id: 'voce-precisa',
    category: 'Tom Clickbait',
    pattern: /você precisa (saber|conhecer|ver|entender)/gi,
    example: '"Você precisa saber disso"',
    suggestion: 'Coloque o insight direto — quem precisa vai reconhecer sem ser avisado.',
  },

  // ── Invasão de Sentimento ────────────────────────────────────────────────
  {
    id: 'voce-sente',
    category: 'Invasão de Sentimento',
    pattern: /você (sente que|está cansad|se sente|já se sentiu)/gi,
    example: '"Você se sente perdido..."',
    suggestion: 'Descreva o cenário de fora: "profissionais sêniores relatam fadiga com X" — não invada o sentimento.',
  },
  {
    id: 'voce-merece',
    category: 'Invasão de Sentimento',
    pattern: /você merece/gi,
    example: '"Você merece mais"',
    suggestion: 'Evite afirmações de validação emocional — foque em análise de situação.',
  },

  // ── Vocabulário Proibido ─────────────────────────────────────────────────
  {
    id: 'vibe',
    category: 'Vocabulário Genérico',
    pattern: /\bvibes?\b/gi,
    example: '"A vibe do mercado"',
    suggestion: 'Use "sinal", "tendência", "padrão observado em"',
  },
  {
    id: 'jornada',
    category: 'Vocabulário de Coach',
    pattern: /\bjornada\b/gi,
    example: '"Sua jornada"',
    suggestion: 'Use "trajetória", "percurso", "processo de transição"',
  },
  {
    id: 'transformador',
    category: 'Vocabulário de Coach',
    pattern: /\btransformador(a)?\b/gi,
    example: '"Conteúdo transformador"',
    suggestion: 'Descreva o que muda especificamente: "altera o modelo mental de X em contextos de Y"',
  },
  {
    id: 'diquinhas',
    category: 'Vocabulário Genérico',
    pattern: /\bdiquinhas?\b/gi,
    example: '"Diquinhas de produtividade"',
    suggestion: 'Use "protocolos", "decisões de design", "parâmetros técnicos"',
  },
  {
    id: 'hack',
    category: 'Vocabulário Genérico',
    pattern: /\bhacks?\b/gi,
    example: '"Hacks de carreira"',
    suggestion: 'Use "protocolo", "workflow", "decisão técnica"',
  },
  {
    id: 'proposito',
    category: 'Vocabulário de Coach',
    pattern: /\bprop[oó]sito\b/gi,
    example: '"Encontre seu propósito"',
    suggestion: 'Use "critério de decisão", "posicionamento estratégico", "diretriz de carreira"',
  },
  {
    id: 'missao-vida',
    category: 'Vocabulário de Coach',
    pattern: /miss[aã]o de vida/gi,
    example: '"Sua missão de vida"',
    suggestion: 'Evite — sem substituição. Foque em consequências técnicas e profissionais.',
  },
  {
    id: 'autentico',
    category: 'Vocabulário de Coach',
    pattern: /\baut[eê]ntic[oa]\b/gi,
    example: '"Seja autêntico"',
    suggestion: 'Especifique o comportamento: "profissionais com posicionamento técnico claro tendem a..."',
  },
  {
    id: 'empoderamento',
    category: 'Vocabulário de Coach',
    pattern: /\bempoderar|empoderamento\b/gi,
    example: '"Empodere-se"',
    suggestion: 'Descreva a capacidade real: "ganho de autonomia técnica", "decisão sem dependência de..."',
  },
]

/**
 * Executa o linter em um texto e retorna as violações encontradas.
 * @param {string} text
 * @returns {{ id: string, category: string, match: string, suggestion: string }[]}
 */
export function lintText(text) {
  if (!text || typeof text !== 'string') return []
  const violations = []
  const seen = new Set()

  for (const rule of LINTER_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags)
    let match
    while ((match = regex.exec(text)) !== null) {
      const key = `${rule.id}::${match[0].toLowerCase()}`
      if (!seen.has(key)) {
        seen.add(key)
        violations.push({
          id: rule.id,
          category: rule.category,
          match: match[0],
          suggestion: rule.suggestion,
        })
      }
    }
  }

  return violations
}

/**
 * Retorna true se o texto passar no linter (zero violações).
 */
export function isClean(text) {
  return lintText(text).length === 0
}
