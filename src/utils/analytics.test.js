import { describe, it, expect } from 'vitest'
import {
  calcEngagement,
  calcEngagementRate,
  calcAuthorityScore,
  enrichMetric,
} from './analytics.js'

describe('calcEngagement', () => {
  it('sums likes, comments, shares and saves', () => {
    expect(calcEngagement({ likes: 10, comments: 5, shares: 2, saves: 3 })).toBe(20)
  })

  it('treats missing fields as zero', () => {
    expect(calcEngagement({ likes: 4 })).toBe(4)
    expect(calcEngagement({})).toBe(0)
  })
})

describe('calcEngagementRate', () => {
  it('divides engagement by impressions', () => {
    expect(calcEngagementRate({ likes: 50, impressions: 1000 })).toBe(0.05)
  })

  it('returns 0 when impressions are missing or zero', () => {
    expect(calcEngagementRate({ likes: 50 })).toBe(0)
    expect(calcEngagementRate({ likes: 50, impressions: 0 })).toBe(0)
  })
})

describe('calcAuthorityScore', () => {
  it('sums shares and saves only', () => {
    expect(calcAuthorityScore({ likes: 100, shares: 7, saves: 3 })).toBe(10)
  })
})

describe('enrichMetric', () => {
  it('adds engagement, engagement_rate and authority_score without dropping fields', () => {
    const result = enrichMetric({ id: 'x', likes: 10, saves: 10, impressions: 100 })
    expect(result).toMatchObject({
      id: 'x',
      engagement: 20,
      engagement_rate: 0.2,
      authority_score: 10,
    })
  })
})
