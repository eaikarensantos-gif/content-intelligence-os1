import { describe, expect, it } from 'vitest'
import { ANALYSIS_CRITERIA, buildAnalysisPrompt, validateAnalysis, contentBrainLearnings } from './contentAnalysis'

const valid=()=>({
  resumo:'A tese é boa, mas aparece tarde.',funciona:['Tema específico'],
  criticos:[{problema:'Gancho amplo',impacto:'Atrasa a tese',correcao:'Abra pela consequência',exemplo:'Você está perdendo a parte mais forte.'}],
  mudaria_primeiro:'Gancho',como_ficaria:'Abra pela consequência.',
  notas:Object.fromEntries(ANALYSIS_CRITERIA.map(([k])=>[k,8])),
  ganchos:[{nivel:'segura',texto:'A',porque:'Direta'},{nivel:'forte',texto:'B',porque:'Tensão'},{nivel:'ousada',texto:'C',porque:'Contraste'}],
  roteiro:{gancho:'A',desenvolvimento:'B',virada_prova:'C',entrega:'D',cta:'E'},direcao:{enquadramento:'frontal',texto_tela:'A',apoio_visual:'',edicao:'simples',legenda:'abaixo',evitar:[]},alertas:[],
  it('only learns from analyzed content linked to posts and metrics',()=>{
    expect(contentBrainLearnings([],[],[]).learnings).toEqual([])
    const ideas=[1,2,3].map(n=>({id:'i'+n,format:'reels',analysis:{result:{notas:{gancho:8},ganchos:[{}, {nivel:'forte'}]}}}))
    const posts=ideas.map((x,n)=>({id:'p'+n,idea_id:x.id,format:'reels'}))
    const metrics=posts.map((p,n)=>({post_id:p.id,impressions:1000,likes:100+n*10,comments:10,saves:20,shares:5}))
    const learned=contentBrainLearnings(ideas,posts,metrics)
    expect(learned.sample).toBe(3)
    expect(learned.learnings[0].count).toBe(3)
    expect(learned.message).toContain('não provam causalidade')
  })
})

describe('content analysis',()=>{
  it('encodes editorial coaching principles without promising virality',()=>{
    const p=buildAnalysisPrompt({content:'Um roteiro suficientemente longo para análise.',platform:'Instagram'},'trabalho')
    expect(p).toContain('ajuda antes de promoção')
    expect(p).toContain('tensão sem polêmica fabricada')
    expect(p).toContain('não prometa viralização')
    expect(p).toContain('no máximo 3 problemas críticos')
  })
  it('accepts a complete diagnosis',()=>expect(validateAnalysis(valid()).resumo).toContain('tese'))
  it('rejects invented scoring ranges and excessive criticism',()=>{
    const bad=valid();bad.notas.gancho=11;expect(()=>validateAnalysis(bad)).toThrow('notas inválidas')
    const noisy=valid();noisy.criticos=Array(4).fill(noisy.criticos[0]);expect(()=>validateAnalysis(noisy)).toThrow('incompleta')
  })
})
