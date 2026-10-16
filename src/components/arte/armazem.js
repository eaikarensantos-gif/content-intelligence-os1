// Rascunho do Studio de Arte no IndexedDB: com fotos, o projeto passa do limite do localStorage.
const BANCO = 'studio-arte'
const LOJA = 'rascunhos'

const abrir = () =>
  new Promise((ok, erro) => {
    const req = indexedDB.open(BANCO, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(LOJA)
    req.onsuccess = () => ok(req.result)
    req.onerror = () => erro(req.error)
  })

export async function lerRascunho() {
  try {
    const db = await abrir()
    return await new Promise((ok) => {
      const req = db.transaction(LOJA).objectStore(LOJA).get('atual')
      req.onsuccess = () => ok(req.result ?? null)
      req.onerror = () => ok(null)
    })
  } catch {
    return null
  }
}

export async function salvarRascunho(projeto) {
  try {
    const db = await abrir()
    db.transaction(LOJA, 'readwrite').objectStore(LOJA).put(projeto, 'atual')
  } catch {
    /* navegador sem IndexedDB (aba anônima): segue sem rascunho */
  }
}
