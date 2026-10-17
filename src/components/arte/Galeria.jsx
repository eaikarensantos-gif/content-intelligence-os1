import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Replace, Search, X } from 'lucide-react'

const semAcento = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Prévia em escala de um modelo: o mesmo componente que desenha a arte no Studio. */
function Mini({ item, largura, renderMini }) {
  const escala = largura / item.w
  return (
    <div className="relative overflow-hidden rounded-lg bg-gray-100" style={{ width: largura, height: item.h * escala }}>
      <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', width: item.w, height: item.h, pointerEvents: 'none' }}>{renderMini(item)}</div>
    </div>
  )
}

/**
 * Galeria "Modelos de arte": todos os modelos com miniatura real, busca e filtros.
 * itens: [{ id, nome, categoria, categoriaNome, w, h, formato, comFoto, busca }]
 */
export default function Galeria({ itens, categorias, renderMini, onFechar, onAplicar }) {
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [foto, setFoto] = useState('todas')
  const [formato, setFormato] = useState('todos')
  const [aberto, setAberto] = useState(null)
  const [largura, setLargura] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? (window.innerWidth - 48) / 2 : 190))

  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') (aberto ? setAberto(null) : onFechar()) }
    const redimensionar = () => setLargura(window.innerWidth < 640 ? (window.innerWidth - 48) / 2 : 190)
    window.addEventListener('keydown', tecla)
    window.addEventListener('resize', redimensionar)
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('resize', redimensionar) }
  }, [aberto, onFechar])

  const visiveis = useMemo(() => {
    const q = semAcento(busca.trim())
    return itens.filter((it) =>
      (categoria === 'todas' || it.categoria === categoria) &&
      (foto === 'todas' || (foto === 'com') === it.comFoto) &&
      (formato === 'todos' || it.formato === formato) &&
      (!q || semAcento(`${it.nome} ${it.categoriaNome} ${it.busca}`).includes(q)))
  }, [itens, busca, categoria, foto, formato])

  const chip = (ativo) => `shrink-0 px-3 py-1.5 rounded-full text-xs border ${ativo ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`
  const item = aberto && itens.find((i) => i.id === aberto)
  const larguraPrevia = typeof window !== 'undefined' ? Math.min(380, window.innerWidth - 64) : 380

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex" role="dialog" aria-modal="true" aria-label="Modelos de arte">
      <div className="bg-white w-full h-full sm:m-6 sm:rounded-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Modelos de arte</h2>
            <p className="text-xs text-gray-500" data-testid="contagem">{itens.length} modelos · mostrando {visiveis.length}</p>
          </div>
          <button type="button" onClick={onFechar} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Fechar"><X size={18} /></button>
        </div>

        {item ? (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <button type="button" onClick={() => setAberto(null)} className="flex items-center gap-1 text-sm text-gray-600 hover:underline mb-4"><ArrowLeft size={15} />Voltar para a galeria</button>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Mini item={item} largura={larguraPrevia} renderMini={renderMini} />
              <div className="space-y-3 max-w-sm">
                <h3 className="text-lg font-semibold text-gray-900">{item.nome}</h3>
                <p className="text-sm text-gray-500">{item.categoriaNome} · {item.formato === 'story' ? 'Story 9:16' : 'Feed 4:5'} · {item.comFoto ? 'com foto' : 'sem foto'}</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button type="button" onClick={() => onAplicar(item.id, 'atual')} className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-orange-500 text-white hover:bg-orange-600"><Replace size={15} />Usar neste slide</button>
                  <button type="button" onClick={() => onAplicar(item.id, 'novo')} className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50"><Plus size={15} />Adicionar como novo slide</button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 sm:px-6 py-3 space-y-3 border-b border-gray-100">
              <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                <Search size={15} className="text-gray-400" />
                <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, categoria ou texto" className="flex-1 text-sm outline-none bg-transparent" autoFocus />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button type="button" className={chip(categoria === 'todas')} onClick={() => setCategoria('todas')}>Todas</button>
                {Object.entries(categorias).map(([k, nome]) => (
                  <button key={k} type="button" className={chip(categoria === k)} onClick={() => setCategoria(k)}>{nome}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[['todas', 'Com e sem foto'], ['com', 'Com foto'], ['sem', 'Sem foto']].map(([k, n]) => <button key={k} type="button" className={chip(foto === k)} onClick={() => setFoto(k)}>{n}</button>)}
                <span className="w-px bg-gray-200 mx-1" />
                {[['todos', 'Feed e story'], ['feed', 'Feed 4:5'], ['story', 'Story 9:16']].map(([k, n]) => <button key={k} type="button" className={chip(formato === k)} onClick={() => setFormato(k)}>{n}</button>)}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              {visiveis.length === 0 ? (
                <p className="text-sm text-gray-500 py-10 text-center">Nenhum modelo com esses filtros.</p>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${largura}px, 1fr))` }}>
                  {visiveis.map((it) => (
                    <button key={it.id} type="button" onClick={() => setAberto(it.id)} data-modelo={it.id} className="text-left group" style={{ contentVisibility: 'auto', containIntrinsicSize: `${largura}px ${largura * 1.5}px` }}>
                      <div className="rounded-lg ring-1 ring-gray-200 group-hover:ring-2 group-hover:ring-orange-400 overflow-hidden w-fit">
                        <Mini item={it} largura={largura} renderMini={renderMini} />
                      </div>
                      <p className="mt-1.5 text-sm font-medium text-gray-900 leading-tight">{it.nome}</p>
                      <p className="text-xs text-gray-500">{it.categoriaNome}{it.formato === 'story' ? ' · Story' : ''}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
