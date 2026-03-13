const CREATORS_DB = {
  linkedin: [
    { name: 'Ana Carvalho', handle: '@anacarvalho', followers: '87k', avg_engagement: '4.8%', niche: 'Estratégia de conteúdo e criação digital', recent_topics: ['sistemas de conteúdo', 'monetização', 'LinkedIn'], profile_url: 'https://www.linkedin.com/search/results/people/?keywords=ana+carvalho+content' },
    { name: 'Bruno Mendes', handle: '@brunomendes', followers: '210k', avg_engagement: '5.2%', niche: 'Carreira e desenvolvimento profissional', recent_topics: ['liderança', 'mercado de trabalho', 'habilidades do futuro'], profile_url: 'https://www.linkedin.com/search/results/people/?keywords=bruno+mendes+carreira' },
    { name: 'Fernanda Lima', handle: '@fernandalima', followers: '145k', avg_engagement: '4.1%', niche: 'Empreendedorismo e negócios digitais', recent_topics: ['solopreneur', 'negócios', 'produtividade'], profile_url: 'https://www.linkedin.com/search/results/people/?keywords=fernanda+lima+empreendedorismo' },
    { name: 'Ricardo Souza', handle: '@ricardosouza', followers: '320k', avg_engagement: '3.9%', niche: 'Marketing digital e crescimento', recent_topics: ['estratégia digital', 'tráfego pago', 'funil de vendas'], profile_url: 'https://www.linkedin.com/search/results/people/?keywords=ricardo+souza+marketing' },
    { name: 'Justin Welsh', handle: '@justinwelsh', followers: '580k', avg_engagement: '6.2%', niche: 'Solopreneurship & content systems', recent_topics: ['one-person business', 'content systems', 'LinkedIn growth'], profile_url: 'https://www.linkedin.com/in/justinwelsh/' },
    { name: 'Lara Acosta', handle: '@laraacosta', followers: '420k', avg_engagement: '7.1%', niche: 'Personal branding & LinkedIn strategy', recent_topics: ['personal brand', 'LinkedIn content', 'audience building'], profile_url: 'https://www.linkedin.com/in/lara-acosta-/' },
    { name: 'Matt Gray', handle: '@mattgray', followers: '340k', avg_engagement: '5.8%', niche: 'Building in public & systems', recent_topics: ['creator economy', 'build in public', 'business systems'], profile_url: 'https://www.linkedin.com/in/matt-gray-/' },
  ],
  twitter: [
    { name: 'Thiago Alves', handle: '@thiagoalves', followers: '95k', avg_engagement: '5.5%', niche: 'Escrita online e construção de audiência', recent_topics: ['escrita persuasiva', 'audiência', 'copywriting'], profile_url: 'https://x.com/search?q=thiagoalves+content&f=user' },
    { name: 'Mariana Castro', handle: '@marianacastro', followers: '78k', avg_engagement: '6.1%', niche: 'Tecnologia e inovação', recent_topics: ['IA', 'startups', 'futuro do trabalho'], profile_url: 'https://x.com/search?q=marianacastro+tech&f=user' },
    { name: 'Lucas Ferreira', handle: '@lucasferreira', followers: '54k', avg_engagement: '4.7%', niche: 'Finanças pessoais e investimentos', recent_topics: ['independência financeira', 'renda passiva', 'investimentos'], profile_url: 'https://x.com/search?q=lucasferreira+financas&f=user' },
    { name: 'Dickie Bush', handle: '@dickiebush', followers: '390k', avg_engagement: '5.3%', niche: 'Writing online & audience growth', recent_topics: ['Ship 30 for 30', 'atomic essays', 'writing habits'], profile_url: 'https://x.com/dickiebush' },
    { name: 'Nicolas Cole', handle: '@nicolascole77', followers: '210k', avg_engagement: '6.4%', niche: 'Digital writing & ghostwriting', recent_topics: ['digital writing', 'ghostwriting', 'category design'], profile_url: 'https://x.com/nicolascole77' },
    { name: 'Sahil Bloom', handle: '@sahilbloom', followers: '960k', avg_engagement: '4.9%', niche: 'Business, finance & self-improvement', recent_topics: ['mental models', 'wealth building', 'personal growth'], profile_url: 'https://x.com/SahilBloom' },
  ],
  instagram: [
    { name: 'Camila Ramos', handle: '@camilaramos', followers: '1.2M', avg_engagement: '3.8%', niche: 'Lifestyle e marca pessoal', recent_topics: ['rotina', 'disciplina', 'vida intencional'], profile_url: 'https://www.instagram.com/explore/search/keyword/?q=camilaramos' },
    { name: 'Pedro Nunes', handle: '@pedronunes', followers: '680k', avg_engagement: '4.3%', niche: 'Marketing e vendas', recent_topics: ['vendas no Instagram', 'lançamentos', 'autoridade'], profile_url: 'https://www.instagram.com/explore/search/keyword/?q=pedronunes+marketing' },
    { name: 'Juliana Farias', handle: '@julianafarias', followers: '430k', avg_engagement: '5.0%', niche: 'Criatividade e design', recent_topics: ['design', 'criatividade', 'carreira criativa'], profile_url: 'https://www.instagram.com/explore/search/keyword/?q=julianafarias+design' },
    { name: 'Alex Hormozi', handle: '@hormozi', followers: '2.8M', avg_engagement: '4.1%', niche: 'Business growth & sales', recent_topics: ['offers', 'sales', 'business scaling'], profile_url: 'https://www.instagram.com/hormozi/' },
    { name: 'Gary Vaynerchuk', handle: '@garyvee', followers: '10.2M', avg_engagement: '2.3%', niche: 'Entrepreneurship & social media', recent_topics: ['content marketing', 'NFTs', 'self-awareness'], profile_url: 'https://www.instagram.com/garyvee/' },
  ],
  youtube: [
    { name: 'Eduardo Motta', handle: '@eduardomotta', followers: '2.1M', avg_engagement: '4.5%', niche: 'Produtividade e ferramentas digitais', recent_topics: ['Notion', 'produtividade', 'ferramentas de IA'], profile_url: 'https://www.youtube.com/@eduardomotta' },
    { name: 'Gabriela Torres', handle: '@gabrielatorres', followers: '890k', avg_engagement: '3.7%', niche: 'Desenvolvimento pessoal', recent_topics: ['mentalidade', 'hábitos', 'autoconhecimento'], profile_url: 'https://www.youtube.com/@gabrielatorres' },
    { name: 'Renato Silva', handle: '@renatosilva', followers: '1.5M', avg_engagement: '4.1%', niche: 'Negócios e empreendedorismo', recent_topics: ['negócios digitais', 'receita recorrente', 'escala'], profile_url: 'https://www.youtube.com/@renatosilva' },
    { name: 'Ali Abdaal', handle: '@aliabdaal', followers: '5.4M', avg_engagement: '4.8%', niche: 'Productivity & creator business', recent_topics: ['productivity systems', 'YouTube growth', 'feel-good productivity'], profile_url: 'https://www.youtube.com/@aliabdaal' },
    { name: 'Thomas Frank', handle: '@ThomasFrank', followers: '3.2M', avg_engagement: '4.2%', niche: 'Study skills & productivity', recent_topics: ['Notion templates', 'study techniques', 'focus'], profile_url: 'https://www.youtube.com/@ThomasFrank' },
    { name: 'Nathaniel Drew', handle: '@nathanieldrew', followers: '1.9M', avg_engagement: '5.1%', niche: 'Minimalism & intentional living', recent_topics: ['minimalism', 'digital detox', 'life design'], profile_url: 'https://www.youtube.com/@nathanieldrew' },
  ],
  tiktok: [
    { name: 'Beatriz Costa', handle: '@beatrizcosta', followers: '3.4M', avg_engagement: '7.2%', niche: 'Criadores de conteúdo e estratégia', recent_topics: ['viral', 'ganchos', 'crescimento no TikTok'], profile_url: 'https://www.tiktok.com/search?q=beatrizcosta' },
    { name: 'Igor Pimentel', handle: '@igorpimentel', followers: '1.8M', avg_engagement: '8.1%', niche: 'Educação e entretenimento', recent_topics: ['storytelling', 'persuasão', 'educação rápida'], profile_url: 'https://www.tiktok.com/search?q=igorpimentel' },
    { name: 'Codie Sanchez', handle: '@codiesanchez', followers: '2.3M', avg_engagement: '6.9%', niche: 'Contrarian investing & business', recent_topics: ['boring businesses', 'cash flow', 'financial freedom'], profile_url: 'https://www.tiktok.com/@codiesancheztx' },
    { name: 'Vanessa Lau', handle: '@vanessalau', followers: '1.1M', avg_engagement: '5.7%', niche: 'Social media & content strategy', recent_topics: ['Instagram growth', 'content creation', 'online business'], profile_url: 'https://www.tiktok.com/@iamvanessalau' },
  ],
}

const HOOK_PATTERNS = [
  { hook: 'Gancho de Lista', example: '"X coisas que ninguém te conta sobre [TOPICO]"', frequency: '38%' },
  { hook: 'Gancho Contrário', example: '"Todos dizem [X] — estão errados. Aqui está o porquê..."', frequency: '24%' },
  { hook: 'Gancho de História', example: '"Eu [fiz algo] e o que aconteceu mudou tudo..."', frequency: '21%' },
  { hook: 'Gancho de Dados', example: '"Analisei 1.000 [X] e descobri isso:"', frequency: '17%' },
  { hook: 'Gancho de Problema', example: '"O real motivo pelo qual [DOR] acontece (e como resolver)"', frequency: '29%' },
  { hook: 'Gancho de Pergunta', example: '"E se [sabedoria convencional] estiver te limitando?"', frequency: '22%' },
]

const FORMAT_TRENDS = {
  linkedin: [
    { format: 'Carrossel', trend: '+42%', dominance: '35%' },
    { format: 'Post de Texto Longo', trend: '+18%', dominance: '40%' },
    { format: 'Vídeo Curto', trend: '+85%', dominance: '15%' },
  ],
  instagram: [
    { format: 'Reels', trend: '+120%', dominance: '55%' },
    { format: 'Carrossel', trend: '+30%', dominance: '30%' },
    { format: 'Post Estático', trend: '-15%', dominance: '15%' },
  ],
  tiktok: [
    { format: 'Vídeo Curto (< 30s)', trend: '+55%', dominance: '40%' },
    { format: 'Tutorial / Como Fazer', trend: '+38%', dominance: '30%' },
    { format: 'Dueto de Tendência', trend: '+22%', dominance: '20%' },
  ],
  youtube: [
    { format: 'Vídeo Longo (10-20 min)', trend: '+12%', dominance: '45%' },
    { format: 'YouTube Shorts', trend: '+200%', dominance: '30%' },
    { format: 'Estilo Documentário', trend: '+65%', dominance: '15%' },
  ],
  twitter: [
    { format: 'Thread', trend: '+48%', dominance: '50%' },
    { format: 'Tweet Único', trend: '-8%', dominance: '35%' },
    { format: 'Spaces', trend: '+15%', dominance: '10%' },
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
      title: `${topic}: O Guia Completo para Iniciantes em 2025`,
      description: `Um guia abrangente e prático sobre ${topic}, cobrindo desde os conceitos básicos até estratégias avançadas. Ideal para quem quer começar sem cometer os erros mais comuns.`,
      hook: 'Gancho de Lista',
      hook_example: `"7 coisas que eu gostaria de saber antes de começar com ${topic}"`,
      format: 'carrossel',
      platform: 'linkedin',
      content_gap: `Faltam guias práticos em português sobre ${topic} acessíveis para a audiência brasileira.`,
      potential: 'Very High',
    },
    {
      id: `opp-${Date.now()}-2`,
      title: `Por Que Todo Conselho Sobre ${topic} Está Errado`,
      description: `Uma abordagem contrária que desafia o senso comum sobre ${topic}. Baseado em dados reais e experiências práticas.`,
      hook: 'Gancho Contrário',
      hook_example: `"Todo mundo fala pra você fazer X com ${topic}, mas os dados mostram o oposto..."`,
      format: 'thread',
      platform: 'twitter',
      content_gap: `Poucas vozes trazem perspectivas contrárias embasadas sobre ${topic}.`,
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-3`,
      title: `Passei 6 Meses Dominando ${topic} — Tudo Que Aprendi`,
      description: `Uma jornada pessoal documentando os aprendizados, fracassos e vitórias de mergulhar fundo em ${topic}. Autêntico e cheio de lições práticas.`,
      hook: 'Gancho de História',
      hook_example: `"Eu errei feio com ${topic} por meses. Aqui está o que finalmente funcionou."`,
      format: 'video',
      platform: 'youtube',
      content_gap: `Conteúdos pessoais sobre a jornada real com ${topic} são raros e muito valorizados.`,
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-4`,
      title: `Os Dados Sobre ${topic} Que Ninguém Está Mostrando`,
      description: `Uma análise de estatísticas subreportadas e tendências emergentes em ${topic}. Insights baseados em dados que oferecem vantagem competitiva.`,
      hook: 'Gancho de Dados',
      hook_example: `"Analisei 500 posts sobre ${topic} e os resultados me surpreenderam:"`,
      format: 'carrossel',
      platform: 'linkedin',
      content_gap: `Conteúdos baseados em dados reais sobre ${topic} em português são escassos.`,
      potential: 'Very High',
    },
    {
      id: `opp-${Date.now()}-5`,
      title: `O Erro Mais Caro Que Você Pode Cometer Com ${topic}`,
      description: `Um mergulho profundo no equívoco mais comum em ${topic}, por que ele acontece e um caminho claro para corrigi-lo.`,
      hook: 'Gancho de Problema',
      hook_example: `"Esse erro simples em ${topic} me custou meses de progresso. Não cometa o mesmo."`,
      format: 'reel',
      platform: 'instagram',
      content_gap: `Conteúdos sobre erros práticos em ${topic} têm alta taxa de engajamento e baixa concorrência.`,
      potential: 'High',
    },
    {
      id: `opp-${Date.now()}-6`,
      title: `Vale a Pena Investir em ${topic} em 2025? A Resposta Honesta`,
      description: `Uma análise imparcial sobre o real valor de ${topic} hoje. Corta o hype para entregar perspectiva real.`,
      hook: 'Gancho de Pergunta',
      hook_example: `"Antes de gastar tempo e dinheiro em ${topic}, assiste esse vídeo."`,
      format: 'video',
      platform: 'youtube',
      content_gap: `Avaliações honestas e sem viés sobre ${topic} são raras — a maioria é patrocinada ou superficial.`,
      potential: 'Medium',
    },
  ]
}

export function simulateTrendSearch(topic) {
  const platforms = ['linkedin', 'twitter', 'instagram', 'youtube', 'tiktok']
  const allCreators = []
  platforms.forEach((plt) => {
    const pool = CREATORS_DB[plt] || []
    pickRandom(pool, Math.min(2, pool.length)).forEach((c) => {
      allCreators.push({ ...c, platform: plt, id: `creator-${Math.random().toString(36).substr(2, 6)}` })
    })
  })

  const creators = pickRandom(allCreators, Math.min(9, allCreators.length))

  const recurringHooks = pickRandom(HOOK_PATTERNS, 4).map((h) => ({
    ...h,
    relevance: `Altamente eficaz para conteúdo sobre ${topic}`,
  }))

  const dominantFormats = []
  platforms.forEach((plt) => {
    const fmts = FORMAT_TRENDS[plt] || []
    if (fmts.length) {
      dominantFormats.push({ platform: plt, formats: fmts.slice(0, 2) })
    }
  })

  const emergingTopics = [
    `${topic} para iniciantes`,
    `${topic} com inteligência artificial`,
    `cases de sucesso em ${topic}`,
    `futuro do ${topic}`,
    `monetização com ${topic}`,
    `${topic} na prática`,
    `ferramentas de ${topic}`,
    `erros comuns em ${topic}`,
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
