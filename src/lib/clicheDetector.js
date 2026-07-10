// src/lib/clicheDetector.js
// Camada determinística do sistema anti-clichê.
// O ANTI_AI_FILTER proíbe as estruturas no prompt, mas prompt é probabilístico:
// o modelo pode emitir o padrão mesmo assim. Este detector roda sobre o texto
// pronto e aponta cada ocorrência — 'blocks' dispara reescrita automática,
// 'warns' é sinalização para revisão (palavras que podem ter uso literal legítimo,
// como "jornada de trabalho").

// Atenção: \b do JS não funciona encostado em caractere acentuado ("é" não é \w),
// por isso os padrões usam \s e lookahead em vez de \b nas bordas com acento.
const STRUCTURE_PATTERNS = [
  {
    id: 'contraste-corretivo',
    label: 'Contraste corretivo / epanortose ("Não é X, é Y")',
    re: /\bn[ãa]o é\s+[^.,;:!?\n]{1,60}[.,;:!?]\s*é(?=[\s"'])/gi,
  },
  {
    id: 'nao-se-trata',
    label: '"Não se trata de X, se trata de Y"',
    re: /\bn[ãa]o se trata de\s+[^.,;:!?\n]{2,60}[.,;:!?]\s*(?:se trata|é(?=[\s"']))/gi,
  },
  {
    id: 'negacao-de-culpa',
    label: 'Negação de culpa como gancho',
    re: /(?:a culpa n[ãa]o é sua|voc[êe] n[ãa]o errou|n[ãa]o (?:é|foi) por falta de|ningu[ée]m te ensinou)/gi,
  },
  {
    id: 'mais-do-que',
    label: '"Mais do que X, é Y"',
    re: /\bmais do que uma?\s[^.,;\n]{2,50},\s*é(?=[\s"'])/gi,
  },
]

const BLOCK_PHRASES = [
  'no fim do dia',
  'no final do dia',
  'tudo se resume',
  'melhor versão de você',
  'a mudança começa em você',
  'em um mundo cada vez mais',
  'num mundo cada vez mais',
  'no cenário atual',
  'na era digital',
  'gerar valor',
  'entregar valor',
  'criar valor',
  'gerar impacto',
  'já parou para pensar',
  'o primeiro passo é o mais difícil',
  'vamos juntos',
  'concorda?',
]

const WARN_WORDS = [
  'transformador', 'transformadora',
  'robusto', 'robusta',
  'holístico', 'holística',
  'alavancar', 'potencializar', 'impulsionar',
  'empoderar', 'empoderamento',
  'ressignificar', 'ressignificação',
  'jornada', 'ecossistema', 'protagonista',
  'mindset', 'propósito',
]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function detectCliches(text) {
  const blocks = []
  const warns = []
  if (!text || typeof text !== 'string') return { blocks, warns }

  for (const { id, label, re } of STRUCTURE_PATTERNS) {
    for (const m of text.matchAll(re)) blocks.push({ id, label, match: m[0].trim() })
  }

  for (const phrase of BLOCK_PHRASES) {
    const re = new RegExp(escapeRe(phrase), 'gi')
    for (const m of text.matchAll(re)) {
      blocks.push({ id: 'frase-proibida', label: 'Frase da lista proibida', match: m[0] })
    }
  }

  for (const word of WARN_WORDS) {
    const re = new RegExp(`\\b${escapeRe(word)}\\b`, 'gi')
    for (const m of text.matchAll(re)) {
      warns.push({ id: 'palavra-suspeita', label: 'Palavra da lista de clichês — conferir se o uso é literal', match: m[0] })
    }
  }

  // Fechamento com pergunta retórica (Seção 7 do manual: fechamento seco, sem pedido)
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  const last = lines[lines.length - 1] || ''
  if (/\?["')\]\s]*$/.test(last) && !last.startsWith('#')) {
    blocks.push({
      id: 'fechamento-pergunta',
      label: 'Fechamento com pergunta retórica',
      match: last.length > 80 ? `…${last.slice(-80)}` : last,
    })
  }

  return { blocks, warns }
}
