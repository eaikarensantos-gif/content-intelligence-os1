// Zero Mock Policy: all simulation functions removed.
// This file is kept only to avoid breaking any stale imports.
// TrendRadar now uses real YouTube Data API results.

/**
 * @deprecated Use youtubeSearch() from src/lib/aiService.js instead.
 */
export function simulateTrendSearch() {
  throw new Error(
    'simulateTrendSearch() foi removido. Configure sua YouTube API Key em Configurações para buscar dados reais.'
  )
}
