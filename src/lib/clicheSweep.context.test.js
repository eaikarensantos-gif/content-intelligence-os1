import { afterEach, expect, it, vi } from 'vitest'
import { rewriteWithoutCliches, rewriteShortLines } from './clicheSweep'

afterEach(() => vi.unstubAllGlobals())

it('passes speech and screen question context to the rewriting request without changing the response contract', async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [{ type: 'text', text: 'Eu começaria perguntando quem decide.' }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ content: [{ type: 'text', text: '["Quem decide?"]' }] }) })
  vi.stubGlobal('fetch', fetchMock)
  expect(await rewriteWithoutCliches('test-key', 'fala original', [], 'Preserve a oralidade e a atribuição.')).toBe('Eu começaria perguntando quem decide.')
  const speechRequest = JSON.parse(fetchMock.mock.calls[0][1].body)
  expect(speechRequest.system).toContain('Preserve a oralidade e a atribuição.')
  expect(await rewriteShortLines('test-key', [{ text: 'Quem decide?', blocks: [], rewriteContext: 'Não transforme perguntas em fatos.' }])).toEqual(['Quem decide?'])
  const screenRequest = JSON.parse(fetchMock.mock.calls[1][1].body)
  expect(screenRequest.messages[0].content).toContain('Não transforme perguntas em fatos.')
})
