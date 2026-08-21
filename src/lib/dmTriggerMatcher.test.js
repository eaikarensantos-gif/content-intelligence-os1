import { describe, it, expect } from 'vitest'
import { matchTrigger, findMatchingRule } from './dmTriggerMatcher'

function rule(overrides) {
  return { active: true, event_type: 'comment', match_mode: 'any_comment_on_post', ...overrides }
}

describe('matchTrigger', () => {
  it('ignora regra inativa', () => {
    const r = rule({ active: false, post_id: 'm1' })
    expect(matchTrigger(r, { type: 'comment', mediaId: 'm1' })).toBe(false)
  })

  it('ignora regra de tipo de evento diferente', () => {
    const r = rule({ event_type: 'message', match_mode: 'first_message' })
    expect(matchTrigger(r, { type: 'comment', mediaId: 'm1' })).toBe(false)
  })

  describe('any_comment_on_post', () => {
    it('bate quando o comentário é no post configurado', () => {
      const r = rule({ post_id: 'm1' })
      expect(matchTrigger(r, { type: 'comment', mediaId: 'm1' })).toBe(true)
    })

    it('não bate em post diferente', () => {
      const r = rule({ post_id: 'm1' })
      expect(matchTrigger(r, { type: 'comment', mediaId: 'm2' })).toBe(false)
    })

    it('não bate sem post_id configurado', () => {
      const r = rule({ post_id: null })
      expect(matchTrigger(r, { type: 'comment', mediaId: 'm1' })).toBe(false)
    })
  })

  describe('keyword_exact', () => {
    it('bate com o texto exato, ignorando espaços e maiúsculas', () => {
      const r = rule({ match_mode: 'keyword_exact', match_value: 'Quero o link' })
      expect(matchTrigger(r, { type: 'comment', text: '  quero o link  ' })).toBe(true)
    })

    it('não bate com texto parcial', () => {
      const r = rule({ match_mode: 'keyword_exact', match_value: 'quero o link' })
      expect(matchTrigger(r, { type: 'comment', text: 'eu quero o link, por favor' })).toBe(false)
    })
  })

  describe('keyword_partial', () => {
    it('bate quando a palavra-chave aparece em qualquer parte', () => {
      const r = rule({ match_mode: 'keyword_partial', match_value: 'link' })
      expect(matchTrigger(r, { type: 'comment', text: 'me manda o LINK por favor' })).toBe(true)
    })

    it('não bate quando falta a palavra-chave', () => {
      const r = rule({ match_mode: 'keyword_partial', match_value: 'link' })
      expect(matchTrigger(r, { type: 'comment', text: 'muito bom esse post' })).toBe(false)
    })

    it('não bate quando a regra não tem match_value', () => {
      const r = rule({ match_mode: 'keyword_partial', match_value: '' })
      expect(matchTrigger(r, { type: 'comment', text: 'qualquer coisa' })).toBe(false)
    })
  })

  describe('first_message', () => {
    it('bate em qualquer mensagem (checagem de "é a primeira" é feita fora)', () => {
      const r = rule({ event_type: 'message', match_mode: 'first_message' })
      expect(matchTrigger(r, { type: 'message', text: 'oi' })).toBe(true)
    })
  })

  it('retorna false para match_mode desconhecido', () => {
    const r = rule({ match_mode: 'algo-inventado' })
    expect(matchTrigger(r, { type: 'comment' })).toBe(false)
  })
})

describe('findMatchingRule', () => {
  it('retorna a primeira regra que bater', () => {
    const rules = [
      rule({ id: 'r1', match_mode: 'keyword_exact', match_value: 'a' }),
      rule({ id: 'r2', post_id: 'm1' }),
    ]
    const found = findMatchingRule(rules, { type: 'comment', mediaId: 'm1', text: 'b' })
    expect(found.id).toBe('r2')
  })

  it('retorna null quando nenhuma regra bate', () => {
    const rules = [rule({ post_id: 'm1' })]
    expect(findMatchingRule(rules, { type: 'comment', mediaId: 'm2' })).toBeNull()
  })
})
