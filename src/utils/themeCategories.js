// Categorias do Banco de Temas.
//
// O banco de trabalho já passou por duas rodadas de posicionamento antes desta:
// a original (Carreira, Maturidade Profissional, Tomada de Decisão, Dinâmicas
// Corporativas, IA e Futuro do Trabalho) e a do teste de 6 semanas (Negócio &
// estrutura, IA crítica, Celular & operação, Identidade — pensada pra dono de
// negócio pequeno, PJ e autônomo). Nenhuma das duas é o posicionamento atual
// (módulo /posicionamento): founder no núcleo, profissional em topo de funil,
// pilares Critério de decisão / Desmonte de hype / Bastidor de estrategista /
// Camada humana. As categorias agora são esses quatro pilares.
//
// A classificação trabalha por PALAVRA INTEIRA, não por pedaço de palavra.
// Procurar "racia" em qualquer posição mandava "burocracia" e "meritocracia"
// para Identidade; "compr" mandava "compreende" para Comprinhas; "pet" mandava
// "competência" para Naomi. Casar a borda da palavra com \b também não resolve
// em português: \b do JS não enxerga letra acentuada, então /f[ée]\b/ não pega
// "fé". Por isso o texto é quebrado em tokens e comparado termo a termo.

export const WORK_CATEGORIES = ['Critério de decisão', 'Desmonte de hype', 'Bastidor de estrategista', 'Camada humana']

export const PERSONAL_CATEGORIES = [
  'Vida com Naomi',
  'A vida dentro de casa',
  'Home Office',
  'Fé na vida real',
  'Achados que valem a pena',
  'Meu repertório particular',
  'Ser adulta é isso?',
]

export const PERSONAL_CATEGORY_MIGRATION = {
  'Naomi': 'Vida com Naomi',
  'Casa & Rotina': 'A vida dentro de casa',
  'Fé': 'Fé na vida real',
  'Comprinhas & Achados': 'Achados que valem a pena',
  'Hobbies & Gostos': 'Meu repertório particular',
  'Vida': 'Ser adulta é isso?',
}

export const migratePersonalCategory = (categoria) =>
  PERSONAL_CATEGORY_MIGRATION[categoria] || categoria

/** Temas já salvos com categorias de qualquer posicionamento anterior mudam de gaveta, não somem. */
export const WORK_CATEGORY_MIGRATION = {
  // posicionamento original (pré-teste de 6 semanas)
  'Carreira': 'Critério de decisão',
  'Maturidade Profissional': 'Critério de decisão',
  'Tomada de Decisão': 'Critério de decisão',
  'Dinâmicas Corporativas': 'Critério de decisão',
  'IA e Futuro do Trabalho': 'Desmonte de hype',
  // posicionamento do teste de 6 semanas
  'Negócio & estrutura': 'Critério de decisão',
  'IA crítica': 'Desmonte de hype',
  'Celular & operação': 'Critério de decisão',
  'Identidade': 'Camada humana',
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

// "Camada humana" herda o recorte forte de identidade/ancestralidade (o que já
// funcionava) e soma autoridade/peso de decidir — a camada humana de decidir,
// não só a técnica.
const isCamadaHumana = (tk, t) =>
  hasWord(tk, 'negra', 'negras', 'negro', 'negros', 'preta', 'pretas', 'preto', 'pretos',
    'racial', 'raciais', 'racismo', 'racista', 'racistas', 'diversidade', 'preconceito',
    'representatividade', 'ancestralidade', 'ancestral', 'ancestrais')
  || hasPhrase(t, 'única pessoa', 'unica pessoa', 'povo preto', 'lugar de fala',
    'sem performar', 'peso de decidir')

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

// "Desmonte de hype": ferramenta/assinatura questionada + exagero de tendência.
const isDesmonteDeHype = (tk, t) => {
  if (hasWord(tk, 'hype', 'tendência', 'tendencia', 'moda', 'modinha', 'milagre', 'milagrosa')
    || hasPhrase(t, 'todo mundo está usando', 'todo mundo esta usando', 'case de sucesso', 'não se paga', 'nao se paga')) return true
  if (isIATerm(tk, t) || isIASigla(tk, t)) return true
  // "ferramenta" e "assinatura" sozinhas são genéricas demais: "assinatura de
  // contrato" e "ferramenta pra emitir nota" não são desmonte de hype.
  const ferramentaOuAssinatura = hasStem(tk, 'ferrament') || hasWord(tk, 'assinatura', 'assinaturas', 'software')
  const contextoDeFerramenta = hasWord(tk, 'contratar', 'custo', 'caro', 'cancelar', 'mensal', 'plano')
    || hasPhrase(t, 'se paga', 'vale a pena', 'não usa', 'nao usa')
  return ferramentaOuAssinatura && contextoDeFerramenta
}

// "Bastidor de estrategista": o processo por trás da decisão, não o resultado.
const isBastidorDeEstrategista = (tk, t) =>
  hasWord(tk, 'bastidor', 'bastidores', 'rascunho', 'reunião', 'reuniao', 'reuniões', 'reunioes')
  || hasPhrase(t, 'como eu penso', 'como eu decido', 'por trás', 'por tras', 'o que ninguém vê', 'o que ninguem ve',
    'antes de qualquer proposta', 'antes de recomendar')

/** Classificação de fallback, usada quando não há chave de API para a IA classificar. */
export function categorizeWorkTheme(tema) {
  const t = (tema || '').toLowerCase()
  const tk = tokenize(t)
  // Camada humana primeiro: é o recorte mais específico e não pode ser engolido
  // pelos outros quando o tema também fala de negócio ou de ferramenta.
  if (isCamadaHumana(tk, t)) return 'Camada humana'
  if (isBastidorDeEstrategista(tk, t)) return 'Bastidor de estrategista'
  if (isDesmonteDeHype(tk, t)) return 'Desmonte de hype'
  return 'Critério de decisão'
}

// ─── Vida ────────────────────────────────────────────────────────────────────

export function categorizePersonalTheme(tema) {
  const t = (tema || '').toLowerCase()
  const tk = tokenize(t)

  if (hasWord(tk, 'notebook', 'reunião', 'reuniao', 'reuniões', 'reunioes', 'expediente',
    'videoconferência', 'videoconferencia', 'zoom', 'meet', 'câmera', 'camera', 'colegas', 'escritório', 'escritorio')
    || hasPhrase(t, 'home office', 'trabalho remoto', 'trabalhar de casa', 'trabalho de casa')) return 'Home Office'

  if (hasWord(tk, 'naomi', 'pet', 'pets', 'cachorro', 'cachorra', 'cadela', 'buldogue', 'bulldog', 'ração', 'racao')
    || hasStem(tk, 'veterinári', 'veterinari')) return 'Vida com Naomi'

  if (hasWord(tk, 'casa', 'cozinha', 'planta', 'plantas', 'apartamento', 'reforma', 'faxina', 'limpeza', 'rotina', 'casinha')
    || hasStem(tk, 'decora', 'arruma')) return 'A vida dentro de casa'

  if (hasWord(tk, 'fé', 'fe', 'deus', 'terreiro', 'orixá', 'orixa', 'orixás', 'vodum', 'voduns', 'jeje',
    'búzios', 'buzios', 'axé', 'axe', 'ancestralidade', 'gratidão', 'gratidao', 'espiritualidade')
    || hasStem(tk, 'candombl', 'ora')
    || hasPhrase(t, 'povo de santo', 'obrigação de santo')) return 'Fé na vida real'

  if (hasWord(tk, 'compra', 'compras', 'comprei', 'comprinha', 'comprinhas', 'achado', 'achados',
    'shopee', 'amazon', 'resenha', 'make', 'skincare', 'roupa', 'roupas', 'look', 'unboxing', 'casaco')
    || hasStem(tk, 'comprar')) return 'Achados que valem a pena'

  if (hasWord(tk, 'livro', 'livros', 'série', 'serie', 'séries', 'series', 'filme', 'filmes', 'viagem', 'viagens',
    'restaurante', 'café', 'cafe', 'música', 'musica', 'treino', 'corrida', 'hobby', 'hobbies', 'receita', 'petisco', 'petiscos'))
    return 'Meu repertório particular'

  return 'Ser adulta é isso?'
}

export const categorizeTheme = (tema, isPessoal) =>
  isPessoal ? categorizePersonalTheme(tema) : categorizeWorkTheme(tema)

// ─── O que cada pilar quer dizer ─────────────────────────────────────────────
// Usado tanto para classificar quanto para gerar temas novos. Sem isso, o
// modelo lia "Critério de decisão" como assunto corporativo genérico e
// devolvia rotina de CLT: promoção, chefe, feedback, entrevista.

export const WORK_CATEGORY_BRIEF = {
  'Critério de decisão':
    'A lógica por trás de uma decisão de negócio envolvendo IA: o que pesa, o que descarta, o que muda de ideia depois que os números chegam. Sempre do lugar de quem decide — founder ou profissional sênior — nunca de quem lista ferramenta ou espera aprovação de cima.',
  'Desmonte de hype':
    'Leitura crítica do exagero em cima de IA: a promessa que não se sustenta na primeira pergunta de negócio, o case de sucesso que esconde o que não deu certo, a ferramenta com hype alto e adoção baixa. Desmonta com argumento, não com ceticismo genérico.',
  'Bastidor de estrategista':
    'O processo real de quem aplica IA no negócio — a pergunta antes da proposta, o rascunho antes do slide pronto, a reunião onde a decisão foi tomada. Mostra como se pensa, não só o resultado polido.',
  'Camada humana':
    'O lado humano de decidir: autoridade construída sem performar o que não é seu, o peso de decidir por outras pessoas, raça e ancestralidade quando fazem parte de como se decide e como se é visto na sala.',
}

/* Termos de vida de empregado. O público do posicionamento é founder (núcleo)
   e profissional de tech em topo de funil — tema de promoção, chefe, RH ou
   entrevista é herança de um posicionamento anterior e entrou no banco pela
   migração das categorias antigas. */
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
 * Tema escrito do lugar de empregado, não de quem decide.
 * Não classifica sozinho — serve para sinalizar na interface o que sobrou de
 * um posicionamento anterior, para a Karen decidir se reescreve ou remove.
 */
export function isCltFramed(tema) {
  const t = (tema || '').toLowerCase()
  const tk = tokenize(t)
  return hasWord(tk, ...CLT_WORDS) || hasPhrase(t, ...CLT_PHRASES)
}

/** Nicho declarado para o modelo em toda geração de conteúdo de trabalho. */
export const WORK_NICHE =
  'Nicho: IA aplicada ao negócio, explicada por quem entende a lógica de decisão — não por quem lista ferramenta. ' +
  'Audiência: founder (público núcleo, ticket alto) e profissional de tecnologia em topo de funil — ' +
  'não é criador de hype de IA, não é lista de ferramenta do dia, não é conteúdo de vida de empregado em busca de promoção.'

// ─── Modo profissional: PJ autônomo vs CLT ───────────────────────────────────
// O banco de temas nasce em PJ (quem presta serviço, decide sozinho, responde a
// cliente). Cada pilar do banco de trabalho (src/data/temasCarrossel.js) tem
// uma segunda lista autoral, temasClt — mesmo raciocínio de cada tema, mas
// escrito do lugar de quem é funcionário e responde a um gestor dentro de uma
// estrutura, não uma tradução mecânica palavra por palavra da versão PJ (isso
// já foi tentado e soava como o mesmo tema com rótulo trocado).

/** Instrução extra pro modelo quando o pilar ativo está em modo CLT. */
export const WORK_CLT_GUIDE =
  `MODO PROFISSIONAL: CLT.
O mesmo raciocínio de founder/consultor, mas na pele de quem é CLT sênior — não quem decide sozinho, quem decide dentro de uma estrutura, respondendo a uma liderança.

Troque o vocabulário de quem presta serviço pelo de quem é empregado, mantendo o mesmo nível de análise:
- cliente → gestor / liderança / empresa
- proposta, contrato, projeto vendido → card no board, escopo, trabalho aprovado
- CNPJ, autônomo, freelancer → emprego, cargo, CLT
- fechar negócio / faturar → ser chamada pra decisão / ser considerada
- ciclo de cliente de seis meses → ciclo de escopo ou de avaliação de seis meses

PERMITIDO neste modo, mesmo banido no modo padrão: gestor, liderança, feedback, 1:1, ciclo de avaliação, cargo, escopo, board — é o vocabulário real de quem é CLT, não sobra de posicionamento antigo.
PROIBIDO mesmo em modo CLT: queixa genérica de emprego (medo de ser demitido, síndrome do impostor, pedir aumento, política de escritório). O ângulo continua sendo critério, leitura de sinal e tomada de decisão — só que lida de dentro da estrutura, não de fora dela.`
