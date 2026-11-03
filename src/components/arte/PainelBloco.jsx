import { AlignCenter, AlignLeft, AlignRight, Trash2 } from 'lucide-react'
import { FONTES } from './marca'
import { NOMES_BLOCO, LARGURA_PADRAO } from './conteudoSlide'
import { Campo, Cores, Faixa } from './controles'

export default function PainelBloco({ arte, selecionado, est, setSelecionado, mudar, mudarEst, mudarSlide, apagarElemento, medirBloco, tamanhoPadrao }) {
  return (
            <div className="order-first rounded-xl border border-orange-200 bg-orange-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{NOMES_BLOCO[selecionado]}</span>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs text-gray-500 hover:underline">Fechar</button>
              </div>
              <details><summary className="text-xs cursor-pointer py-2.5">Editar texto vazio ou oculto</summary><textarea rows={3} value={arte[selecionado]} onChange={(e) => mudar({ [selecionado]: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" /></details>
                <Campo rotulo="Fonte">
                  <select value={est.fonte ?? (selecionado === 'titulo' || (selecionado === 'texto' && arte.template === 'atrasCabeca') ? arte.fonteTitulo : selecionado === 'detalhe' ? 'kinder' : 'inter')} onChange={(e) => mudarEst(selecionado, { fonte: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(FONTES).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                  </select>
                </Campo>
              {est.oculto ? <button type="button" onClick={() => mudarEst(selecionado, { oculto: false })} className="text-sm text-orange-700">Restaurar elemento</button> : <button type="button" onClick={() => apagarElemento(selecionado)} className="flex items-center gap-1 text-sm text-red-600"><Trash2 size={14} />Apagar elemento</button>}
              <Faixa rotulo="Tamanho (px)" valor={est.tamanho ?? medirBloco(selecionado, 'tamanho', tamanhoPadrao[selecionado])} min={20} max={360} onChange={(tamanho) => mudarEst(selecionado, { tamanho })} />
              <Faixa rotulo="Largura do bloco (px)" valor={est.largura ?? medirBloco(selecionado, 'largura', LARGURA_PADRAO[selecionado])} min={200} max={1040} passo={10} onChange={(largura) => mudarEst(selecionado, { largura })} />
              <div className="flex gap-1">
                {[['left', AlignLeft, 'Alinhar à esquerda'], ['center', AlignCenter, 'Centralizar'], ['right', AlignRight, 'Alinhar à direita']].map(([v, Icone, nome]) => (
                  <button key={v} type="button" aria-label={nome} title={nome} aria-pressed={est.alinhar === v} onClick={() => mudarEst(selecionado, { alinhar: v })} className={`flex items-center justify-center min-h-11 min-w-11 rounded-lg border ${est.alinhar === v ? 'border-orange-500 bg-white' : 'border-gray-200'}`}><Icone size={15} /></button>
                ))}
              </div>
              <Campo rotulo="Cor do texto">
                <Cores valor={selecionado === 'titulo' ? arte.corTitulo : selecionado === 'texto' ? (arte.template === 'tarjas' ? est.cor ?? (arte.semEnfeites ? arte.corTexto : 'creme') : arte.corTexto) : est.cor ?? arte.corDestaque} onChange={(c) => selecionado === 'texto' ? mudarSlide(s => ({ ...s, corTexto: c, est: { ...s.est, texto: { ...s.est?.texto, cor: c } } })) : selecionado === 'titulo' ? mudar({ corTitulo: c }) : mudarEst('detalhe', { cor: c })} />
              </Campo>
              {arte.template === 'tarjas' && ['titulo', 'texto'].includes(selecionado) && <Campo rotulo={selecionado === 'titulo' ? 'Cor da tarja' : 'Cor do bloco'}>
                <Cores valor={selecionado === 'titulo' ? arte.corTarja : est.fundo ?? arte.corDestaque} onChange={cor => {
                  if (selecionado === 'titulo') mudar({ corTarja: cor, semEnfeites: false })
                  else mudarSlide(s => ({ ...s, semEnfeites: false, est: { ...s.est, texto: { ...s.est?.texto, fundo: cor } } }))
                }} />
              </Campo>}
            </div>
  )
}
