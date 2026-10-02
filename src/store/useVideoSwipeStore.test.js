import { describe, it, expect } from 'vitest'
import useVideoSwipeStore, { mergeVideoSwipeState } from './useVideoSwipeStore'

describe('Video Swipe: dados persistidos legados', () => {
  it('recupera arrays nulos sem apagar a fila válida nem substituir ações', () => {
    const current = useVideoSwipeStore.getInitialState()
    const video = { id: 'v1', title: 'Referência salva' }
    const saved = { selectedPlatforms: null, selectedCategories: null, seenIds: null, queue: [video], togglePlatform: null }
    const restored = mergeVideoSwipeState(saved, current)
    expect(restored.selectedPlatforms).toEqual(['youtube', 'dailymotion'])
    expect(restored.selectedCategories).toEqual([])
    expect(restored.queue).toEqual([video])
    expect(restored.seenIds).toEqual([])
    expect(restored.togglePlatform).toBe(current.togglePlatform)
    expect(saved.selectedPlatforms).toBeNull()
  })

  it('preserva seleção vazia intencional e filtros válidos', () => {
    const restored = mergeVideoSwipeState({ selectedPlatforms: [], filterDuration: 'short', filterSort: 'views' }, useVideoSwipeStore.getInitialState())
    expect(restored.selectedPlatforms).toEqual([])
    expect(restored.filterDuration).toBe('short')
    expect(restored.filterSort).toBe('views')
  })

  it('ignora tipos inválidos e itens nulos em backups parciais', () => {
    const restored = mergeVideoSwipeState({ selectedCategories: 'tech', selectedPlatforms: [null, 'youtube'], queue: [null, { id: 'ok' }], filterSort: null }, useVideoSwipeStore.getInitialState())
    expect(restored.selectedCategories).toEqual([])
    expect(restored.selectedPlatforms).toEqual(['youtube'])
    expect(restored.queue).toEqual([{ id: 'ok' }])
    expect(restored.filterSort).toBe('relevance')
  })
})
