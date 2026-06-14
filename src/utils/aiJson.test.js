import { describe, it, expect } from 'vitest'
import { extractJsonObject, extractJsonArray } from './aiJson.js'

describe('extractJsonObject', () => {
  it('parses a clean JSON object', () => {
    expect(extractJsonObject('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' })
  })

  it('extracts JSON embedded in surrounding prose / markdown fences', () => {
    const text = 'Claro! Aqui vai:\n```json\n{"ok": true}\n```\nEspero que ajude.'
    expect(extractJsonObject(text)).toEqual({ ok: true })
  })

  it('repairs trailing commas', () => {
    expect(extractJsonObject('{"list":[1,2,],"a":1,}')).toEqual({ list: [1, 2], a: 1 })
  })

  it('throws a friendly error when no object is present', () => {
    expect(() => extractJsonObject('sem json aqui')).toThrow('Resposta inválida da IA')
  })

  it('throws a friendly error for malformed JSON instead of a raw SyntaxError', () => {
    expect(() => extractJsonObject('{"a": }')).toThrow('Resposta inválida da IA')
  })

  it('honors a custom error message', () => {
    expect(() => extractJsonObject('', 'boom')).toThrow('boom')
  })

  it('handles null/undefined input gracefully', () => {
    expect(() => extractJsonObject(null)).toThrow('Resposta inválida da IA')
    expect(() => extractJsonObject(undefined)).toThrow('Resposta inválida da IA')
  })
})

describe('extractJsonArray', () => {
  it('parses a clean JSON array', () => {
    expect(extractJsonArray('[1,2,3]')).toEqual([1, 2, 3])
  })

  it('extracts an array embedded in prose', () => {
    expect(extractJsonArray('resultado: ["a","b"] fim')).toEqual(['a', 'b'])
  })

  it('repairs trailing commas', () => {
    expect(extractJsonArray('[1,2,3,]')).toEqual([1, 2, 3])
  })

  it('throws a friendly error when no array is present', () => {
    expect(() => extractJsonArray('{"a":1}')).toThrow('Resposta inválida da IA')
  })
})
