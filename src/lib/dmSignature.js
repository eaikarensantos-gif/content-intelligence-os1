// Verificação de assinatura do webhook da Meta (HMAC SHA-256 sobre o corpo
// bruto da requisição, com o App Secret do Instagram). Cabeçalho
// X-Hub-Signature-256, valor no formato "sha256=<hex>".

import crypto from 'node:crypto'

export function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  if (!appSecret) return false

  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const providedHex = signatureHeader.slice('sha256='.length)

  const expected = Buffer.from(expectedHex, 'hex')
  const provided = Buffer.from(providedHex, 'hex')
  if (expected.length !== provided.length) return false

  return crypto.timingSafeEqual(expected, provided)
}
