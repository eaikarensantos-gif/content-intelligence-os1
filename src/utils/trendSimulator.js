const CREATORS_DB = {
  linkedin: [
    { name: 'Merci Victoria Grace', handle: '@mercivictoriagrace', followers: '95k', avg_engagement: '5.8%', niche: 'Liderança em Produto e cultura de times de tech', recent_topics: ['product leadership', 'tech org design', 'senior career decisions'], profile_url: 'https://www.linkedin.com/in/mercivictoriagrace/' },
    { name: 'Wes Kao', handle: '@weskao', followers: '120k', avg_engagement: '6.4%', niche: 'Comunicação executiva e influência técnica', recent_topics: ['executive communication', 'strategic influence', 'working with senior stakeholders'], profile_url: 'https://www.linkedin.com/in/weskao/' },
    { name: 'Tanya Reilly', handle: '@tanyareilly', followers: '78k', avg_engagement: '5.1%', niche: 'Staff Engineering e maturidade técnica sênior', recent_topics: ['staff engineer', 'technical leadership', 'senior IC career'], profile_url: 'https://www.linkedin.com/in/tanyareilly/' },
    { name: 'Ethan Mollick', handle: '@emollick', followers: '210k', avg_engagement: '7.2%', niche: 'IA aplicada ao trabalho do conhecimento — perspectiva acadêmica', recent_topics: ['AI co-intelligence', 'human-AI collaboration', 'future of knowledge work'], profile_url: 'https://www.linkedin.com/in/emollick/' },
    { name: 'Kayvon Beykpour', handle: '@kayvz', followers: '85k', avg_engagement: '4.9%', niche: 'Product strategy e liderança em scale-ups', recent_topics: ['product strategy', 'startup to scale', 'tech leadership decisions'], profile_url: 'https://www.linkedin.com/in/kayvz/' },
    { name: 'Louie Bacaj', handle: '@louiebacaj', followers: '62k', avg_engagement: '5.7%', niche: 'Solopreneurship estratégico e carreira técnica', recent_topics: ['senior engineer to indie', 'technical solopreneur', 'career transitions in tech'], profile_url: 'https://www.linkedin.com/in/louiebacaj/' },
    { name: 'Gergely Orosz', handle: '@gergelyorosz', followers: '195k', avg_engagement: '6.9%', niche: 'Engenharia de software sênior e mercado de tech', recent_topics: ['tech layoffs analysis', 'senior engineer career', 'engineering management'], profile_url: 'https://www.linkedin.com/in/gergelyorosz/' },
  ],
  twitter: [
    { name: 'Andrej Karpathy', handle: '@karpathy', followers: '890k', avg_engagement: '8.3%', niche: 'IA profunda — ex-OpenAI, ex-Tesla AI', recent_topics: ['LLM internals', 'AI education', 'vibe coding critique'], profile_url: 'https://x.com/karpathy' },
    { name: 'Simon Willison', handle: '@simonw', followers: '155k', avg_engagement: '5.9%', niche: 'LLMs aplicados e engenharia de prompts avançada', recent_topics: ['prompt engineering', 'LLM tools', 'responsible AI use'], profile_url: 'https://x.com/simonw' },
    { name: 'Shreya Shankar', handle: '@sh_reya', followers: '72k', avg_engagement: '6.1%', niche: 'ML Engineering e confiabilidade de sistemas de IA', recent_topics: ['ML reliability', 'data quality', 'LLM evals'], profile_url: 'https://x.com/sh_reya' },
    { name: 'Swyx', handle: '@swyx', followers: '145k', avg_engagement: '5.4%', niche: 'AI Engineer landscape e futuro das habilidades', recent_topics: ['AI engineer', 'latent space', 'software 2.0 career'], profile_url: 'https://x.com/swyx' },
    { name: 'Hamel Husain', handle: '@hamelhusain', followers: '68k', avg_engagement: '5.8%', niche: 'LLMOps e engenharia prática de IA', recent_topics: ['LLM evaluation', 'AI systems in production', 'practical ML'], profile_url: 'https://x.com/hamelhusain' },
    { name: 'Yann LeCun', handle: '@ylecun', followers: '740k', avg_engagement: '4.2%', niche: 'Crítica técnica de IA — Chief AI Scientist Meta', recent_topics: ['AI limitations', 'AGI critique', 'embodied AI'], profile_url: 'https://x.com/ylecun' },
  ],
  instagram: [
    { name: 'Juarez Lumertz', handle: '@juarezlumertz', followers: '48k', avg_engagement: '5.3%', niche: 'Crítica corporativa e maturidade profissional', recent_topics: ['ambiente corporativo', 'carreira sênior', 'liderança com honestidade'], profile_url: 'https://www.instagram.com/juarezlumertz/' },
    { name: 'Álvaro Justen', handle: '@turicas', followers: '32k', avg_engagement: '4.8%', niche: 'Dados abertos, ética em IA e crítica técnica', recent_topics: ['dados públicos', 'viés algorítmico', 'tech e sociedade'], profile_url: 'https://www.instagram.com/turicas/' },
    { name: 'Camile Santana', handle: '@camilesantana', followers: '61k', avg_engagement: '5.1%', niche: 'Design de produto e liderança criativa', recent_topics: ['design leadership', 'UX estratégico', 'carreira criativa sênior'], profile_url: 'https://www.instagram.com/camilesantana/' },
    { name: 'Dani Bittencourt', handle: '@danibittencourt', followers: '55k', avg_engagement: '4.6%', niche: 'Corporativo relatable e desenvolvimento profissional', recent_topics: ['vida corporativa', 'liderança real', 'carreira sem toxic positivity'], profile_url: 'https://www.instagram.com/danibittencourt/' },
    { name: 'Michael Cho', handle: '@michaelchodesign', followers: '94k', avg_engagement: '5.7%', niche: 'UX Design para IA e design de produtos de linguagem', recent_topics: ['AI UX patterns', 'designing for LLMs', 'conversational interfaces'], profile_url: 'https://www.instagram.com/michaelchodesign/' },
  ],
  youtube: [
    { name: 'David Shapiro', handle: '@DavidShapiroAI', followers: '210k', avg_engagement: '5.8%', niche: 'IA generativa — análise técnica aprofundada', recent_topics: ['AI alignment', 'LLM architecture', 'AGI timeline analysis'], profile_url: 'https://www.youtube.com/@DavidShapiroAI' },
    { name: 'Matt Wolfe', handle: '@mreflow', followers: '890k', avg_engagement: '4.9%', niche: 'AI tools aplicados ao trabalho criativo e profissional', recent_topics: ['AI workflows', 'generative tools review', 'AI for business'], profile_url: 'https://www.youtube.com/@mreflow' },
    { name: 'Tina Huang', handle: '@TinaHuang1', followers: '370k', avg_engagement: '5.3%', niche: 'Carreira em Data Science e transição para IA sênior', recent_topics: ['data science career', 'AI tools for analysts', 'senior IC path'], profile_url: 'https://www.youtube.com/@TinaHuang1' },
    { name: 'NetworkChuck', handle: '@NetworkChuck', followers: '3.1M', avg_engagement: '4.6%', niche: 'Infra e Cloud para engenheiros e tech leaders', recent_topics: ['AI infrastructure', 'cloud architecture', 'technical deep dives'], profile_url: 'https://www.youtube.com/@NetworkChuck' },
    { name: 'Fireship', handle: '@Fireship', followers: '2.8M', avg_engagement: '6.1%', niche: 'Crítica técnica ácida e análise de tendências em software', recent_topics: ['AI coding critique', 'software industry satire', 'tech trends analysis'], profile_url: 'https://www.youtube.com/@Fireship' },
    { name: 'Lex Fridman', handle: '@lexfridman', followers: '4.2M', avg_engagement: '3.8%', niche: 'Entrevistas técnicas de profundidade — IA, engenharia, filosofia', recent_topics: ['AI research frontiers', 'tech philosophy', 'long-form technical interviews'], profile_url: 'https://www.youtube.com/@lexfridman' },
  ],
  tiktok: [
    { name: 'Tess Posner', handle: '@tessposner', followers: '185k', avg_engagement: '6.2%', niche: 'IA e impacto social — perspectiva crítica', recent_topics: ['AI ethics', 'tech equity', 'algorithmic bias'], profile_url: 'https://www.tiktok.com/search?q=tessposner' },
    { name: 'Futurpedia', handle: '@futurpedia', followers: '430k', avg_engagement: '5.4%', niche: 'Curadoria crítica de ferramentas de IA', recent_topics: ['AI tool reviews', 'workflow automation', 'practical AI use cases'], profile_url: 'https://www.tiktok.com/search?q=futurpedia' },
  ],
}

const HOOK_PATTERNS = [
  { hook: 'Provocação Técnica', example: '"[Tecnologia X] resolve [problema Y] — mas ninguém está fazendo a pergunta certa sobre o custo disso."', frequency: '34%' },
  { hook: 'Análise de Dados', example: '"Analisei [N] casos de [X] e o padrão que emerge contradiz o que os frameworks ensinam."', frequency: '28%' },
  { hook: 'Diagnóstico de Maturidade', example: '"Profissionais júnior fazem [X]. Sêniores com 10 anos de cicatriz fazem [Y] — e a diferença não está na ferramenta."', frequency: '22%' },
  { hook: 'Contradição Fundamentada', example: '"Todo mundo adotou [X] como protocolo padrão. Os dados de adoção dizem o contrário."', frequency: '19%' },
  { hook: 'Consequência Ignorada', example: '"A conversa sobre [X] foca em eficiência. O que ninguém está mapeando é o que isso faz com [Y]."', frequency: '24%' },
  { hook: 'Reframing de Senioridade', example: '"A IA não nivelou o campo. Ela tornou a diferença entre [júnior e sênior] mais visível do que nunca."', frequency: '31%' },
]

const FORMAT_TRENDS = {
  linkedin: [
    { format: 'Carrossel Analítico (Case Study)', trend: '+58%', dominance: '38%' },
    { format: 'Post de Posicionamento (Longo)', trend: '+24%', dominance: '42%' },
    { format: 'Vídeo Técnico Curto', trend: '+91%', dominance: '14%' },
  ],
  instagram: [
    { format: 'Carrossel de Processo / Framework', trend: '+45%', dominance: '40%' },
    { format: 'Reels com Análise Crítica', trend: '+78%', dominance: '35%' },
    { format: 'Post Estático de Posicionamento', trend: '+12%', dominance: '20%' },
  ],
  tiktok: [
    { format: 'Análise Técnica Rápida (< 60s)', trend: '+62%', dominance: '35%' },
    { format: 'Desconstrução de Tendência', trend: '+44%', dominance: '30%' },
  ],
  youtube: [
    { format: 'Technical Deep Dive (15-30 min)', trend: '+38%', dominance: '48%' },
    { format: 'Análise Crítica de Ferramenta / Tendência', trend: '+85%', dominance: '28%' },
    { format: 'Case Study Documentado', trend: '+52%', dominance: '18%' },
  ],
  twitter: [
    { format: 'Thread de Análise Técnica', trend: '+55%', dominance: '52%' },
    { format: 'Tweet de Posicionamento Contrarian', trend: '+30%', dominance: '30%' },
    { format: 'Thread de Processo / Workflow', trend: '+40%', dominance: '14%' },
  ],
}

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function generateOpportunities(topic) {
  return [
    {
      id: `opp-${Date.now()}-1`,
      title: `Arquitetura de Workflow com ${topic}: O que Muda quando a IA Executa o Operacional`,
      description: `Análise aprofundada de como profissionais sêniores estão redesenhando seus fluxos de trabalho com ${topic} — não como hack de produtividade, mas como decisão estratégica sobre onde colocar cognição humana de alto custo.`,
      hook: 'Provocação Técnica',
      hook_example: `"Automatizar ${topic} com IA é a parte fácil. Decidir o que não automatizar é onde a senioria aparece."`,
      format: 'carrossel',
      platform: 'linkedin',
      content_gap: `A maioria dos conteúdos sobre ${topic} foca em ferramentas. Faltam análises sobre a tomada de decisão por trás da arquitetura de workflows.`,
      potential: 'Very High',
    },
    {
      id: `opp-${Date.now()}-2`,
      title: `Os Dados Sobre ${topic} Que Contradizem o Consenso`,
      description: `Uma análise baseada em dados que desafia as premissas mais aceitas sobre ${topic}. Com evidências concretas e consequências práticas para quem toma decisões técnicas.`,
      hook: 'Análise de Dados',
      hook_example: `"Mapeei os padrões de adoção de ${topic} nos últimos 18 meses. O que os dados mostram contradiz o que os frameworks mais populares ensinam."`,
      format: 'thread',
      platform: 'twitter',
      content_gap: `Análises com dados reais e posicionamento técnico sobre ${topic} são escassos em português.`,
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-3`,
      title: `Como Manter Autoria Criativa num Workflow de ${topic} 100% Assistido por IA`,
      description: `O dilema real que profissionais sêniores enfrentam: ganho de escala vs. perda de identidade técnica. Um case study honesto sobre onde a IA ajuda e onde ela apaga o diferencial humano.`,
      hook: 'Consequência Ignorada',
      hook_example: `"A conversa sobre ${topic} foca em velocidade. O que ninguém está mapeando é o que a dependência faz com a sua capacidade de tomar decisões sem assistência."`,
      format: 'video',
      platform: 'youtube',
      content_gap: `Conteúdos sobre os limites e os custos invisíveis da automação em ${topic} são raros e têm alto potencial de diferenciação.`,
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-4`,
      title: `Ética e Viés em ${topic}: A Perspectiva que o Mercado Evita`,
      description: `Uma análise crítica dos vieses estruturais presentes em ${topic} e as consequências para organizações que adotam sem governança. Posicionamento técnico com responsabilidade.`,
      hook: 'Provocação Técnica',
      hook_example: `"O modelo de ${topic} que a sua empresa usa foi treinado com dados que já continham o problema que você quer resolver. Isso não é teoria — é engenharia."`,
      format: 'carrossel',
      platform: 'linkedin',
      content_gap: `Análises de ética e viés em ${topic} com profundidade técnica e linguagem acessível para gestores são praticamente inexistentes em português.`,
      potential: 'Very High',
    },
    {
      id: `opp-${Date.now()}-5`,
      title: `Transição para ${topic}: O que Ninguém Está Ensinando para Profissionais com 10+ Anos`,
      description: `O que diferencia a transição de um sênior para ${topic} de um júnior? A resposta não é técnica — é sobre o que abrir mão, o que reaprender e o que defender.`,
      hook: 'Diagnóstico de Maturidade',
      hook_example: `"Profissionais júnior adotam ${topic} como ferramenta nova. Sêniores com 10 anos de cicatriz precisam de uma conversa diferente — sobre o que isso muda no seu modelo mental."`,
      format: 'reel',
      platform: 'instagram',
      content_gap: `Conteúdos de transição para ${topic} são quase sempre voltados para iniciantes. Falta profundidade para quem já tem bagagem.`,
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-6`,
      title: `ROI Real de ${topic} em Operações Complexas: Análise Sem Hype`,
      description: `Uma avaliação técnica e econômica do retorno real de investir em ${topic} — incluindo os custos ocultos de manutenção, governança, requalificação e dependência de fornecedor.`,
      hook: 'Contradição Fundamentada',
      hook_example: `"Todo mundo otimizou ${topic} para velocidade. Os CFOs que fizeram as contas 18 meses depois têm uma história diferente."`,
      format: 'video',
      platform: 'youtube',
      content_gap: `Análises de ROI honestas e sem viés de venda sobre ${topic} são raras — a maioria dos conteúdos é produzida por quem tem interesse na adoção.`,
      potential: 'Medium',
    },
  ]
}

export function simulateTrendSearch(topic) {
  // Prioriza LinkedIn e YouTube — plataformas de peso para o nicho sênior
  const platformWeights = {
    linkedin: 3,
    youtube: 3,
    twitter: 2,
    instagram: 2,
    tiktok: 1,
  }

  const allCreators = []
  Object.entries(CREATORS_DB).forEach(([plt, pool]) => {
    const weight = platformWeights[plt] || 1
    const count = Math.min(weight, pool.length)
    pickRandom(pool, count).forEach((c) => {
      allCreators.push({ ...c, platform: plt, id: `creator-${Math.random().toString(36).substr(2, 6)}` })
    })
  })

  const creators = pickRandom(allCreators, Math.min(9, allCreators.length))

  const recurringHooks = pickRandom(HOOK_PATTERNS, 4).map((h) => ({
    ...h,
    relevance: `Padrão de alta eficácia para audiências sêniores em ${topic}`,
  }))

  const platforms = ['linkedin', 'twitter', 'instagram', 'youtube', 'tiktok']
  const dominantFormats = []
  platforms.forEach((plt) => {
    const fmts = FORMAT_TRENDS[plt] || []
    if (fmts.length) {
      dominantFormats.push({ platform: plt, formats: fmts.slice(0, 2) })
    }
  })

  const emergingTopics = [
    `Governança de ${topic} em pequenas e médias empresas`,
    `${topic} e autoria criativa: onde a IA ajuda e onde apaga`,
    `Fine-tuning de modelos de ${topic} para contexto organizacional`,
    `Design System Automation com ${topic}`,
    `${topic} para tomadores de decisão sem background técnico`,
    `Prompt Engineering avançado aplicado a ${topic}`,
    `Ética e viés em sistemas de ${topic}`,
    `Transição de carreira para ${topic}: a perspectiva sênior`,
  ]

  const opportunities = generateOpportunities(topic)

  return {
    topic,
    searched_at: new Date().toISOString(),
    creators,
    patterns: {
      recurring_hooks: recurringHooks,
      dominant_formats: dominantFormats,
      emerging_topics: emergingTopics,
    },
    opportunities,
  }
}
