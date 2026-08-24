import { describe, it, expect } from 'vitest'
import { mergeById } from './useStore'

describe('mergeById — loadFromDB não deve apagar cards locais ainda não sincronizados', () => {
  it('mantém cards locais que ainda não chegaram no Supabase (auto-save de 2.5s não rodou)', () => {
    const dbList = [{ id: '1', title: 'Card antigo' }]
    const localList = [
      { id: '1', title: 'Card antigo' },
      { id: '2', title: 'Card novo criado no Hub' },
    ]
    const out = mergeById(dbList, localList)
    expect(out).toEqual([
      { id: '1', title: 'Card antigo' },
      { id: '2', title: 'Card novo criado no Hub' },
    ])
  })

  it('usa a versão do Supabase quando o id existe nos dois lados (ex.: status mudou em outro dispositivo)', () => {
    const dbList = [{ id: '1', title: 'Card', status: 'ready' }]
    const localList = [{ id: '1', title: 'Card', status: 'idea' }]
    const out = mergeById(dbList, localList)
    expect(out).toEqual([{ id: '1', title: 'Card', status: 'ready' }])
  })

  it('retorna a lista local intocada quando o Supabase ainda não tem nada', () => {
    const localList = [{ id: '1', title: 'Card novo' }]
    expect(mergeById([], localList)).toBe(localList)
    expect(mergeById(undefined, localList)).toBe(localList)
    expect(mergeById(null, localList)).toBe(localList)
  })

  it('não quebra quando a lista local está vazia', () => {
    const dbList = [{ id: '1', title: 'Card' }]
    expect(mergeById(dbList, [])).toEqual(dbList)
    expect(mergeById(dbList, undefined)).toEqual(dbList)
  })
})
