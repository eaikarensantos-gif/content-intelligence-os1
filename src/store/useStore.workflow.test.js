import { beforeAll, beforeEach, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: () => false, getSupabase: () => null }))
let store
beforeAll(async () => {
  const values = new Map()
  vi.stubGlobal('localStorage', { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) })
  store = (await import('./useStore')).default
})
beforeEach(() => store.setState({ ideas: [{ id: 'i1', title: 'Post', script: 'Roteiro aprovado', caption: 'Legenda', client: 'Cliente', client_id: 'c1', reference_links: ['https://example.com'], platforms: ['instagram'], approved_version: { title: 'Post', script: 'Roteiro aprovado' } }], posts: [], tasks: [] }))

it('converter duas vezes a mesma ideia preserva um único post com roteiro e cliente', () => {
  const first = store.getState().convertIdeaToPost('i1')
  const second = store.getState().convertIdeaToPost('i1')
  expect(second).toBe(first)
  expect(store.getState().posts).toHaveLength(1)
  expect(store.getState().posts[0]).toMatchObject({ content: 'Roteiro aprovado', caption: 'Legenda', client_id: 'c1', idea_id: 'i1', reference_links: ['https://example.com'] })
})
it('editar texto preserva a aprovação anterior para comparação', () => {
  store.getState().updateIdea('i1', { script: 'Roteiro alterado' })
  const idea = store.getState().ideas[0]
  expect(idea.approved_version.script).toBe('Roteiro aprovado')
  expect(idea.revisions[0].script).toBe('Roteiro aprovado')
  expect(idea.script).toBe('Roteiro alterado')
})
