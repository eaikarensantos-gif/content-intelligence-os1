import { describe, expect, it } from 'vitest'
import { matchingIdeas, productionTask, reviseIdea } from './ideaWorkflow'

describe('produção de ideias', () => {
  it('guarda o conteúdo anterior sem recursão nem perda ao restaurar', () => {
    const original = { id: 'a', title: 'Título', script: 'Versão 1', status: 'idea' }
    const updated = reviseIdea(original, { script: 'Versão 2' }, '2026-10-02T12:00:00Z')
    expect(updated.revisions[0].script).toBe('Versão 1')
    expect(original.revisions).toBeUndefined()
    const restored = reviseIdea(updated, updated.revisions[0])
    expect(restored.script).toBe('Versão 1')
    expect(restored.revisions.map(v => v.script)).toEqual(['Versão 1', 'Versão 2'])
  })
  it('mudanças de status não fabricam versões editoriais', () => {
    expect(reviseIdea({ title: 'A' }, { status: 'ready' }).revisions).toEqual([])
  })
  it('compara títulos sem apagar versões ou confundir assuntos diferentes', () => {
    const ideas = [{ id: 'a', title: 'A decisão!' }, { id: 'b', title: 'A decisao' }, { id: 'c', title: 'Outra decisão' }]
    expect(matchingIdeas(ideas, ' A DECISÃO ', 'a').map(v => v.id)).toEqual(['b'])
    expect(matchingIdeas(ideas, '', 'a')).toEqual([])
  })
  it('leva vínculo e prazo sem marcar produção concluída', () => {
    expect(productionTask({ id: 'a', title: 'Post', scheduled_date: '2026-10-10', status: 'published' })).toMatchObject({ idea_id: 'a', due_date: '2026-10-10', status: 'todo' })
  })
})
