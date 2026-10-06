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
  alertas:[],
})}`
}

export function validateAnalysis(r) {
  if (!r || typeof r.resumo !== 'string' || !Array.isArray(r.funciona) || !Array.isArray(r.criticos) || r.criticos.length > 3 || !Array.isArray(r.ganchos) || r.ganchos.length !== 3 || !r.roteiro || !r.notas) throw new Error('A análise veio incompleta. Tente novamente.')
  for (const [key] of ANALYSIS_CRITERIA) if (!Number.isFinite(r.notas[key]) || r.notas[key] < 0 || r.notas[key] > 10) throw new Error('A análise trouxe notas inválidas. Tente novamente.')
  for (const item of r.criticos) if (!['problema','impacto','correcao','exemplo'].every(k=>typeof item[k]==='string'&&item[k].trim())) throw new Error('A análise veio incompleta. Tente novamente.')
  return r
}
