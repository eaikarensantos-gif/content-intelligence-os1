import { afterEach, expect, it, vi } from 'vitest'
import { createSaveQueue } from './saveQueue'

afterEach(() => vi.useRealTimers())

it('agrupa alterações e envia o estado mais recente', async () => {
  vi.useFakeTimers()
  let state = { value: 1 }
  const save = vi.fn().mockResolvedValue(true)
  const status = vi.fn()
  const queue = createSaveQueue({ getState: () => state, save, onStatus: status })
  queue.schedule()
  state = { value: 2 }
  queue.schedule()
  await vi.advanceTimersByTimeAsync(2500)
  expect(save).toHaveBeenCalledTimes(1)
  expect(save).toHaveBeenCalledWith({ value: 2 })
  expect(status.mock.lastCall[0]).toMatchObject({ status: 'saved', lastSavedAt: expect.any(String) })
})

it('mantém falha visível até uma tentativa bem-sucedida', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('private server details')).mockResolvedValue(true)
  const status = vi.fn()
  const queue = createSaveQueue({ getState: () => ({}), save, onStatus: status })
  await queue.retry()
  expect(status.mock.lastCall[0]).toMatchObject({ status: 'error' })
  expect(JSON.stringify(status.mock.calls)).not.toContain('private server details')
  expect(save).toHaveBeenCalledTimes(1)
  await queue.retry()
  expect(status.mock.lastCall[0].status).toBe('saved')
})

it('serializa uma edição feita durante uma gravação', async () => {
  vi.useFakeTimers()
  let resolveFirst
  let state = 1
  const save = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve })).mockResolvedValue(true)
  const status = vi.fn()
  const queue = createSaveQueue({ getState: () => state, save, onStatus: status })
  const first = queue.retry()
  state = 2
  queue.schedule()
  await vi.advanceTimersByTimeAsync(2500)
  expect(save).toHaveBeenCalledTimes(1)
  resolveFirst(true)
  await first
  expect(save.mock.calls).toEqual([[1], [2]])
  expect(status.mock.lastCall[0].status).toBe('saved')
})

it('não anuncia sucesso quando não há banco configurado', async () => {
  const status = vi.fn()
  const queue = createSaveQueue({ getState: () => ({}), save: async () => false, onStatus: status })
  await queue.retry()
  expect(status.mock.lastCall[0].status).toBe('error')
})
