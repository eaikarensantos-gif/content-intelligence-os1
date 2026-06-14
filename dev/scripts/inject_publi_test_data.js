/**
 * SCRIPT DE INJEÇÃO DE DADOS DE TESTE - PUBLI
 *
 * Use este script no console do navegador (F12 > Console) para injetar
 * dados de teste com sinalizadores de publi no localStorage.
 *
 * Copy e paste tudo abaixo no console e execute.
 */

(() => {
  // UUID generator
  const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Gerar datas em abril de 2026
  const getRandomDateInApril2026 = () => {
    const day = Math.floor(Math.random() * 28) + 1;
    return `2026-04-${String(day).padStart(2, '0')}`;
  };

  // Sinalizadores de publi
  const PUBLI_SIGNALS = ['#publi', '#ad', '#parceria', '#publicidade', '#sponsored', '#parceiro'];

  // Dados de teste - Posts com sinalizadores publi
  const testMetrics = [
    // Instagram Posts
    {
      id: uuidv4(),
      created_at: '2026-04-15T10:30:00Z',
      date: '2026-04-15',
      platform: 'instagram',
      impressions: 4500,
      likes: 250,
      comments: 45,
      shares: 12,
      engagement_rate: 0.0865,
      description: 'Novo produto lançado! 🚀 Confira a campanha #publi com @marca_premium. Engajamento em alta!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-12T14:20:00Z',
      date: '2026-04-12',
      platform: 'linkedin',
      impressions: 2200,
      likes: 120,
      comments: 28,
      shares: 5,
      engagement_rate: 0.0742,
      description: 'Parceria estratégica #parceria com @empresa_destaque. Ótimos resultados em B2B!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-10T09:15:00Z',
      date: '2026-04-10',
      platform: 'instagram',
      impressions: 3800,
      likes: 180,
      comments: 38,
      shares: 8,
      engagement_rate: 0.0698,
      description: 'Conteúdo patrocinado #ad para @brand_luxo. Performance acima do esperado!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-08T16:45:00Z',
      date: '2026-04-08',
      platform: 'linkedin',
      impressions: 1800,
      likes: 85,
      comments: 15,
      shares: 2,
      engagement_rate: 0.0615,
      description: '#publicidade corporativa com @startup_tech. Alcance de profissionais qualificados.',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-05T11:30:00Z',
      date: '2026-04-05',
      platform: 'instagram',
      impressions: 5200,
      likes: 312,
      comments: 62,
      shares: 18,
      engagement_rate: 0.0919,
      description: 'Campanha #sponsored com @influencer_global. Resultado excepcional em alcance!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-03T13:00:00Z',
      date: '2026-04-03',
      platform: 'instagram',
      impressions: 3100,
      likes: 165,
      comments: 41,
      shares: 9,
      engagement_rate: 0.0751,
      description: '#parceiro exclusivo @marca_fashion. Lançamento de coleção especial.',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-01T15:20:00Z',
      date: '2026-04-01',
      platform: 'linkedin',
      impressions: 2900,
      likes: 145,
      comments: 32,
      shares: 8,
      engagement_rate: 0.0675,
      description: '#publi estratégica com @empresa_consultoria. Geração de leads qualificados.',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-18T10:10:00Z',
      date: '2026-04-18',
      platform: 'instagram',
      impressions: 4100,
      likes: 228,
      comments: 51,
      shares: 14,
      engagement_rate: 0.0843,
      description: '#ad criativa com @brand_lifestyle. Crescimento de 45% em engajamento!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-20T12:45:00Z',
      date: '2026-04-20',
      platform: 'linkedin',
      impressions: 3400,
      likes: 178,
      comments: 39,
      shares: 11,
      engagement_rate: 0.0743,
      description: '#publicidade B2B com @tech_solutions. Posicionamento premium alcançado.',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-22T14:30:00Z',
      date: '2026-04-22',
      platform: 'instagram',
      impressions: 6100,
      likes: 367,
      comments: 74,
      shares: 21,
      engagement_rate: 0.1043,
      description: '#sponsored mega campanha com @mega_brand. Melhor ER do mês!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-25T09:55:00Z',
      date: '2026-04-25',
      platform: 'linkedin',
      impressions: 2100,
      likes: 98,
      comments: 22,
      shares: 4,
      engagement_rate: 0.0581,
      description: '#parceria com @banco_central. Confiança e segurança em primeiro lugar.',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-28T16:20:00Z',
      date: '2026-04-28',
      platform: 'instagram',
      impressions: 3900,
      likes: 214,
      comments: 48,
      shares: 11,
      engagement_rate: 0.0795,
      description: '#parceiro estratégico @retail_leader. Integração perfeita de marca.',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    },
    {
      id: uuidv4(),
      created_at: '2026-04-30T11:15:00Z',
      date: '2026-04-30',
      platform: 'linkedin',
      impressions: 2750,
      likes: 142,
      comments: 31,
      shares: 9,
      engagement_rate: 0.0667,
      description: '#publi final do mês com @corporate_brand. Retrospectiva de sucesso!',
      postUrl: '#',
      client_id: null,
      type: 'metric'
    }
  ];

  // Recuperar dados existentes do localStorage
  const storageName = 'content-intelligence-os-v3';
  const existing = JSON.parse(localStorage.getItem(storageName) || '{}');

  // Adicionar novos metrics ao estado existente
  const existingMetrics = existing.state?.metrics || [];
  const updatedMetrics = [...existingMetrics, ...testMetrics];

  // Atualizar localStorage com os novos dados
  const updatedState = {
    ...existing.state,
    metrics: updatedMetrics
  };

  const dataToStore = {
    state: updatedState,
    version: existing.version || 0
  };

  localStorage.setItem(storageName, JSON.stringify(dataToStore));

  console.log('✅ Dados de teste injetados com sucesso!');
  console.log(`📊 Total de métricas publi adicionadas: ${testMetrics.length}`);
  console.log(`📈 Total de métricas no sistema: ${updatedMetrics.length}`);
  console.log('\n🔄 Recarregando página em 2 segundos...');

  setTimeout(() => {
    window.location.reload();
  }, 2000);
})();
