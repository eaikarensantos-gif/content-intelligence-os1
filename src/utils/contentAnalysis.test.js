import { describe, expect, it } from 'vitest'
import { ANALYSIS_CRITERIA, buildAnalysisPrompt, validateAnalysis } from './contentAnalysis'

const valid=()=>({
  resumo:'A tese é boa, mas aparece tarde.',funciona:['Tema específico'],
  criticos:[{problema:'Gancho amplo',impacto:'Atrasa a tese',correcao:'Abra pela consequência',exemplo:'Você está perdendo a parte mais forte.'}],
  mudaria_primeiro:'Gancho',como_ficaria:'Abra pela consequência.',
  notas:Object.fromEntries(ANALYSIS_CRITERIA.map(([k])=>[k,8])),
  ganchos:[{nivel:'segura',texto:'A',porque:'Direta'},{nivel:'forte',texto:'B',porque:'Tensão'},{nivel:'ousada',texto:'C',porque:'Contraste'}],
  roteiro:{gancho:'A',desenvolvimento:'B',virada_prova:'C',entrega:'D',cta:'E'},alertas:[],
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
