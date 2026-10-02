import { expect, it } from 'vitest'
import { canonicalPinnedPages } from './navigation'

it('preserva o favorito antigo sem duplicar Analytics', () => {
  expect(canonicalPinnedPages(['/ideas', '/social', '/analytics', '/tasks'])).toEqual(['/ideas', '/analytics', '/tasks'])
})
