import { describe, it, expect } from 'vitest'
import { copyEditorialFields } from './useStore'

describe('copyEditorialFields — campos editoriais copiados de ideia pra post (ver src/data/editorialStrategy.js)', () => {
  it('copia todos os campos quando a ideia já os tem', () => {
    const idea = {
      editorial_function: 'critical_reading',
      editorial_series: 'who_pays',
      audience_cut: 'founder',
      observed_situation: 'Cliente perguntou sobre preço',
      evidence: 'Planilha de custo real',
      material_cost: 'R$ 500/mês',
      decision_supported: 'Contratar ou não a ferramenta',
      desired_response: 'Comentário com experiência similar',
      source_comment_ids: ['c1', 'c2'],
      editorial_confidence: 'high',
    }
    expect(copyEditorialFields(idea)).toEqual(idea)
  })

  it('retrocompatível — ideia antiga sem nenhum campo editorial devolve tudo null/[], sem lançar erro', () => {
    const oldIdea = { id: '1', title: 'Ideia de antes dessa camada existir' }
    expect(() => copyEditorialFields(oldIdea)).not.toThrow()
    expect(copyEditorialFields(oldIdea)).toEqual({
      editorial_function: null,
      editorial_series: null,
      audience_cut: null,
      observed_situation: null,
      evidence: null,
      material_cost: null,
      decision_supported: null,
      desired_response: null,
      source_comment_ids: [],
      editorial_confidence: null,
    })
  })

  it('não lança erro pra idea undefined/null', () => {
    expect(() => copyEditorialFields(undefined)).not.toThrow()
    expect(() => copyEditorialFields(null)).not.toThrow()
    expect(copyEditorialFields(null).editorial_function).toBe(null)
  })
})
