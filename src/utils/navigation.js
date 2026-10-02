export const canonicalPage = (path) => path === '/social' ? '/analytics' : path
export const canonicalPinnedPages = (paths) => [...new Set(paths.map(canonicalPage))]
