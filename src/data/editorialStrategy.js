// Camada de Estratégia Editorial — fonte única das quatro funções de
// conteúdo, das séries editoriais e do perfil de audiência ativa.
//
// Isto é DADO, não lógica. A lógica que lê estes valores (classificação,
// montagem de contexto de prompt, compatibilidade função↔série) fica em
// src/utils/editorialContext.js. Nenhuma regra nova deve ser escrita
// direto no UnifiedCreator — ele injeta esta camada, não a redefine.

/** As quatro funções editoriais. `id` é o valor estável salvo em ideias/posts — nunca renomeie um id existente, só o `label`. */
export const EDITORIAL_FUNCTIONS = [
  {
    id: 'critical_reading',
    label: 'Leitura crítica',
    goal: 'Alcance qualificado, compartilhamento e autoridade.',
    structure: [
      'discurso ou afirmação em circulação',
      'dado, fato ou situação concreta',
      'contexto que ficou de fora',
      'quem assume o custo',
      'leitura de Karen, incluindo limites da análise',
    ],
    promptInstruction:
      'Escreva uma LEITURA CRÍTICA. Parta de um discurso ou afirmação em circulação, traga um dado, fato ou situação concreta, mostre o contexto que ficou de fora, nomeie quem assume o custo, e feche com a leitura de Karen — incluindo os limites da própria análise, sem fingir certeza que não existe.',
  },
  {
    id: 'practical_utility',
    label: 'Utilidade com contexto',
    goal: 'Salvamento, aplicação e confiança.',
    structure: [
      'decisão que a pessoa precisa tomar',
      'critérios',
      'opções ou processo',
      'riscos e limites',
      'próxima ação concreta',
    ],
    promptInstruction:
      'Escreva UTILIDADE COM CONTEXTO. Parta da decisão real que a pessoa precisa tomar, dê critérios pra decidir, mostre opções ou processo, nomeie riscos e limites, e feche com uma próxima ação concreta. Nunca entregue só uma lista de ferramentas.',
  },
  {
    id: 'decision_backstage',
    label: 'Bastidor de decisão',
    goal: 'Proximidade profissional e diferenciação.',
    structure: [
      'situação real',
      'opções disponíveis',
      'critério usado',
      'decisão, erro ou dúvida',
      'o que ainda não está resolvido',
    ],
    promptInstruction:
      'Escreva um BASTIDOR DE DECISÃO. Conte uma situação real, as opções que existiam, o critério usado pra decidir, a decisão (ou o erro, ou a dúvida), e o que ainda não está resolvido. Não fabrique vulnerabilidade nem transforme isso em lição de fechamento.',
  },
  {
    id: 'community_connection',
    label: 'Convivência',
    goal: 'Familiaridade, afeto e continuidade.',
    structure: [
      'cena específica',
      'detalhe observável',
      'percepção pessoal ou humor seco',
      'final natural, sem moral',
    ],
    promptInstruction:
      'Escreva CONVIVÊNCIA. Uma cena específica (inclui Naomi, rotina, casa, favoritos, repertório pessoal quando fizer sentido), um detalhe observável, uma percepção pessoal ou humor seco, e um final natural — sem moral, sem lição de trabalho disfarçada de conteúdo pessoal.',
  },
]

export const EDITORIAL_FUNCTION_IDS = EDITORIAL_FUNCTIONS.map((f) => f.id)

export const getEditorialFunction = (id) =>
  EDITORIAL_FUNCTIONS.find((f) => f.id === id) || null

/** Distribuição editorial padrão — ponto de partida editável, não regra fixa. O Planejador ajusta quando houver volume real de métricas. */
export const DEFAULT_EDITORIAL_MIX = {
  critical_reading: 0.35,
  practical_utility: 0.25,
  decision_backstage: 0.25,
  community_connection: 0.15,
}

/**
 * Séries editoriais. `compatibleFunctions` restringe (não obriga) quais
 * funções fazem sentido pra série — usado por getCompatibleSeries().
 */
export const EDITORIAL_SERIES = [
  {
    id: 'missing_data',
    label: 'O dado que ficou de fora',
    description: 'Uma afirmação ou discurso em circulação, e o dado concreto que muda a leitura.',
    compatibleFunctions: ['critical_reading'],
    suggestedFormats: ['carrossel', 'post'],
    primaryMetric: 'saves_per_reach',
    promptInstruction: 'Série "O dado que ficou de fora": abra com a afirmação em circulação, entregue o dado que falta pra ler a situação direito.',
  },
  {
    id: 'who_pays',
    label: 'Quem paga essa conta',
    description: 'Quem assume o custo material de uma decisão, tendência ou discurso que parece neutro.',
    compatibleFunctions: ['critical_reading', 'decision_backstage'],
    suggestedFormats: ['carrossel', 'post', 'reel'],
    primaryMetric: 'shares_per_reach',
    promptInstruction: 'Série "Quem paga essa conta": nomeie quem concretamente arca com o custo — tempo, dinheiro, risco — de algo que costuma ser tratado como decisão neutra.',
  },
  {
    id: 'in_practice',
    label: 'Na prática, deu nisso',
    description: 'Um processo ou decisão testado de verdade, com o resultado real — bom ou ruim.',
    compatibleFunctions: ['practical_utility', 'decision_backstage'],
    suggestedFormats: ['carrossel', 'reel', 'stories'],
    primaryMetric: 'saves_per_reach',
    promptInstruction: 'Série "Na prática, deu nisso": conte o que foi testado, o processo real, e o resultado — sem embelezar o que não funcionou.',
  },
  {
    id: 'worth_the_price',
    label: 'Vale o preço?',
    description: 'Avaliação de custo-benefício real de uma ferramenta, assinatura, curso ou serviço.',
    compatibleFunctions: ['practical_utility', 'critical_reading'],
    suggestedFormats: ['carrossel', 'post'],
    primaryMetric: 'profile_visits_per_1k_views',
    promptInstruction: 'Série "Vale o preço?": avalie custo contra retorno real, com critério explícito — não é resenha de produto, é decisão de gasto.',
  },
  {
    id: 'unfinished_analysis',
    label: 'Ainda não fechei essa ideia',
    description: 'Um raciocínio em andamento, sem conclusão fechada — pensamento em voz alta.',
    compatibleFunctions: ['decision_backstage', 'critical_reading'],
    suggestedFormats: ['post', 'stories'],
    primaryMetric: 'comments_per_reach',
    promptInstruction: 'Série "Ainda não fechei essa ideia": apresente um raciocínio real em andamento, admita onde ele não fecha, sem forçar uma conclusão que não existe ainda.',
  },
  {
    id: 'researched_for_you',
    label: 'Karen pesquisou para você não ter que pesquisar',
    description: 'Uma investigação prática já feita, entregue como atalho — não como lista genérica.',
    compatibleFunctions: ['practical_utility'],
    suggestedFormats: ['carrossel', 'post'],
    primaryMetric: 'saves_per_reach',
    promptInstruction: 'Série "Karen pesquisou para você não ter que pesquisar": entregue o resultado de uma investigação real (comparação, teste, apuração), com critério de escolha explícito — não uma lista solta de opções.',
  },
]

export const getEditorialSeries = (id) =>
  EDITORIAL_SERIES.find((s) => s.id === id) || null

/** Perfil comportamental da audiência ativa — não é dado demográfico oficial, é leitura de comportamento observado. */
export const ACTIVE_AUDIENCE_PROFILE = {
  creator:
    'Karen Santos é designer com mais de 10 anos de experiência e especialista em IA aplicada a negócios e carreira.',
  respondsTo: [
    'Crítica sustentada por dados.',
    'Recortes de raça, gênero, classe, acesso e trabalho.',
    'Custos materiais ignorados por discursos genéricos.',
    'Utilidade prática para tecnologia, carreira e pequenos negócios.',
    'Bastidores de decisão, erros, limites e testes reais.',
    'Conteúdo pessoal específico, incluindo rotina, casa e Naomi, sem lição profissional disfarçada.',
  ],
  mostMobilized:
    'Mulheres negras profissionais e empreendedoras, designers, pessoas de tecnologia, marketing e comunicação, pequenas empresárias e profissionais buscando melhores decisões de carreira.',
  disclaimer: 'Isto é um perfil comportamental da audiência ativa, não uma demografia oficial.',
}

/** Cortes de público reutilizáveis pra marcar de quem é o conteúdo específico. Livre pra Karen editar/expandir; não é lista fechada. */
export const DEFAULT_AUDIENCE_CUTS = [
  { id: 'founder', label: 'Founder / dona de negócio' },
  { id: 'tech_topo_funil', label: 'Profissional de tecnologia, topo de funil' },
  { id: 'designer', label: 'Designer' },
  { id: 'pj_autonomo', label: 'PJ autônomo' },
  { id: 'clt_senior', label: 'CLT sênior' },
  { id: 'mulher_preta_profissional', label: 'Mulher preta profissional/empreendedora' },
]

/** Princípios de fechamento/conexão — a pergunta ou fechamento final varia por função, nunca é um CTA universal. */
export const CONNECTION_PRINCIPLES = {
  forbidden: ['Concorda?', 'O que você acha?', 'Conta aqui'],
  rule: 'A pergunta final deve pedir experiência, critério, decisão ou memória específica. Nem todo conteúdo precisa de CTA. Pergunta binária não é regra universal.',
  byFunction: {
    critical_reading: 'Priorize perguntas que permitam à pessoa acrescentar contexto que ficou de fora.',
    practical_utility: 'Pergunte por decisão tomada ou dificuldade real de aplicação.',
    decision_backstage: 'Pergunte por critério usado pela pessoa numa situação semelhante.',
    community_connection: 'Aceite observação seca ou pergunta espontânea, sem forçar CTA.',
  },
}

/**
 * Checklist de validação silenciosa aplicado antes de entregar conteúdo.
 * `blocking: true` marca os itens que exigem reescrita quando falham
 * (itens 3, 6, 7, 8 e 10 do master prompt).
 */
export const CONTENT_VALIDATION_RULES = [
  { id: 'concrete_situation', question: 'Existe uma pessoa ou situação concreta?', blocking: false },
  { id: 'real_evidence', question: 'Existe dado, critério, consequência ou observação real?', blocking: false },
  { id: 'judgment_not_explainer', question: 'O texto mostra julgamento de Karen ou só explica um assunto?', blocking: true },
  { id: 'audience_can_complete', question: 'A experiência da base pode completar o conteúdo?', blocking: false },
  { id: 'comment_starts_with_story', question: 'O comentário provável começa com uma história, não só "concordo"?', blocking: false },
  { id: 'not_generic_ai_account', question: 'O texto poderia ser publicado por qualquer conta de IA ou carreira?', blocking: true },
  { id: 'unsourced_claim', question: 'Há afirmação factual sem fonte ou evidência fornecida?', blocking: true },
  { id: 'moral_or_coach_tone', question: 'Existe fechamento moral, tom de coach ou falsa oposição?', blocking: true },
  { id: 'function_shows_up', question: 'A função editorial escolhida aparece de fato no conteúdo?', blocking: false },
  { id: 'saturated_ai_print', question: 'O texto poderia estar em um print de posts saturados de IA?', blocking: true },
]

export const BLOCKING_VALIDATION_IDS = CONTENT_VALIDATION_RULES.filter((r) => r.blocking).map((r) => r.id)
