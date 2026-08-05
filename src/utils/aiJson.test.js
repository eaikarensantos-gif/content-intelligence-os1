import { describe, it, expect } from 'vitest'
import { extractJsonObject, extractJsonArray, assertNotTruncated } from './aiJson.js'

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

  it('reproduces the reported bug: a response cut off mid-array', () => {
    // Response gets cut off by max_tokens while emitting the 2nd array
    // element — this is exactly "Expected ',' or ']' after array element",
    // because the last `}` the regex can find belongs to the completed 1st
    // element, and the array/object around it was never closed.
    const truncated = '{"patterns":[{"name":"a","example":"x"},{"name":"b","example":"y"'
    expect(() => extractJsonObject(truncated)).toThrow('Resposta inválida da IA')
  })
})

describe('assertNotTruncated', () => {
  it('throws when the model stopped for hitting max_tokens', () => {
    expect(() => assertNotTruncated({ stop_reason: 'max_tokens' })).toThrow(/cortada/)
  })

  it('does not throw for a response that finished normally', () => {
    expect(() => assertNotTruncated({ stop_reason: 'end_turn' })).not.toThrow()
    expect(() => assertNotTruncated({ stop_reason: 'stop_sequence' })).not.toThrow()
  })

  it('does not throw on malformed or missing data — that is extractJson*\'s job', () => {
    expect(() => assertNotTruncated(null)).not.toThrow()
    expect(() => assertNotTruncated({})).not.toThrow()
    expect(() => assertNotTruncated(undefined)).not.toThrow()
  })

  it('honors a custom message', () => {
    expect(() => assertNotTruncated({ stop_reason: 'max_tokens' }, 'boom')).toThrow('boom')
  })
})
