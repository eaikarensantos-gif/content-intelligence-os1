import { describe, expect, it } from 'vitest'
import { engagementRate, postingHeatmap, recordFollowers, growthTimeline } from './performanceAnalytics'

describe('performance analytics', () => {
  it('distinguishes missing metrics from measured zero and avoids division by zero', () => {
    expect(engagementRate({ impressions: 0, likes: 5 })).toBeNull()
    expect(engagementRate({ impressions: 100 })).toBeNull()
    expect(engagementRate({ impressions: 100, likes: 0 })).toBe(0)
    expect(engagementRate({ impressions: 100, likes: 5, comments: 2 })).toBeCloseTo(7)
  })
  it('averages posts in each hour, retaining midnight and excluding missing or invalid times', () => {
    const { cells, excluded } = postingHeatmap([
      { date: '2026-10-19', publish_time: '00:00', impressions: 100 },
      { date: '2026-10-19', publish_time: '00:30', impressions: 300 },
      { date: '2026-10-19', impressions: 900 },
      { date: '2026-10-19', publish_time: '24:00', impressions: 900 },
      { date: '2026-02-30', publish_time: '10:00', impressions: 900 },
    ])
    expect(cells[0]).toMatchObject({ count: 2, value: 200 })
    expect(cells[1].value).toBeNull()
    expect(excluded).toBe(3)
  })
  it('preserves the dated legacy baseline and separates networks without inventing history', () => {
    const profile = { followersUpdatedAt: '2026-10-20T12:00:00Z', followersByPlatform: { linkedin: 100, instagram: 800 } }
    const next = recordFollowers(profile, { linkedin: 95, instagram: 900 }, '2026-10-22T12:00:00Z')
    expect(growthTimeline(next, 'linkedin').map(row => row.change)).toEqual([null, -5])
    expect(growthTimeline(next, 'instagram').at(-1).change).toBe(100)
    expect(growthTimeline(next, 'linkedin', '2026-10-21')).toHaveLength(1)
    expect(growthTimeline({ followersByPlatform: { linkedin: 100 } }, 'linkedin')).toEqual([])
  })
  it('uses the last daily snapshot in Sao Paulo and retains zero counts', () => {
    const profile = { followerHistory: [
      { recordedAt: '2026-10-21T23:00:00Z', followers: { linkedin: 5 } },
      { recordedAt: '2026-10-22T01:00:00Z', followers: { linkedin: 0 } },
      { recordedAt: '2026-10-22T12:00:00Z', followers: { linkedin: '' } },
    ] }
    expect(growthTimeline(profile, 'linkedin')).toEqual([{ date: '2026-10-21', followers: 0, change: null }])
  })
})
