import { describe, it, expect } from 'vitest'
import { aggregateByEditorialFunction, aggregateByEditorialSeries, buildEditorialMetricsSummary } from './analytics.js'

const posts = [
  { id: 'p1', editorial_function: 'critical_reading', editorial_series: 'who_pays' },
  { id: 'p2', editorial_function: 'critical_reading', editorial_series: 'missing_data' },
  { id: 'p3', editorial_function: 'community_connection', editorial_series: null },
  { id: 'p4', format: 'reel' }, // post antigo, sem função editorial
]

const metrics = [
  { post_id: 'p1', reach: 1000, saves: 50, shares: 20, comments: 10, profile_visits: 5 },
  { post_id: 'p2', reach: 2000, saves: 60, shares: 10, comments: 5, profile_visits: 15 },
  { post_id: 'p3', reach: 500, saves: 2, shares: 1, comments: 1, profile_visits: 1 },
  { post_id: 'p4', reach: 100, saves: 1, shares: 1, comments: 1, profile_visits: 1 },
]

describe('aggregateByEditorialFunction', () => {
  it('agrupa métricas por função editorial, ignorando posts sem função', () => {
    const result = aggregateByEditorialFunction(posts, metrics)
    expect(result.map((r) => r.editorial_function).sort()).toEqual(['community_connection', 'critical_reading'])
  })

  it('calcula salvamento e compartilhamento por ALCANCE, não por curtida', () => {
    const result = aggregateByEditorialFunction(posts, metrics)
    const critical = result.find((r) => r.editorial_function === 'critical_reading')
    // p1 + p2: reach 3000, saves 110, shares 30
    expect(critical.count).toBe(2)
    expect(critical.reach).toBe(3000)
    expect(critical.saves_per_reach).toBeCloseTo(110 / 3000, 6)
    expect(critical.shares_per_reach).toBeCloseTo(30 / 3000, 6)
  })

  it('sem alcance, devolve null nas taxas em vez de dividir por zero', () => {
    const result = aggregateByEditorialFunction(
      [{ id: 'z', editorial_function: 'practical_utility' }],
      [{ post_id: 'z', reach: 0, saves: 5 }]
    )
    expect(result[0].saves_per_reach).toBe(null)
  })
})

describe('aggregateByEditorialSeries', () => {
  it('agrupa por série, ignorando posts sem série', () => {
    const result = aggregateByEditorialSeries(posts, metrics)
    expect(result.map((r) => r.editorial_series).sort()).toEqual(['missing_data', 'who_pays'])
  })
})

describe('buildEditorialMetricsSummary', () => {
  it('conta só as métricas de posts com função editorial na amostra', () => {
    const summary = buildEditorialMetricsSummary(posts, metrics)
    expect(summary.sampleSize).toBe(3) // p1, p2, p3 — não p4
    expect(summary.byFunction.length).toBe(2)
  })

  it('amostra vazia não quebra', () => {
    const summary = buildEditorialMetricsSummary([], [])
    expect(summary.sampleSize).toBe(0)
    expect(summary.byFunction).toEqual([])
  })
})
