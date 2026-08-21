import { describe, it, expect } from 'vitest'
import { parseWebhookPayload } from './dmWebhookEvents'

describe('parseWebhookPayload', () => {
  it('normaliza um evento de comentário', () => {
    const body = {
      object: 'instagram',
      entry: [{
        id: 'page1',
        time: 1700000000,
        changes: [{ field: 'comments', value: { id: 'c1', media_id: 'm1', text: 'quero o link', from: { id: 'u1', username: 'fulano' } } }],
      }],
    }
    const [event] = parseWebhookPayload(body)
    expect(event).toMatchObject({
      type: 'comment', eventKey: 'page1:comments:c1', commentId: 'c1', mediaId: 'm1',
      text: 'quero o link', senderId: 'u1', fromUsername: 'fulano',
    })
  })

  it('normaliza um evento de menção', () => {
    const body = { entry: [{ id: 'page1', time: 1700000001, changes: [{ field: 'mentions', value: { comment_id: 'c2', media_id: 'm2' } }] }] }
    const [event] = parseWebhookPayload(body)
    expect(event.type).toBe('mention')
    expect(event.eventKey).toBe('page1:mentions:c2')
  })

  it('normaliza uma mensagem direta', () => {
    const body = {
      entry: [{ id: 'page1', messaging: [{ sender: { id: 'u1' }, timestamp: 1700000002, message: { mid: 'mid1', text: 'oi' } }] }],
    }
    const [event] = parseWebhookPayload(body)
    expect(event).toMatchObject({ type: 'message', eventKey: 'page1:msg:mid1', senderId: 'u1', text: 'oi', isEcho: false })
  })

  it('marca resposta de story como story_reply', () => {
    const body = {
      entry: [{ id: 'page1', messaging: [{ sender: { id: 'u1' }, timestamp: 1700000003, message: { mid: 'mid2', text: 'legal', reply_to: { story: { id: 's1' } } } }] }],
    }
    const [event] = parseWebhookPayload(body)
    expect(event.type).toBe('story_reply')
  })

  it('marca mensagens eco (enviadas pela própria página) como isEcho', () => {
    const body = {
      entry: [{ id: 'page1', messaging: [{ sender: { id: 'page1' }, timestamp: 1700000004, message: { mid: 'mid3', text: 'resposta automática', is_echo: true } }] }],
    }
    const [event] = parseWebhookPayload(body)
    expect(event.isEcho).toBe(true)
  })

  it('retorna lista vazia quando não há entry', () => {
    expect(parseWebhookPayload({})).toEqual([])
    expect(parseWebhookPayload(null)).toEqual([])
  })

  it('gera eventKey diferente para cada entry/change, mesmo com o mesmo horário', () => {
    const body = {
      entry: [
        { id: 'page1', time: 1700000005, changes: [{ field: 'comments', value: { media_id: 'm1', from: {} } }] },
        { id: 'page1', time: 1700000005, changes: [{ field: 'comments', value: { media_id: 'm2', from: {} } }] },
      ],
    }
    const [a, b] = parseWebhookPayload(body)
    expect(a.eventKey).not.toBe(b.eventKey)
  })
})
