import { useState } from 'react'
import { listarArtes, salvarArte } from './armazem'

export default function ArtesSalvas({ projeto, bloqueado, onAbrir, onLimpar }) {
  const [painel, setPainel] = useState('')
  const [nome, setNome] = useState('')
  const [artes, setArtes] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [gravando, setGravando] = useState(false)
  const disabled = bloqueado || gravando
  const botao = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40'
  const salvar = async () => {
    setGravando(true)
    setMensagem('')
    try {
      await salvarArte(nome.trim(), projeto)
      setMensagem('Arte salva neste navegador. Você pode começar uma nova arte.')
      setPainel('')
    } catch { setMensagem('Não foi possível salvar. Sua arte continua no editor; tente novamente ou baixe os PNGs.') }
    finally { setGravando(false) }
  }
  const listar = async () => {
    setGravando(true)
    setMensagem('')
    try { setArtes(await listarArtes()); setPainel('biblioteca') }
    catch { setMensagem('Não foi possível abrir as artes salvas neste navegador.') }
    finally { setGravando(false) }
  }
  const limpar = () => {
    onLimpar()
    setPainel('')
    setMensagem('Editor limpo. Use Desfazer para recuperar o carrossel anterior. As artes salvas continuam na biblioteca.')
  }
  return <section aria-label="Meus projetos de arte" className="mb-4 rounded-xl border border-gray-200 p-3">
    <div className="flex flex-wrap gap-2">
      <button className={botao} disabled={disabled} onClick={limpar}>Nova arte</button>
      <button className={botao} disabled={disabled} onClick={() => { setNome(''); setMensagem(''); setPainel('salvar') }}>Salvar arte / carrossel</button>
      <button className={botao} disabled={disabled} onClick={listar}>Artes salvas</button>
      <button className={`${botao} text-red-600`} disabled={disabled} onClick={limpar}>Apagar todos os cards</button>
    </div>
    {mensagem && <p role="status" className="mt-2 text-sm">{mensagem}</p>}
    {painel && <div className="mt-3 border-t pt-3">
      <div className="flex justify-between items-center mb-2">
        <strong className="text-sm">{painel === 'salvar' ? 'Salvar uma cópia editável' : 'Artes salvas'}</strong>
        <button className={botao} disabled={gravando} onClick={() => setPainel('')}>Fechar biblioteca</button>
      </div>
      <p className="text-xs text-gray-500 mb-3">Salvas neste navegador e dispositivo. Para guardar as imagens também fora daqui, use Baixar este ou Baixar todos.</p>
      {painel === 'salvar' ? <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); if (nome.trim()) salvar() }}>
        <input aria-label="Nome da arte" placeholder="Nome da arte ou carrossel" maxLength={120} value={nome} onChange={e => setNome(e.target.value)} className="min-w-0 flex-1 border rounded-lg px-3 py-2" disabled={gravando} />
        <button className={botao} disabled={disabled || !nome.trim()}>{gravando ? 'Salvando…' : 'Salvar cópia'}</button>
      </form> : <div className="max-h-72 overflow-y-auto space-y-2">
        {!artes.length && <p className="text-sm">Nenhuma arte salva ainda.</p>}
        {artes.map(a => <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
          <div className="min-w-0"><p className="text-sm font-medium break-words">{a.nome}</p><p className="text-xs text-gray-500">{a.projeto.slides.length} card(s) · {new Date(a.salvoEm).toLocaleString('pt-BR')}</p></div>
          <button className={botao} disabled={disabled} onClick={() => { onAbrir(structuredClone(a.projeto)); setPainel(''); setMensagem('Cópia aberta para editar. A versão salva foi preservada.') }}>Abrir</button>
        </div>)}
      </div>}
    </div>}
  </section>
}
