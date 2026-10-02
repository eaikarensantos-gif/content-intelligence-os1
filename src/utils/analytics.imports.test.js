import { describe, it, expect } from 'vitest'
import { aggregateByPlatform, aggregateByFormat, topPosts } from './analytics'

describe('métricas importadas sem cadastro separado de post', () => {
  const metrics = [
    { id: 'csv-1', platform: 'instagram', post_type: 'reel', description: 'Referência A', impressions: 100, likes: 10 },
    { id: 'csv-2', platform: 'linkedin', post_type: 'image', description: 'Referência B', impressions: 900, likes: 9 },
  ]
  it('mantém todas as impressões na distribuição por plataforma', () => {
    const result = aggregateByPlatform([], metrics)
    expect(result).toHaveLength(2)
    expect(result.reduce((sum, row) => sum + row.impressions, 0)).toBe(1000)
    expect(result.find(row => row.platform === 'instagram').avg_engagement_rate).toBe(0.1)
  })
  it('usa formato e descrição do CSV nos gráficos e melhores posts', () => {
    expect(aggregateByFormat([], metrics).map(row => row.format)).toEqual(['reel', 'image'])
    const result = topPosts([], metrics, 1)
    expect(result).toHaveLength(1)
    expect(result[0].post.title).toBe('Referência B')
    expect(result[0].metric.impressions).toBe(900)
    expect(result[0].engagement_rate).toBe(0.01)
  })
  it('preserva vínculo existente e não duplica a métrica', () => {
    const post = { id: 'post-1', title: 'Título editado', platform: 'instagram', format: 'reel' }
    const imported = [{ ...metrics[0], post_id: post.id }]
    expect(topPosts([post], imported)[0].post).toBe(post)
    expect(aggregateByPlatform([post], imported)[0].count).toBe(1)
  })
  it('não descarta dados com metadados ausentes nem inventa sua plataforma', () => {
    const input = [{ impressions: 12 }]
    expect(aggregateByPlatform([], input)[0]).toMatchObject({ platform: 'unknown', impressions: 12 })
    expect(topPosts([], input)[0].post.title).toBe('Post sem título')
    expect(input[0]).toEqual({ impressions: 12 })
  })
})
