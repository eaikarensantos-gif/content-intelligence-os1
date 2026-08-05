// Categorias do Banco de Temas.
//
// O banco de trabalho seguia o posicionamento antigo — Carreira, Maturidade
// Profissional, Tomada de Decisão, Dinâmicas Corporativas, IA e Futuro do
// Trabalho. Isso descrevia o território de onde o teste de posicionamento está
// saindo: 14 das 18 peças da grade não tinham categoria onde morar. As
// categorias agora são os quatro pilares do teste.
//
// A classificação trabalha por PALAVRA INTEIRA, não por pedaço de palavra.
// Procurar "racia" em qualquer posição mandava "burocracia" e "meritocracia"
// para Identidade; "compr" mandava "compreende" para Comprinhas; "pet" mandava
// "competência" para Naomi. Casar a borda da palavra com \b também não resolve
// em português: \b do JS não enxerga letra acentuada, então /f[ée]\b/ não pega
// "fé". Por isso o texto é quebrado em tokens e comparado termo a termo.

export const WORK_CATEGORIES = ['Negócio & estrutura', 'IA crítica', 'Celular & operação', 'Identidade']

export const PERSONAL_CATEGORIES = ['Naomi', 'Casa & Rotina', 'Fé', 'Comprinhas & Achados', 'Hobbies & Gostos', 'Vida']

/** Temas já salvos com as categorias antigas mudam de gaveta, não somem. */
export const WORK_CATEGORY_MIGRATION = {
  'Carreira': 'Negócio & estrutura',
  'Maturidade Profissional': 'Negócio & estrutura',
  'Tomada de Decisão': 'Negócio & estrutura',
  'Dinâmicas Corporativas': 'Negócio & estrutura',
  'IA e Futuro do Trabalho': 'IA crítica',
}

export const migrateWorkCategory = (categoria) =>
  WORK_CATEGORY_MIGRATION[categoria] || categoria

// ─── Casamento por palavra ───────────────────────────────────────────────────

const LETTERS = 'a-z0-9àáâãäçèéêëìíîïñòóôõöùúûü'
const SPLIT = new RegExp(`[^${LETTERS}]+`, 'i')

export const tokenize = (texto) =>
  (texto || '').toLowerCase().split(SPLIT).filter(Boolean)

/** Palavra exata: "pet" não casa com "competência". */
const hasWord = (tokens, ...palavras) => palavras.some((p) => tokens.includes(p))

/** Começo de palavra: "automa" casa com "automação" e "automatizar", não com
 *  qualquer texto que contenha a sequência no meio. */
const hasStem = (tokens, ...radicais) =>
  radicais.some((r) => tokens.some((t) => t.startsWith(r)))

/** Expressão de duas ou mais palavras. */
const hasPhrase = (texto, ...frases) => {
  const t = (texto || '').toLowerCase()
  return frases.some((f) => t.includes(f))
}

// ─── Trabalho ────────────────────────────────────────────────────────────────

const isIdentidade = (tk, t) =>
  hasWord(tk, 'negra', 'negras', 'negro', 'negros', 'preta', 'pretas', 'preto', 'pretos',
    'racial', 'raciais', 'racismo', 'racista', 'racistas', 'diversidade', 'preconceito',
    'representatividade', 'ancestralidade', 'ancestral', 'ancestrais')
  || hasPhrase(t, 'única pessoa', 'unica pessoa', 'povo preto', 'lugar de fala')

// Termos que identificam IA sem depender do token solto "ia" — que em português
// é também o verbo ("o cliente que ia fechar", "eu ia mandar a proposta").
const isIATerm = (tk, t) =>
  hasWord(tk, 'chatgpt', 'gpt', 'copilot', 'gemini', 'llm', 'llms', 'prompt', 'prompts', 'algoritmo', 'algoritmos')
  || hasStem(tk, 'automa', 'automatiz')
  || hasPhrase(t, 'inteligência artificial', 'inteligencia artificial', 'machine learning')

// O token "ia" só conta como sigla quando o tema traz contexto de ferramenta.
const isIASigla = (tk, t) =>
  hasWord(tk, 'ia')
  && (hasStem(tk, 'ferrament', 'us', 'ger', 'model', 'agent', 'trein', 'substitu')
    || hasPhrase(t, 'com ia', 'de ia', 'da ia', 'na ia', 'por ia'))

const isIACritica = (tk, t) => {
  if (isIATerm(tk, t) || isIASigla(tk, t)) return true
  // "ferramenta" e "assinatura" sozinhas são genéricas demais: "assinatura de
  // contrato" e "ferramenta pra emitir nota" não são crítica de IA.
  const ferramentaOuAssinatura = hasStem(tk, 'ferrament') || hasWord(tk, 'assinatura', 'assinaturas', 'software')
  const contextoDeFerramenta = hasWord(tk, 'contratar', 'custo', 'caro', 'cancelar', 'mensal', 'plano', 'digital')
    || hasPhrase(t, 'se paga', 'vale a pena', 'não usa', 'nao usa')
  return ferramentaOuAssinatura && contextoDeFerramenta
}

// "Celular & operação" é o celular como ferramenta de operação do negócio —
// IA, produtividade, gestão, governança rodando do aparelho. Não é o celular
// como objeto de cena: "reunião começou e celular no silencioso" fala do
// aparelho no cotidiano. Por isso o aparelho sozinho não basta.
const isDevice = (tk, t) =>
  hasWord(tk, 'celular', 'celulares', 'smartphone', 'mobile', 'telefone', 'whatsapp', 'app', 'apps', 'aplicativo', 'aplicativos')
  || hasPhrase(t, 'na palma da mão', 'sem computador', 'sem o computador', 'sem notebook',
    'sem o notebook', 'sem abrir o note', 'do bolso')

const isOperation = (tk, t) =>
  hasStem(tk, 'negóci', 'negoci', 'opera', 'gest', 'gerenc', 'administr', 'process', 'client',
    'propost', 'orçament', 'orcament', 'cobran', 'cobr', 'receb', 'financ', 'contrat', 'agend',
    'estoq', 'vend', 'faturament', 'relatóri', 'relatori', 'backup', 'senh', 'acess', 'produtiv')
  || hasWord(tk, 'governança', 'governanca', 'fluxo', 'fluxos', 'rotina', 'resolver', 'rodar', 'dados', 'dado',
    'segurança', 'seguranca', 'empresa', 'mei', 'cnpj')
  || hasPhrase(t, 'nota fiscal')
  || isIATerm(tk, t) || isIASigla(tk, t)

/** Classificação de fallback, usada quando não há chave de API para a IA classificar. */
export function categorizeWorkTheme(tema) {
  const t = (tema || '').toLowerCase()
  const tk = tokenize(t)
  // Identidade primeiro: é o recorte mais específico e não pode ser engolido
  // pelos outros quando o tema também fala de negócio ou de ferramenta.
  if (isIdentidade(tk, t)) return 'Identidade'
  // Aparelho + operação: "fluxo de IA no celular" é operação, não crítica de ferramenta.
  if (isDevice(tk, t) && isOperation(tk, t)) return 'Celular & operação'
  if (isIACritica(tk, t)) return 'IA crítica'
  return 'Negócio & estrutura'
}

// ─── Vida ────────────────────────────────────────────────────────────────────

export function categorizePersonalTheme(tema) {
  const t = (tema || '').toLowerCase()
  const tk = tokenize(t)

  if (hasWord(tk, 'naomi', 'pet', 'pets', 'cachorro', 'cachorra', 'cadela', 'buldogue', 'bulldog', 'ração', 'racao')
    || hasStem(tk, 'veterinári', 'veterinari')) return 'Naomi'

  if (hasWord(tk, 'casa', 'cozinha', 'planta', 'plantas', 'apartamento', 'reforma', 'faxina', 'limpeza', 'rotina', 'casinha')
    || hasStem(tk, 'decora', 'arruma')) return 'Casa & Rotina'

  if (hasWord(tk, 'fé', 'fe', 'deus', 'terreiro', 'orixá', 'orixa', 'orixás', 'vodum', 'voduns', 'jeje',
    'búzios', 'buzios', 'axé', 'axe', 'ancestralidade', 'gratidão', 'gratidao', 'espiritualidade')
    || hasStem(tk, 'candombl', 'ora')
    || hasPhrase(t, 'povo de santo', 'obrigação de santo')) return 'Fé'

  if (hasWord(tk, 'compra', 'compras', 'comprei', 'comprinha', 'comprinhas', 'achado', 'achados',
    'shopee', 'amazon', 'resenha', 'make', 'skincare', 'roupa', 'roupas', 'look', 'unboxing', 'casaco')
    || hasStem(tk, 'comprar')) return 'Comprinhas & Achados'

  if (hasWord(tk, 'livro', 'livros', 'série', 'serie', 'séries', 'series', 'filme', 'filmes', 'viagem', 'viagens',
    'restaurante', 'café', 'cafe', 'música', 'musica', 'treino', 'corrida', 'hobby', 'hobbies', 'receita', 'petisco', 'petiscos'))
    return 'Hobbies & Gostos'

  return 'Vida'
}

export const categorizeTheme = (tema, isPessoal) =>
  isPessoal ? categorizePersonalTheme(tema) : categorizeWorkTheme(tema)

// ─── O que cada pilar quer dizer ─────────────────────────────────────────────
// Usado tanto para classificar quanto para gerar temas novos. Sem isso, o
// modelo lia "Negócio & estrutura" como assunto corporativo genérico e devolvia
// rotina de CLT: promoção, chefe, feedback, entrevista.

export const WORK_CATEGORY_BRIEF = {
  'Negócio & estrutura':
    'Como quem trabalha por conta sustenta o próprio negócio: preço, escopo, contrato, proposta, cliente, cobrança, inadimplência, CNPJ, imposto, sócio, rotina e limites de quem não tem chefe. Sempre do lugar de quem é o dono, nunca de quem é empregado.',
  'IA crítica':
    'Leitura crítica de ferramenta de IA para negócio pequeno: se paga ou não, onde erra, custo de assinatura, o que dá pra fazer na mão mais barato, como decidir antes de contratar.',
  'Celular & operação':
    'O celular como ferramenta de operação do negócio: rodar IA, produtividade, gestão, governança, financeiro e atendimento a partir do aparelho. Não é o celular como objeto de cena do dia.',
  'Identidade':
    'Raça, ancestralidade e representatividade dentro do trabalho e do negócio: ser a única pessoa negra na sala, cobrar sendo quem é, autoridade sem performar o que não é seu.',
}

/* Termos de vida de empregado. O público do teste é dono de negócio pequeno,
   PJ e autônomo — tema de promoção, chefe, RH ou entrevista é do posicionamento
   antigo e entrou no banco pela migração das categorias de carreira. */
const CLT_WORDS = [
  'promoção', 'promocao', 'promovido', 'promovida', 'aumento', 'salário', 'salario', 'holerite',
  'chefe', 'gestor', 'gestora', 'liderança', 'lideranca', 'rh', 'currículo', 'curriculo',
  'entrevista', 'recrutador', 'recrutadora', 'vaga', 'vagas', 'emprego', 'empregada', 'empregado',
  'clt', 'demissão', 'demissao', 'demitido', 'demitida', 'contratação', 'contratacao',
  'feedback', 'avaliação', 'avaliacao', 'desempenho', 'cargo', 'promover', 'estágio', 'estagio',
  'colega', 'colegas', 'equipe', 'escritório', 'escritorio', 'corporativo', 'corporativa',
]

const CLT_PHRASES = [
  'meu chefe', 'meu gestor', 'minha gestora', 'pedir aumento', 'mudar de emprego',
  'mercado de trabalho', 'plano de carreira', 'síndrome do impostor', 'sindrome do impostor',
  'ser promovido', 'ambiente corporativo', 'política de escritório', 'politica de escritorio',
]

/**
 * Tema escrito do lugar de empregado, não de dono de negócio.
 * Não classifica sozinho — serve para sinalizar na interface o que sobrou do
 * posicionamento antigo, para a Karen decidir se reescreve ou remove.
 */
export function isCltFramed(tema) {
  const t = (tema || '').toLowerCase()
  const tk = tokenize(t)
  return hasWord(tk, ...CLT_WORDS) || hasPhrase(t, ...CLT_PHRASES)
}

/** Nicho declarado para o modelo em toda geração de conteúdo de trabalho. */
export const WORK_NICHE =
  'Nicho: IA aplicada a negócio pequeno, estrutura para quem trabalha como PJ ou autônomo, ' +
  'e o celular como ferramenta de operação. Audiência: dono de negócio pequeno, PJ e autônomo — ' +
  'não é audiência corporativa em busca de promoção.'
