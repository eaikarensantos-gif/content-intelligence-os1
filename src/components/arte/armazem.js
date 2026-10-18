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

// Cópias independentes do rascunho; só anuncia sucesso após a transação confirmar.
export async function salvarArte(nome, projeto) {
  const db = await abrir()
  const arte = { id: `arte:${crypto.randomUUID()}`, nome, projeto, salvoEm: Date.now() }
  try {
    await new Promise((ok, erro) => {
      const tx = db.transaction(LOJA, 'readwrite')
      tx.objectStore(LOJA).put(arte, arte.id)
      tx.oncomplete = ok
      tx.onerror = () => erro(tx.error)
      tx.onabort = () => erro(tx.error || new Error('Gravação cancelada'))
    })
    return arte
  } finally { db.close() }
}

export async function listarArtes() {
  const db = await abrir()
  try {
    return await new Promise((ok, erro) => {
      const req = db.transaction(LOJA).objectStore(LOJA).getAll()
      req.onsuccess = () => ok(req.result.filter(a => a.id?.startsWith('arte:')).sort((a, b) => b.salvoEm - a.salvoEm))
      req.onerror = () => erro(req.error)
    })
  } finally { db.close() }
}
