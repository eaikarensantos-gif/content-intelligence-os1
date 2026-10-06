export const ANALYSIS_CRITERIA = [
  ['gancho','Força do gancho'],['utilidade','Utilidade'],['especificidade','Especificidade'],
  ['tensao','Tensão/interesse'],['narrativa','Narrativa'],['naturalidade','Naturalidade da voz'],
  ['publico','Aderência ao público'],['formato','Formato e nicho'],['clareza','Clareza'],
  ['compartilhamento','Potencial de compartilhamento/salvamento'],['cta','Coerência do CTA'],['identidade','Identidade da criadora'],
]

export function buildAnalysisPrompt(input, persona='trabalho') {
  return `Analise o conteúdo abaixo como editor estratégico. Não invente fatos nem prometa viralização.
PERSONA: ${persona}
PLATAFORMA: ${input.platform || 'não informada'}
OBJETIVO: ${input.goal || 'inferir com cautela'}
PÚBLICO: ${input.audience || 'inferir com cautela'}
QUADRO: ${input.series || 'não informado'}
CONTEÚDO:
${input.content}

Princípios: ajuda antes de promoção; cliente antes dos pares; abrir pelo ponto forte; preferir gancho com conclusão/tensão/promessa a pergunta genérica; história e transformação quando houver material; voz falável e humana; próxima ação prática; tensão sem polêmica fabricada; uma ideia legível; CTA proporcional; preservar identidade.
Priorize no máximo 3 problemas críticos. Se estiver forte, não invente defeitos.
Retorne somente JSON no schema:
${JSON.stringify({
  resumo:'Diagnóstico em uma frase',
  funciona:['Ponto que deve ser preservado'],
  criticos:[{problema:'',impacto:'',correcao:'',exemplo:''}],
  mudaria_primeiro:'Mudança de maior impacto',
  como_ficaria:'Trecho reescrito curto',
  notas:Object.fromEntries(ANALYSIS_CRITERIA.map(([k])=>[k,8])),
  ganchos:[{nivel:'segura',texto:'',porque:''},{nivel:'forte',texto:'',porque:''},{nivel:'ousada',texto:'',porque:''}],
  roteiro:{gancho:'',desenvolvimento:'',virada_prova:'',entrega:'',cta:''},
  direcao:{enquadramento:'',texto_tela:'',apoio_visual:'',edicao:'',legenda:'',evitar:[]},
  alertas:[],
})}`
}

export function validateAnalysis(r) {
  if (!r || typeof r.resumo !== 'string' || !Array.isArray(r.funciona) || !Array.isArray(r.criticos) || r.criticos.length > 3 || !Array.isArray(r.ganchos) || r.ganchos.length !== 3 || !r.roteiro || !r.notas || !r.direcao) throw new Error('A análise veio incompleta. Tente novamente.')
  for (const [key] of ANALYSIS_CRITERIA) if (!Number.isFinite(r.notas[key]) || r.notas[key] < 0 || r.notas[key] > 10) throw new Error('A análise trouxe notas inválidas. Tente novamente.')
  for (const item of r.criticos) if (!['problema','impacto','correcao','exemplo'].every(k=>typeof item[k]==='string'&&item[k].trim())) throw new Error('A análise veio incompleta. Tente novamente.')
  return r
}


export function contentBrainLearnings(ideas=[], posts=[], metrics=[]) {
  const analyzed=ideas.filter(i=>i.analysis?.result?.notas)
  const published=analyzed.map(idea=>{
    const post=posts.find(p=>p.idea_id===idea.id || p.id===idea.post_id)
    if(!post) return null
    const metric=metrics.find(m=>m.post_id===post.id)
    if(!metric) return null
    const engagement=(metric.likes||0)+(metric.comments||0)+(metric.shares||0)+(metric.saves||0)
    const rate=metric.impressions ? engagement/metric.impressions : 0
    return {idea,post,metric,rate}
  }).filter(Boolean)
  if(published.length<3) return {sample:published.length,learnings:[],message:'Publique e registre métricas de pelo menos 3 conteúdos analisados para o Content Brain começar a comparar padrões.'}
  const groups={}
  for(const x of published){
    const hook=x.idea.analysis.result.ganchos?.[1]?.nivel || 'analisado'
    const format=x.post.format||x.idea.format||'outro'
    const key=`${format}|${hook}`
    groups[key] ||= {format,hook,count:0,total:0}
    groups[key].count++; groups[key].total+=x.rate
  }
  const learnings=Object.values(groups).filter(g=>g.count>=2).map(g=>({...g,avg:g.total/g.count})).sort((a,b)=>b.avg-a.avg).slice(0,5)
  return {sample:published.length,learnings,message:learnings.length?'Comparações observacionais do seu histórico; não provam causalidade.':'Ainda não há grupos comparáveis suficientes para afirmar um padrão.'}
}
