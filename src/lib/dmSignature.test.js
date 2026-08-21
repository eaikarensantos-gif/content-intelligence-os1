import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { verifyWebhookSignature } from './dmSignature'

function sign(body, secret) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
}

describe('verifyWebhookSignature', () => {
  const secret = 'test-app-secret'
  const body = Buffer.from(JSON.stringify({ object: 'instagram', entry: [] }))

  it('aceita uma assinatura válida', () => {
    expect(verifyWebhookSignature(body, sign(body, secret), secret)).toBe(true)
  })

  it('rejeita quando o corpo foi alterado', () => {
    const tampered = Buffer.from(JSON.stringify({ object: 'instagram', entry: [{}] }))
    expect(verifyWebhookSignature(tampered, sign(body, secret), secret)).toBe(false)
  })

  it('rejeita quando o secret está errado', () => {
    expect(verifyWebhookSignature(body, sign(body, secret), 'outro-secret')).toBe(false)
  })

  it('rejeita cabeçalho ausente', () => {
    expect(verifyWebhookSignature(body, undefined, secret)).toBe(false)
  })

  it('rejeita cabeçalho sem o prefixo sha256=', () => {
    expect(verifyWebhookSignature(body, 'abc123', secret)).toBe(false)
  })

  it('rejeita quando não há app secret configurado', () => {
    expect(verifyWebhookSignature(body, sign(body, secret), '')).toBe(false)
  })
})
