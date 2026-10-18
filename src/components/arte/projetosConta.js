import { getSupabase } from '../../lib/supabase'
import { listarArtes, salvarArte } from './armazem'

export const contaAtual = () => {
  try { return JSON.parse(localStorage.getItem('cio-auth-session') || 'null')?.email?.trim().toLowerCase() || '' }
  catch { return '' }
}
// Mesmo banco configurado no app. Uma linha imutável por versão evita sobrescrever
// edições salvas simultaneamente em dois aparelhos. Não depende de uma migração.
const prefixo = conta => `studio-arte:v1:${Array.from(new TextEncoder().encode(conta), b => b.toString(16).padStart(2, '0')).join('')}:`
export async function salvarVersao(nome, projeto) {
  const conta = contaAtual()
  const projetoId = projeto.bibliotecaId || crypto.randomUUID()
  const versao = { id: `arte:${crypto.randomUUID()}`, projetoId, conta, nome, salvoEm: Date.now(), projeto: { ...projeto, bibliotecaId: projetoId } }
  let local = false, nuvem = false
  try { await salvarArte(nome, versao.projeto, versao); local = true } catch { /* tenta o banco */ }
  const db = getSupabase()
  if (db && conta) {
    try {
      const { error } = await db.from('user_data').insert({ key: `${prefixo(conta)}${projetoId}:${versao.id}`, value: versao, updated_at: new Date(versao.salvoEm).toISOString() })
      if (error) throw error
      nuvem = true
    } catch { /* cópia local continua acessível; a UI informa que não sincronizou */ }
  }
  if (!local && !nuvem) throw new Error('Não foi possível salvar. A arte continua no editor.')
  return { versao, local, nuvem }
}

export function agruparVersoes(versoes) {
  const unicas = [...new Map(versoes.map(v => [v.id, v])).values()].sort((a, b) => b.salvoEm - a.salvoEm || b.id.localeCompare(a.id))
  const grupos = new Map()
  for (const v of unicas) {
    const id = v.projetoId || v.id
    if (!grupos.has(id)) grupos.set(id, { ...v, versoes: [] })
    grupos.get(id).versoes.push(v)
  }
  return [...grupos.values()]
}

export async function carregarBiblioteca() {
  const conta = contaAtual()
  let locais = [], remotas = [], aviso = ''
  try { locais = (await listarArtes()).filter(v => !v.conta || v.conta === conta) } catch { aviso = 'Não foi possível ler as cópias locais.' }
  const db = getSupabase()
  if (db && conta) {
    try {
      const { data, error } = await db.from('user_data').select('value').like('key', `${prefixo(conta)}%`)
      if (error) throw error
      remotas = (data || []).filter(r => r.value?.conta === conta && r.value?.projeto?.slides?.length).map(r => ({ ...r.value, nuvem: true }))
    } catch { aviso = 'Banco indisponível. Mostrando somente as cópias deste dispositivo.' }
  } else aviso = 'Conecte o banco nas configurações para acessar suas artes em outros dispositivos.'
  return { artes: agruparVersoes([...locais, ...remotas]), aviso }
}
