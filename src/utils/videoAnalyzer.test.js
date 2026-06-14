import { describe, it, expect } from 'vitest'
import { extractYouTubeId, getYouTubeThumbnail } from './videoAnalyzer.js'

describe('extractYouTubeId', () => {
  it('parses standard watch URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('parses youtu.be short URLs', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('parses shorts and embed URLs', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('returns null for non-YouTube URLs', () => {
    expect(extractYouTubeId('https://example.com/video')).toBeNull()
  })
})

describe('getYouTubeThumbnail', () => {
  it('builds the hqdefault thumbnail URL', () => {
    expect(getYouTubeThumbnail('abc123')).toBe('https://img.youtube.com/vi/abc123/hqdefault.jpg')
  })
})
