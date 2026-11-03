import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { instagramFetchPosts } from '../../lib/aiService'
import { tokenParaUso } from '../../lib/instagramAuth'
import { carregarBiblioteca } from './projetosConta'
import { MIN_AMOSTRAS, agruparPorModelo, formatarRazao } from './resultadoPost'

/** Compara os modelos pelo salvamento ÷ curtida dos posts já ligados às artes salvas. */
export default function ResultadosPorModelo() {
  const [estado, setEstado] = useState({ tipo: 'carregando' })

  useEffect(() => {
    let vivo = true
    const mostrar = (e) => { if (vivo) setEstado(e) }
    ;(async () => {
      try {
        const { artes } = await carregarBiblioteca()
        const ligadas = artes.filter((a) => a.projeto?.publicacao?.mediaId)
        if (!ligadas.length) return mostrar({ tipo: 'vazio' })
        const { token, erro } = tokenParaUso()
        if (erro) return mostrar({ tipo: 'erro', texto: erro })
        const { posts } = await instagramFetchPosts(token, 30)
        mostrar({ tipo: 'ok', ligadas: ligadas.length, ...agruparPorModelo(ligadas, posts) })
      } catch (err) {
        mostrar({ tipo: 'erro', texto: err.message || 'Não foi possível montar a comparação.' })
      }
    })()
    return () => { vivo = false }
  }, [])

  if (estado.tipo === 'carregando') return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={15} className="animate-spin" />Buscando os resultados…</div>
  if (estado.tipo === 'erro') return <p role="alert" className="text-sm text-red-700">{estado.texto}</p>
  if (estado.tipo === 'vazio') return <p className="text-sm">Nenhuma arte salva está ligada a um post ainda. Em "Pacote de publicação", ligue a arte ao post e salve uma nova versão.</p>

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <caption className="sr-only">Salvamento ÷ curtida médio por modelo da capa</caption>
        <thead><tr className="text-left text-xs text-gray-500"><th className="py-1 pr-2 font-medium">Modelo da capa</th><th className="py-1 pr-2 font-medium">Posts medidos</th><th className="py-1 font-medium">Salvamento ÷ curtida</th></tr></thead>
        <tbody>
          {estado.linhas.map((l) => (
            <tr key={l.modelo} className="border-t border-gray-100 align-top">
              <td className="py-2 pr-2">{l.modelo}</td>
              <td className="py-2 pr-2">{l.amostras}{l.semDado ? ` (+${l.semDado} sem dado)` : ''}</td>
              <td className="py-2">
                <strong className={l.suficiente ? '' : 'text-gray-500'}>{formatarRazao(l.media)}</strong>
                {!l.suficiente && <span className="block text-xs text-gray-500">Poucos dados: {l.amostras} de {MIN_AMOSTRAS}. Ainda não dá para decidir.</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {estado.semPost > 0 && <p className="text-xs text-gray-500">{estado.semPost} {estado.semPost === 1 ? 'arte ligada a um post' : 'artes ligadas a posts'} fora dos 30 mais recentes da conta, que não entraram na conta.</p>}
      <p className="text-xs text-gray-500">Média simples por modelo da capa. O mínimo de {MIN_AMOSTRAS} amostras vem do sistema de conteúdo (seção 2).</p>
    </div>
  )
}
