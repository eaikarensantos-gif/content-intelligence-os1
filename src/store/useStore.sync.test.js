import { beforeAll, afterEach, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: () => true }))
vi.mock('../lib/db', () => ({ COLLECTIONS: ['ideas'], dbLoadAll: vi.fn(), dbSaveAll: vi.fn().mockResolvedValue(true) }))
import { dbSaveAll } from '../lib/db'
let store
beforeAll(async () => {
  const values = new Map()
  vi.stubGlobal('localStorage', { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) })
  store = (await import('./useStore')).default
})
afterEach(() => vi.useRealTimers())

it('não grava por navegação/status e não entra em ciclo ao confirmar gravação', async () => {
  vi.useFakeTimers()
  store.getState().setDbStatus('connected')
  await vi.advanceTimersByTimeAsync(3000)
  expect(dbSaveAll).not.toHaveBeenCalled()
  store.setState({ ideas: [{ id: 'a', title: 'Uma edição' }] })
  expect(store.getState().syncStatus).toBe('pending')
  await vi.advanceTimersByTimeAsync(3000)
  expect(dbSaveAll).toHaveBeenCalledTimes(1)
  expect(store.getState().syncStatus).toBe('saved')
  await vi.advanceTimersByTimeAsync(10000)
  expect(dbSaveAll).toHaveBeenCalledTimes(1)
})
