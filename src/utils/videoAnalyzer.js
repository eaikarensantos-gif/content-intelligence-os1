// Helper: stable hash from string
function hashStr(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0 }
  return Math.abs(h)
}

function pick(arr, h, offset = 0) { return arr[(h + offset) % arr.length] }
function pickN(arr, n, h) {
  const out = [], used = new Set()
  for (let i = 0; i < n && i < arr.length; i++) {
    let idx = (h + i * 7) % arr.length
    while (used.has(idx)) idx = (idx + 1) % arr.length
    used.add(idx); out.push(arr[idx])
  }
  return out
}

export function extractYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\n?#]{11})/)
  return m ? m[1] : null
}

export function getYouTubeThumbnail(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

export function analyzeVideo({ url = '', title = '', topic = '', videoType = 'educational' }) {
  const seed = hashStr((url + title + topic).toLowerCase())

  // ── ARCHETYPES ───────────────────────────────────────────────────────────────
  const ARCHETYPES = ['educational', 'storytelling', 'contrarian', 'listicle']
  const archetype = videoType !== 'auto' ? videoType : pick(ARCHETYPES, seed)

  // ── HOOKS ────────────────────────────────────────────────────────────────────
  const HOOKS = {
    educational: {
      type: 'Promessa de Transformação',
      description: 'Apresenta claramente o resultado que o espectador vai obter ao assistir. Cria expectativa de aprendizado imediato.',
      example: `"Depois desse vídeo você vai saber exatamente como ${topic || 'dominar esse assunto'} — sem precisar de anos de experiência."`,
      duration: '0:00–0:15',
      effectiveness: 'Alto — estabelece contrato claro com o espectador'
    },
    storytelling: {
      type: 'In Medias Res (No Meio da Ação)',
      description: 'Começa no ponto mais dramático ou interessante da história, sem introdução. Captura atenção instantaneamente.',
      example: `"Era meia-noite quando percebi que tudo que eu sabia sobre ${topic || 'isso'} estava errado..."`,
      duration: '0:00–0:20',
      effectiveness: 'Muito Alto — elimina a barreira de entrada da história'
    },
    contrarian: {
      type: 'Declaração Controversa',
      description: 'Abre com uma afirmação que vai contra o senso comum do nicho. Força o espectador a assistir para entender o raciocínio.',
      example: `"Tudo que você foi ensinado sobre ${topic || 'esse assunto'} está te sabotando. E vou provar agora."`,
      duration: '0:00–0:12',
      effectiveness: 'Muito Alto — gera curiosidade e resistência produtiva'
    },
    listicle: {
      type: 'Gancho de Número + Promessa',
      description: 'Apresenta um número específico de insights/dicas com uma promessa de tempo ou resultado claro.',
      example: `"${pick([3,5,7,10], seed)} coisas sobre ${topic || 'esse tema'} que os especialistas não te contam — em menos de ${pick([8,10,12], seed, 1)} minutos."`,
      duration: '0:00–0:10',
      effectiveness: 'Alto — define expectativa e cria estrutura mental para o conteúdo'
    }
  }

  // ── MAIN POINTS ──────────────────────────────────────────────────────────────
  const MAIN_POINTS_POOL = {
    educational: [
      { point: 'Diagnóstico do Problema', description: 'Explica exatamente por que o problema existe e quem é afetado por ele.', duration: '1:00–3:00' },
      { point: 'Framework Central', description: 'Introduz o modelo mental ou sistema que vai resolver o problema.', duration: '3:00–6:00' },
      { point: 'Demonstração Prática', description: 'Mostra o framework aplicado em exemplos reais e concretos.', duration: '6:00–9:00' },
      { point: 'Erros Comuns', description: 'Identifica os equívocos mais frequentes e como evitá-los.', duration: '9:00–11:00' },
      { point: 'Casos de Uso Avançados', description: 'Expande o framework para situações mais complexas.', duration: '11:00–13:00' },
    ],
    storytelling: [
      { point: 'Estabelecimento do Mundo', description: 'Contextualiza o cenário, personagens e o estado inicial antes da jornada.', duration: '0:20–2:00' },
      { point: 'O Catalisador / Problema', description: 'O evento ou descoberta que muda tudo e força a jornada.', duration: '2:00–4:00' },
      { point: 'A Jornada e os Obstáculos', description: 'Os desafios enfrentados — fracassos, aprendizados, momentos de dúvida.', duration: '4:00–8:00' },
      { point: 'A Virada', description: 'O insight ou mudança que resolve o conflito principal.', duration: '8:00–11:00' },
      { point: 'O Novo Normal', description: 'Como a situação mudou depois da transformação — o resultado concreto.', duration: '11:00–13:00' },
    ],
    contrarian: [
      { point: 'A Crença Popular (Contexto)', description: 'Apresenta a visão convencional com empatia — mostra que entende o ponto de vista antes de desconstruí-lo.', duration: '0:30–2:00' },
      { point: 'A Evidência Contraditória', description: 'Dados, estudos ou experiências que contradizem a crença popular.', duration: '2:00–5:00' },
      { point: 'O Mecanismo Real', description: 'Explica por que a crença popular existe e por que está errada.', duration: '5:00–8:00' },
      { point: 'A Nova Perspectiva', description: 'O framework correto — o que funciona de verdade e por quê.', duration: '8:00–11:00' },
      { point: 'Aplicação Prática', description: 'Como usar a nova perspectiva no dia a dia de forma concreta.', duration: '11:00–13:00' },
    ],
    listicle: [
      { point: 'Itens 1–2: As Fundações', description: 'Começa com os pontos mais acessíveis e reconhecíveis para criar concordância inicial.', duration: '1:00–4:00' },
      { point: 'Itens 3–4: O Núcleo', description: 'Os pontos de maior valor — insights menos óbvios e mais acionáveis.', duration: '4:00–7:00' },
      { point: 'Item do Meio: O Mais Surpreendente', description: 'Posicionado estrategicamente para manter atenção no ponto mais inesperado da lista.', duration: '7:00–9:00' },
      { point: 'Itens Finais: A Escalada', description: 'Os pontos avançados que diferenciam iniciantes de experts no tema.', duration: '9:00–12:00' },
    ]
  }

  const mainPoints = (MAIN_POINTS_POOL[archetype] || MAIN_POINTS_POOL.educational).slice(0, pick([3,4,5], seed))

  // ── TONE ────────────────────────────────────────────────────────────────────
  const TONES = {
    educational: {
      primary: 'Educacional / Didático',
      secondary: 'Autoritativo com Empatia',
      description: 'Comunicação clara e estruturada que respeita o nível do espectador. Usa analogias para simplificar conceitos complexos sem perder a profundidade.',
      markers: ['Linguagem acessível sem ser superficial', 'Perguntas retóricas para guiar o raciocínio', 'Exemplos concretos para cada conceito abstrato', 'Ritmo deliberado nos pontos mais importantes'],
      voice_characteristics: 'Tom de professor que já passou pelo que o espectador está enfrentando — combinação de expertise e empatia'
    },
    storytelling: {
      primary: 'Narrativo / Pessoal',
      secondary: 'Vulnerável e Autêntico',
      description: 'Voz íntima que cria conexão emocional genuína. A vulnerabilidade estratégica gera identificação e confiança sem perder a credibilidade.',
      markers: ['Detalhes sensoriais que tornam a história vívida', 'Emoções nomeadas explicitamente ("eu senti X")', 'Transições narrativas naturais entre momentos', 'Tom conversacional — como se contasse para um amigo'],
      voice_characteristics: 'Íntimo e reflexivo — o criador processa a experiência junto com o espectador'
    },
    contrarian: {
      primary: 'Provocador / Analítico',
      secondary: 'Confiante sem ser Arrogante',
      description: 'Tom assertivo que desafia sem alienar. A provocação é intelectual — convida o espectador a questionar, não a se defender.',
      markers: ['Afirmações fortes seguidas de evidência sólida', 'Reconhece a visão oposta antes de refutá-la', 'Usa dados e exemplos específicos para sustentar cada ponto', 'Humor pontual para aliviar a tensão das provocações'],
      voice_characteristics: 'O "amigo inteligente" que te diz o que os outros não têm coragem de dizer'
    },
    listicle: {
      primary: 'Direto / Energético',
      secondary: 'Informativo com Personalidade',
      description: 'Ritmo rápido com pausa estratégica nos pontos mais importantes. Cria sensação de alta densidade de valor por minuto assistido.',
      markers: ['Transições claras entre cada item da lista', 'Variação de ritmo — aceleração e desaceleração estratégica', 'Reforço visual alinhado com cada ponto', 'Linguagem de ação — verbos no imperativo'],
      voice_characteristics: 'Energético e focado — respeita o tempo do espectador ao máximo'
    }
  }

  const tone = TONES[archetype] || TONES.educational

  // ── PATTERNS ────────────────────────────────────────────────────────────────
  const ALL_PATTERNS = [
    { name: 'PAS (Problema–Agitação–Solução)', description: 'Apresenta um problema, intensifica a dor mostrando as consequências, depois oferece a solução.', why_effective: 'Cria urgência emocional antes da solução — o espectador quer a resposta com mais intensidade.' },
    { name: 'História Pessoal como Prova Social', description: 'O criador usa sua própria jornada como evidência de que o método funciona.', why_effective: 'Combina autoridade com vulnerabilidade — mais persuasivo do que dados abstratos.' },
    { name: 'Método de Contraste', description: 'Compara sistematicamente o jeito errado vs. o jeito certo para cada ponto.', why_effective: 'O contraste torna o aprendizado mais memorável e cria clareza imediata.' },
    { name: 'Callback / Referência Circular', description: 'Retorna a um elemento do início do vídeo no final para criar sensação de completude.', why_effective: 'Sinaliza ao espectador que chegou ao destino prometido no gancho — satisfação narrativa.' },
    { name: 'Quadro de "E Daí?" Constante', description: 'Após cada ponto, articula explicitamente o impacto prático para o espectador.', why_effective: 'Mantém a relevância percebida alta em cada momento do vídeo.' },
    { name: 'Densidade de Exemplos', description: 'Cada conceito é acompanhado de 2-3 exemplos concretos de diferentes ângulos.', why_effective: 'Aumenta a compreensão e a chance de pelo menos um exemplo ressoar com cada espectador.' },
    { name: 'Construção de Tensão Gradual', description: 'As revelações são escalonadas — cada ponto leva ao próximo criando momentum.', why_effective: 'Cria efeito de "só mais um pouco" que mantém a atenção até o final.' },
    { name: 'Padrão de Identificação', description: 'Descrições de situações e frustrações que fazem o espectador pensar "isso sou eu".', why_effective: 'Antes de ensinar, garante que o espectador sente que o conteúdo é para ele.' },
  ]

  const patterns = pickN(ALL_PATTERNS, 4, seed)

  // ── RETENTION TECHNIQUES ─────────────────────────────────────────────────────
  const ALL_RETENTION = [
    { technique: 'Open Loops (Loops Abertos)', description: 'Menciona algo intrigante que será explicado "daqui a pouco" sem entregar imediatamente.', example: 'Uso estimado: 3–5 vezes por vídeo em momentos de potencial queda de atenção.' },
    { technique: 'Pattern Interrupts', description: 'Mudanças abruptas de tom, velocidade, visual ou assunto para "resetar" a atenção.', example: 'Frequência: a cada 60–90 segundos para manter o cérebro alerta.' },
    { technique: 'Micro-Previews', description: 'Pequenas antecipações do que está por vir: "e no final vou te mostrar X".', example: 'Distribuídos estrategicamente nos primeiros 30% do vídeo.' },
    { technique: 'Perguntas Retóricas Diretas', description: 'Faz perguntas que o espectador responde mentalmente, criando engajamento ativo.', example: 'A cada 2–3 minutos para quebrar a passividade do espectador.' },
    { technique: 'Escalada de Stakes', description: 'Aumenta progressivamente o impacto e a importância de cada ponto apresentado.', example: 'Estrutura: "isso é bom, mas isso aqui é o que realmente importa..."' },
    { technique: 'Recompensas de Progresso', description: 'Recap verbal de quanto o espectador já aprendeu para validar o tempo investido.', example: 'Geralmente no ponto médio do vídeo (50% do tempo).' },
    { technique: 'Cliffhangers entre Seções', description: 'Termina cada seção com uma questão sem resposta que a próxima seção vai resolver.', example: 'Transições do tipo: "mas tem um problema com isso. E ele é sério."' },
    { technique: 'Prova Social Embutida', description: 'Menciona resultados, comentários ou histórias de outras pessoas que aplicaram o método.', example: 'Aumenta credibilidade e identificação em pontos de maior resistência.' },
  ]

  const retention = pickN(ALL_RETENTION, 5, seed + 3)

  // ── VISUAL ELEMENTS ──────────────────────────────────────────────────────────
  const VISUAL_STYLES = [
    {
      text_style: 'Texto em destaque com palavras-chave em cor contrastante — reforça os pontos mais importantes mesmo sem áudio.',
      editing_style: 'Jump cuts frequentes eliminam silêncios e pausas — ritmo rápido que respeita o tempo do espectador.',
      pacing: 'Médio-rápido com desacelerações estratégicas nos momentos de maior impacto.',
      key_techniques: ['B-roll de apoio para cada conceito abstrato', 'Zoom dinâmico em momentos de ênfase', 'Lower-thirds para dados e citações', 'Thumbnails testadas com contraste alto e face expressiva']
    },
    {
      text_style: 'Texto minimalista — apenas os números da lista e palavras de transição. O foco é total no apresentador.',
      editing_style: 'Cortes limpos e intencionais. Poucos efeitos — a energia vem da performance, não da edição.',
      pacing: 'Variável — lento nas histórias emocionais, rápido nas partes táticas.',
      key_techniques: ['Iluminação consistente que projeta profissionalismo', 'Plano americano como padrão com closes em momentos-chave', 'Música de fundo que varia de tom com o conteúdo', 'Captions em todas as falas para consumo sem áudio']
    },
    {
      text_style: 'On-screen text agressivo — bullets, números e fórmulas aparecem em tempo real enquanto o criador fala.',
      editing_style: 'Edição densa com gráficos, clips de notícias e imagens de referência para embasar cada ponto.',
      pacing: 'Rápido e denso — alta densidade de informação por minuto.',
      key_techniques: ['Screen recordings para demos e evidências', 'Animações simples para dados e comparações', 'Cortes para clipes de notícias como prova', 'Timestamps visíveis para facilitar navegação']
    },
  ]

  const visual = pick(VISUAL_STYLES, seed, 2)

  // ── WHY IT WORKS ─────────────────────────────────────────────────────────────
  const WHY_IT_WORKS_POOL = [
    { reason: 'Clareza de Público-Alvo', impact: 'O vídeo fala com uma persona específica — quem não é o público sai, mas quem é o público sente que é exatamente para ele.' },
    { reason: 'Promessa Específica e Cumprida', impact: 'O gancho cria uma expectativa clara que o vídeo entrega — o espectador sai sentindo que recebeu mais do que esperava.' },
    { reason: 'Equilíbrio de Teoria e Prática', impact: 'Cada conceito abstrato vem com um exemplo concreto — isso aumenta a retenção e a aplicabilidade percebida.' },
    { reason: 'Voz Única e Consistente', impact: 'O criador tem um ponto de vista claro e consistente — isso diferencia o conteúdo em um mar de vídeos genéricos.' },
    { reason: 'Estrutura que Guia o Espectador', impact: 'A estrutura narrativa elimina a fricção cognitiva — o espectador sabe onde está e para onde vai em cada momento.' },
    { reason: 'Alta Densidade de Valor', impact: 'Cada minuto entrega algo útil — não há "padding" ou conteúdo de enchimento, o que gera confiança de que o tempo foi bem investido.' },
    { reason: 'Emoção como Veículo para a Mensagem', impact: 'O conteúdo não é apenas informativo — gera uma resposta emocional (curiosidade, identificação, motivação) que aumenta a memorabilidade.' },
    { reason: 'Call-to-Action Integrado', impact: 'O CTA surge naturalmente como a próxima lógica depois do conteúdo — não interrompe, continua a experiência.' },
  ]

  const whyItWorks = pickN(WHY_IT_WORKS_POOL, 4, seed + 5)

  // ── TEMPLATE ─────────────────────────────────────────────────────────────────
  const TEMPLATES = {
    educational: {
      name: 'Template Educacional "Diagnóstico → Sistema → Prova"',
      hook_formula: '[Promessa de transformação específica] + [Tempo ou facilidade] + [Quebra de objeção]',
      hook_example: '"Em [X minutos] você vai entender [resultado] — sem precisar de [obstáculo comum]."',
      opening_formula: 'Hook (0:00–0:15) → Credencial rápida (0:15–0:30) → Preview do que vem (0:30–0:45)',
      sections: [
        { name: 'Por que isso importa', duration: '1–2 min', goal: 'Criar urgência e identificação com o problema' },
        { name: 'O Framework Central', duration: '3–5 min', goal: 'Apresentar o sistema principal com nome memorável' },
        { name: 'Aplicação Prática', duration: '4–6 min', goal: 'Mostrar o framework funcionando em exemplos reais' },
        { name: 'Erros a Evitar', duration: '2–3 min', goal: 'Aumentar a taxa de sucesso prevenindo os erros mais comuns' },
      ],
      closing_formula: 'Recap dos principais pontos → Resultado esperado ao aplicar → CTA natural',
      tips: [
        'Dê um nome memorável ao seu framework — "O método X" é mais poderoso que "minha abordagem"',
        'Use a estrutura "Antes vs. Depois" para cada conceito importante',
        'Inclua pelo menos um erro comum que o espectador provavelmente já cometeu',
        'Termine com uma promessa de próximo passo — não deixe o espectador sem direção',
      ]
    },
    storytelling: {
      name: 'Template de Storytelling "Jornada do Criador"',
      hook_formula: '[Cena no pico do drama] + [Contexto mínimo] + [Promessa de resolução]',
      hook_example: '"Eu [estava em situação ruim]. E isso me ensinou algo que mudou tudo sobre [tema]."',
      opening_formula: 'Cena dramática (0:00–0:20) → "Mas deixa eu te explicar como cheguei aqui..." → Volta ao começo',
      sections: [
        { name: 'O Mundo Antes', duration: '1–2 min', goal: 'Estabelecer o estado inicial — com quem o espectador se identifica' },
        { name: 'O Problema / Catalisador', duration: '2–3 min', goal: 'O momento que forçou a mudança — com detalhes sensoriais' },
        { name: 'A Jornada Real', duration: '4–6 min', goal: 'Os fracassos, aprendizados e momentos de virada — com vulnerabilidade' },
        { name: 'A Transformação', duration: '2–3 min', goal: 'O novo estado — com evidências concretas da mudança' },
      ],
      closing_formula: '"O que isso significa pra você é X" → Convite para a mesma jornada → CTA',
      tips: [
        'Inclua um momento de fracasso real — a vulnerabilidade é o que cria conexão genuína',
        'Nomeie emoções específicas ("eu senti vergonha" vs. "eu não me sentia bem")',
        'Use detalhes concretos e sensoriais — hora do dia, lugar, o que estava pensando',
        'A lição do final deve emergir naturalmente da história, não ser pregada',
      ]
    },
    contrarian: {
      name: 'Template Contrário "Consenso → Evidência → Nova Visão"',
      hook_formula: '[Afirmação que contradiz o senso comum] + [Promessa de prova]',
      hook_example: '"Todo mundo te diz para [conselho comum]. Mas isso está te prejudicando — e os dados provam."',
      opening_formula: 'Declaração provocadora (0:00–0:12) → "Eu sei, eu também pensava assim..." → Setup da evidência',
      sections: [
        { name: 'A Visão Convencional', duration: '1–2 min', goal: 'Apresentar a crença popular com empatia — mostrar que você entende' },
        { name: 'A Evidência Contrária', duration: '3–4 min', goal: 'Dados, casos ou experiências que contradizem o consenso' },
        { name: 'Por Que a Crença Existe', duration: '2–3 min', goal: 'Explicar o mecanismo — por que as pessoas acreditam nisso?' },
        { name: 'A Alternativa Real', duration: '3–4 min', goal: 'O que funciona de verdade — com prova e aplicação prática' },
      ],
      closing_formula: '"A maioria vai continuar fazendo X. Mas os que entenderem isso..." → CTA',
      tips: [
        'Comece reconhecendo a visão oposta — nunca a ridicularize',
        'Use números e casos específicos — quanto mais concreto, mais persuasivo',
        'Explique o mecanismo de por que o consenso está errado, não apenas que está',
        'Termine com uma perspectiva que faz o espectador sentir que tem uma vantagem',
      ]
    },
    listicle: {
      name: 'Template Lista "Número + Promessa + Escalada"',
      hook_formula: '[Número específico] + [Tema] + [Benefício concreto] + [Tempo]',
      hook_example: '"[X] coisas sobre [tema] que vão mudar como você [ação] — em menos de [Y] minutos."',
      opening_formula: 'Número + promessa (0:00–0:10) → Preview do item mais surpreendente → "Vamos lá"',
      sections: [
        { name: 'Itens 1–2: Concordância', duration: '2–3 min', goal: 'Começa com pontos conhecidos para criar acordo e confiança' },
        { name: 'Itens do Meio: O Núcleo', duration: '4–6 min', goal: 'Os pontos de maior valor — insights inesperados e acionáveis' },
        { name: 'Item Mais Surpreendente', duration: '2–3 min', goal: 'Posicionado estrategicamente para recuperar atenção na parte crítica' },
        { name: 'Último Item: A Virada', duration: '2–3 min', goal: 'O ponto mais avançado — recompensa quem assistiu até o final' },
      ],
      closing_formula: 'Recap rápido dos números → "O mais importante de tudo foi..." → CTA',
      tips: [
        'Nunca coloque o melhor item por último — posicione-o em 60–70% do vídeo',
        'Use transições de lista explícitas: "Item 3 de 7..."',
        'Varie o tamanho dos items — não dê o mesmo peso para todos',
        'Crie curiosidade sobre o próximo item no final de cada um',
      ]
    }
  }

  const template = TEMPLATES[archetype] || TEMPLATES.educational

  // ── CONTENT IDEAS ─────────────────────────────────────────────────────────────
  const topicLabel = topic || 'esse tema'
  const IDEAS_TEMPLATES = [
    { title: `O Framework de ${pick(['3','5','7'], seed)} Passos para ${topicLabel} Que Ninguém Ensina`, format: 'carrossel', platform: 'linkedin', hook_type: 'lista', angle: 'Educacional com sistema proprietário' },
    { title: `Eu Errei em ${topicLabel} por ${pick(['6','12','18'], seed, 1)} Meses — O Que Aprendi`, format: 'video', platform: 'youtube', hook_type: 'história', angle: 'Storytelling com lições práticas' },
    { title: `Por Que Tudo Que Você Sabe Sobre ${topicLabel} Está Errado`, format: 'thread', platform: 'twitter', hook_type: 'contrário', angle: 'Contrarian com evidência sólida' },
    { title: `${pick(['3','5','7'], seed, 2)} Erros Que ${pick(['90','80','95'], seed, 3)}% das Pessoas Cometem em ${topicLabel}`, format: 'reel', platform: 'instagram', hook_type: 'problema', angle: 'Identificação com erro comum + solução' },
    { title: `Analisei ${pick(['50','100','500'], seed, 4)} ${topicLabel} — Os Padrões Que Encontrei`, format: 'carrossel', platform: 'linkedin', hook_type: 'dados', angle: 'Data-driven com descobertas surpreendentes' },
    { title: `O Guia Definitivo de ${topicLabel} Para ${pick(['Iniciantes','Criadores','Profissionais'], seed, 5)}`, format: 'video', platform: 'youtube', hook_type: 'promessa', angle: 'Educacional completo — conteúdo evergreen' },
    { title: `Vale a Pena Investir em ${topicLabel}? A Resposta Honesta`, format: 'reel', platform: 'instagram', hook_type: 'pergunta', angle: 'Avaliação imparcial que gera credibilidade' },
    { title: `${pick(['Como','De Como'], seed, 6)} ${topicLabel} Mudou Minha Carreira em ${pick(['90 Dias','6 Meses','1 Ano'], seed, 7)}`, format: 'video', platform: 'youtube', hook_type: 'história', angle: 'Transformação pessoal com timeline específica' },
  ]

  const contentIdeas = pickN(IDEAS_TEMPLATES, 6, seed + 2)

  // ── ASSEMBLE REPORT ──────────────────────────────────────────────────────────
  const hook = HOOKS[archetype]

  return {
    archetype,
    structure: {
      hook,
      context: {
        description: 'Estabelece credibilidade e conecta o criador ao espectador antes de apresentar o conteúdo principal.',
        example: `"Passei [X tempo] estudando ${topicLabel} e isso é o que aprendi — sem o hype e sem atalhos."`,
        duration: hook.duration.split('–')[1] + '–' + (parseInt(hook.duration.split('–')[1]) + 30 + 's').replace('ss', 's')
      },
      main_points: mainPoints,
      closing: {
        description: 'Recap conciso dos pontos principais seguido de uma frase de impacto que sintetiza a mensagem central.',
        example: `"Se você sair com uma coisa desse vídeo, que seja: ${topicLabel} é sobre [insight central]. Tudo mais é detalhe."`,
        duration: 'Últimos 1–2 min'
      },
      cta: {
        description: 'Call-to-action integrado ao conteúdo — não soa como publicidade porque é a continuação natural do valor entregue.',
        example: `"Se isso foi útil, eu fiz um [próximo passo] sobre ${topicLabel} que você vai querer ver a seguir."`,
        type: pick(['Inscrição no canal', 'Próximo vídeo relacionado', 'Download de recurso', 'Comentário com pergunta'], seed, 4)
      }
    },
    tone,
    patterns,
    retention,
    visual,
    why_it_works: whyItWorks,
    template,
    content_ideas: contentIdeas,
  }
}
