import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { instagramImagemComoDataUrl, instagramListMedia } from '../../../lib/aiService'
import { tokenParaUso } from '../../../lib/instagramAuth'
import { legendaCurta } from '../../../lib/igMedia'
import { lerGrade, salvarGrade } from '../armazem'
import { carregarBiblioteca } from '../projetosConta'
import { Canvas } from '../CanvasArte'
import { miniaturaDoCard } from '../exportacaoArte'
import { CARTAO } from '../cartoes/colecao'
import { ehCartao, formatoDe } from '../cartoes/render'
import { analisarGrade } from './analiseGrade'
import { JANELA, PISO_FORTE, avaliarGrade, montarGrade } from './harmonia'
import { lerCorDeDataUrl, lerCorDeUrl } from './leitura'
import GradeVisual from './GradeVisual'
import SugestoesGrade from './SugestoesGrade'

const MAX_NOVOS = 9
const MAX_FIXADOS = 3
const ESTADO_INICIAL = { itens: [], ordem: [], incluirEditor: true, fixados: [] }
const botao = 'min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40'

const ehFeed = (slide, formato) => (ehCartao(slide) ? formatoDe(CARTAO[slide.cartao]) : formato) === 'feed'
const contadorDe = (p) => (p.contador && p.slides.length > 1 ? `1/${p.slides.length}` : '')
const nomeDoPost = (p) => legendaCurta(p.legenda, 32) || `${p.tipo} de ${p.data ? new Date(p.data).toLocaleDateString('pt-BR') : 'data desconhecida'}`

/**
 * Simula a grade do perfil do Instagram com os posts novos no topo (a arte em edição e artes salvas)
 * e o feed atual embaixo. Nada é publicado nem alterado no Instagram.
 */
export default function GradeInstagram({ projeto, bloqueado, onAplicarCapa }) {
  const [aberto, setAberto] = useState(false)
  const [guardado, setGuardado] = useState(ESTADO_INICIAL)
  const [restaurado, setRestaurado] = useState(false)
  const [feed, setFeed] = useState({ estado: 'parado', posts: [], erro: '' })
  const [leituras, setLeituras] = useState({})
  const [proporcao, setProporcao] = useState('3/4')
  const [selecionado, setSelecionado] = useState(null)
  const [destacados, setDestacados] = useState([])
  const [analisando, setAnalisando] = useState(false)
  const [ideal, setIdeal] = useState(false)
  const [mostrarLeitura, setMostrarLeitura] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [biblioteca, setBiblioteca] = useState(null)
  const leiturasRef = useRef({})
  const geracao = useRef(0)
  useEffect(() => () => { geracao.current = -1 }, [])

  // ---------- posts novos: a arte em edição + as artes salvas que entraram na fila ----------
  const capaEditor = projeto.slides[0]
  const editorElegivel = ehFeed(capaEditor, projeto.formato)
  const rotuloEditor = contadorDe(projeto)
  const novos = useMemo(() => {
    const porId = new Map(guardado.itens.map((i) => [i.id, i]))
    if (guardado.incluirEditor && editorElegivel) porId.set('editor', { id: 'editor', nome: 'Arte em edição', capa: capaEditor, formato: projeto.formato, contador: rotuloEditor })
    // O que ainda não tem lugar na ordem entra na frente: é o post mais recente.
    const ordem = [...[...porId.keys()].filter((id) => !guardado.ordem.includes(id)), ...guardado.ordem.filter((id) => porId.has(id))]
    return ordem.map((id) => porId.get(id))
  }, [guardado, editorElegivel, capaEditor, projeto.formato, rotuloEditor])

  // ---------- restaurar e guardar a fila ----------
  useEffect(() => {
    if (!aberto || restaurado) return
    lerGrade().then((salvo) => {
      if (salvo?.itens) setGuardado({ ...ESTADO_INICIAL, ...salvo })
      setRestaurado(true)
    })
  }, [aberto, restaurado])
  useEffect(() => { if (restaurado) salvarGrade(guardado) }, [guardado, restaurado])

  // ---------- prévia e cor dos posts novos (uma de cada vez; a do editor espera a pessoa parar de mexer) ----------
  useEffect(() => {
    if (!aberto || !restaurado) return undefined
    let vivo = true
    const espera = setTimeout(async () => {
      for (const n of novos) {
        const l = leiturasRef.current[n.id]
        if (l && l.capa === n.capa && l.formato === n.formato && l.contador === n.contador) continue
        let thumb = null, props = null
        try {
          thumb = await miniaturaDoCard(n.capa, 0, (s) => <Canvas arte={s} formato={n.formato} contador={n.contador} interativo={false} />)
          props = await lerCorDeDataUrl(thumb)
        } catch { /* a prévia fica sem cor; a nota ignora esse post */ }
        if (!vivo) return
        leiturasRef.current = { ...leiturasRef.current, [n.id]: { capa: n.capa, formato: n.formato, contador: n.contador, thumb, props } }
        setLeituras(leiturasRef.current)
      }
    }, 450)
    return () => { vivo = false; clearTimeout(espera) }
  }, [aberto, restaurado, novos])

  // ---------- feed atual ----------
  const carregarFeed = async () => {
    const { token, erro } = tokenParaUso()
    if (erro) { setFeed({ estado: 'erro', posts: [], erro }); return }
    const minha = ++geracao.current
    setFeed({ estado: 'carregando', posts: [], erro: '' })
    try {
      const lista = await instagramListMedia(token, 30)
      if (geracao.current !== minha) return
      const posts = lista.map((p) => ({ ...p, props: p.miniatura ? undefined : null }))
      setFeed({ estado: 'ok', posts, erro: '' })
      const fila = posts.filter((p) => p.miniatura)
      let proximo = 0
      const trabalhar = async () => {
        while (proximo < fila.length && geracao.current === minha) {
          const p = fila[proximo++]
          let props = null
          try { props = await lerCorDeUrl(p.miniatura, (u) => instagramImagemComoDataUrl(token, u)) } catch { /* sem leitura: fica fora da nota */ }
          if (geracao.current !== minha) return
          setFeed((f) => ({ ...f, posts: f.posts.map((x) => (x.id === p.id ? { ...x, props } : x)) }))
        }
      }
      await Promise.all([trabalhar(), trabalhar(), trabalhar(), trabalhar()])
    } catch (err) {
      if (geracao.current === minha) setFeed({ estado: 'erro', posts: [], erro: err.message || 'Não foi possível buscar o feed.' })
    }
  }

  // ---------- tiles ----------
  const tilesNovos = novos.map((n) => {
    const l = leituras[n.id]
    return { id: n.id, origem: 'novo', nome: n.nome, img: l?.thumb ?? null, ...(l?.props ?? { energia: null }) }
  })
  const tilesExistentes = feed.posts.map((p) => ({ id: p.id, origem: 'publicado', nome: nomeDoPost(p), img: p.miniatura, ...(p.props ?? { energia: null }) }))
  const tilesFixados = guardado.fixados.map((id) => tilesExistentes.find((t) => t.id === id)).filter(Boolean)
  const grade = montarGrade({ fixados: tilesFixados, novos: tilesNovos, existentes: tilesExistentes })
  const nomes = Object.fromEntries(grade.map((t) => [t.id, t.nome]))
  const pendentes = novos.filter((n) => { const l = leituras[n.id]; return !l || l.capa !== n.capa || l.formato !== n.formato || l.contador !== n.contador }).length
    + feed.posts.filter((p) => p.props === undefined).length
  const { nota, corte } = avaliarGrade(grade)
  const leituraDoTile = (t) => (t.energia == null ? { texto: 'sem leitura', forte: false } : { texto: `${t.energia >= corte ? 'forte' : t.energia >= PISO_FORTE ? 'médio' : 'baixo'} ${Math.round(t.energia * 100)}${t.tipo ? ` · ${t.tipo}` : ''}`, forte: t.energia >= corte })

  // ---------- análise do Content: recalculada quando a grade muda, só com tudo lido ----------
  const assinatura = [guardado.fixados.join(), ...grade.map((t) => `${t.id}:${t.energia == null ? '-' : Math.round(t.energia * 100)}:${Math.round((t.luz ?? 0) * 100)}:${t.tom == null ? '-' : Math.round(t.tom)}`)].join('|')
  const capas = useMemo(() => Object.fromEntries(novos.map((n) => [n.id, n.capa])), [novos])
  /* eslint-disable react-hooks/exhaustive-deps -- a assinatura resume tilesNovos, tilesExistentes e tilesFixados */
  const analise = useMemo(
    () => (analisando && pendentes === 0 ? analisarGrade({ fixados: tilesFixados, novos: tilesNovos, existentes: tilesExistentes, capas }) : null),
    [analisando, pendentes, assinatura, capas],
  )
  /* eslint-enable react-hooks/exhaustive-deps */
  const exibida = ideal && analise?.ideal ? analise.ideal.ids.map((id) => grade.find((t) => t.id === id)).filter(Boolean) : grade
  const tilesVisiveis = exibida.map((t) => ({ ...t, fixado: guardado.fixados.includes(t.id) }))

  // ---------- ações ----------
  const mudar = (fn) => setGuardado((g) => fn(g))
  const idsNovos = novos.map((n) => n.id)
  const mover = (id, d) => mudar((g) => {
    const ids = [...idsNovos]
    const i = ids.indexOf(id), j = i + d
    if (i < 0 || j < 0 || j >= ids.length) return g
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    return { ...g, ordem: ids }
  })
  const alternarFixado = (id) => {
    if (guardado.fixados.includes(id)) return mudar((g) => ({ ...g, fixados: g.fixados.filter((x) => x !== id) }))
    if (guardado.fixados.length >= MAX_FIXADOS) return setMensagem('O Instagram deixa fixar até 3 posts. Solte um antes de fixar outro.')
    setMensagem('')
    mudar((g) => ({ ...g, fixados: [...g.fixados, id] }))
  }
  const remover = (id) => {
    setSelecionado(null)
    if (id === 'editor') return mudar((g) => ({ ...g, incluirEditor: false }))
    mudar((g) => ({ ...g, itens: g.itens.filter((i) => i.id !== id), ordem: g.ordem.filter((x) => x !== id) }))
  }
  const aplicarFundo = (id, slide) => {
    if (id === 'editor') {
      onAplicarCapa(slide)
      setMensagem('Fundo aplicado ao card 1 do editor. Desfazer volta.')
    } else mudar((g) => ({ ...g, itens: g.itens.map((i) => (i.id === id ? { ...i, capa: slide } : i)) }))
    setIdeal(false)
  }
  const abrirBiblioteca = async () => {
    setMensagem('')
    try { setBiblioteca(await carregarBiblioteca()) } catch { setMensagem('Não foi possível abrir as artes salvas.') }
  }
  const adicionar = (a) => {
    const capa = a.projeto.slides[0]
    if (!ehFeed(capa, a.projeto.formato)) return setMensagem('A capa dessa arte é um Story e não aparece na grade do perfil.')
    if (novos.length >= MAX_NOVOS) return setMensagem(`A grade simula até ${MAX_NOVOS} posts novos. Tire um para adicionar outro.`)
    const projetoId = a.projetoId || a.id
    if (guardado.itens.some((i) => i.projetoId === projetoId)) return setMensagem('Essa arte já está na grade.')
    setMensagem('')
    mudar((g) => ({ ...g, itens: [...g.itens, { id: `fila:${crypto.randomUUID()}`, projetoId, nome: a.nome, capa, formato: a.projeto.formato, contador: contadorDe(a.projeto) }] }))
  }

  const escolhido = tilesVisiveis.find((t) => t.id === selecionado)
  const iEscolhido = idsNovos.indexOf(selecionado)
  const idealAtivo = ideal && !!analise?.ideal

  return (
    <details className="mb-4 border border-gray-200 rounded-xl p-3" aria-label="Grade do Instagram" onToggle={(e) => setAberto(e.currentTarget.open)}>
      <summary className="font-semibold text-sm cursor-pointer py-2.5">Grade do Instagram · ver o feed antes de postar</summary>
      {aberto && (
        <div className="space-y-4 mt-3">
          <p className="text-xs text-gray-500">Mostra como os posts novos ficam na grade do perfil, junto do que já está publicado. Nada é publicado nem alterado no Instagram.</p>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={botao} disabled={feed.estado === 'carregando'} onClick={carregarFeed}>{feed.estado === 'ok' ? 'Recarregar o feed atual' : 'Carregar o feed atual'}</button>
            <button type="button" className={botao} onClick={abrirBiblioteca}>Adicionar arte salva</button>
            <label className="flex items-center gap-2 min-h-11 text-sm">
              Proporção
              <select aria-label="Proporção dos posts na grade" value={proporcao} onChange={(e) => setProporcao(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-2 min-h-11">
                <option value="3/4">3:4 (perfil atual)</option>
                <option value="4/5">4:5 (como a arte é feita)</option>
              </select>
            </label>
          </div>

          {editorElegivel
            ? <label className="flex items-center gap-2 min-h-11 text-sm"><input type="checkbox" checked={guardado.incluirEditor} onChange={(e) => mudar((g) => ({ ...g, incluirEditor: e.target.checked }))} />Incluir o card 1 da arte em edição na grade</label>
            : <p className="text-xs text-gray-500">O card 1 do editor é um Story, que não aparece na grade do perfil.</p>}

          {tilesVisiveis.length > 0 && <label className="flex items-center gap-2 min-h-11 text-sm"><input type="checkbox" checked={mostrarLeitura} onChange={(e) => setMostrarLeitura(e.target.checked)} />Mostrar o que o Content leu em cada imagem</label>}
          {mostrarLeitura && nota != null && <p className="text-xs text-gray-500" aria-label="Como ler os selos">Barulho de 0 a 100: quanto a imagem grita em cor viva e contraste dentro dela. Baixo é até {Math.round(PISO_FORTE * 100)}, médio vai até {Math.round(corte * 100)} e forte é daí para cima (o corte é o terço mais forte do seu feed). "Baixo" não quer dizer imagem simples, e sim pouca cor viva. O tipo é foto quando as cores se espalham e arte quando há áreas chapadas, como cards e prints.</p>}

          {feed.estado === 'carregando' && <p role="status" className="flex items-center gap-2 text-sm text-gray-600"><Loader2 size={15} className="animate-spin" />Buscando as últimas publicações…</p>}
          {feed.estado === 'erro' && <p role="alert" className="text-sm text-red-700">{feed.erro} {/Configurações/.test(feed.erro) && <Link to="/settings" className="underline">Abrir Configurações</Link>}</p>}
          {feed.estado === 'ok' && !feed.posts.length && <p className="text-sm text-gray-600">Nenhuma publicação encontrada nessa conta.</p>}
          {mensagem && <p role="status" className="text-sm text-gray-700">{mensagem}</p>}

          {biblioteca && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2" aria-label="Artes salvas">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm">Artes salvas</strong><button type="button" className={botao} onClick={() => setBiblioteca(null)}>Fechar</button></div>
              {biblioteca.aviso && <p className="text-xs text-gray-500">{biblioteca.aviso}</p>}
              {!biblioteca.artes.length && <p className="text-sm">Nenhuma arte salva ainda.</p>}
              <div className="max-h-56 overflow-y-auto space-y-2">
                {biblioteca.artes.map((a) => (
                  <div key={a.projetoId || a.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-2">
                    <p className="min-w-0 text-sm break-words">{a.nome}</p>
                    <button type="button" className={botao} onClick={() => adicionar(a)}>Adicionar à grade</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="w-full max-w-sm shrink-0 space-y-2">
              {tilesVisiveis.length
                ? <GradeVisual tiles={tilesVisiveis} proporcao={proporcao} selecionado={selecionado} destacados={ideal ? [] : destacados} leitura={mostrarLeitura && nota != null ? leituraDoTile : null} onSelecionar={setSelecionado} />
                : <p className="text-sm text-gray-600">A grade está vazia. Carregue o feed atual ou adicione uma arte.</p>}
              {tilesVisiveis.length > JANELA && <p className="text-xs text-gray-500">Os {JANELA} primeiros posts (4 linhas) entram na nota. O resto aparece mais claro.</p>}
              {idealAtivo && <p role="status" className="text-xs text-orange-800">Mostrando a ordem ideal, só simulação. Os botões de mover e fixar voltam quando você voltar para a grade real.</p>}

              {escolhido && !idealAtivo && (
                <div className="rounded-lg border border-orange-200 p-2 space-y-2" aria-label="Post selecionado">
                  <p className="text-sm break-words">{escolhido.nome}</p>
                  {escolhido.origem === 'novo'
                    ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={botao} disabled={iEscolhido <= 0} onClick={() => mover(escolhido.id, -1)}>Mover para antes</button>
                        <button type="button" className={botao} disabled={iEscolhido < 0 || iEscolhido >= idsNovos.length - 1} onClick={() => mover(escolhido.id, 1)}>Mover para depois</button>
                        <button type="button" className={botao} onClick={() => remover(escolhido.id)}>{escolhido.id === 'editor' ? 'Tirar da grade' : 'Remover da grade'}</button>
                      </div>
                    )
                    : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" className={botao} onClick={() => alternarFixado(escolhido.id)}>{escolhido.fixado ? 'Soltar do topo' : 'Fixar no topo'}</button>
                        {feed.posts.find((p) => p.id === escolhido.id)?.link && <a className="text-sm text-orange-800 underline" href={feed.posts.find((p) => p.id === escolhido.id).link} target="_blank" rel="noreferrer">Abrir no Instagram</a>}
                      </div>
                    )}
                  {escolhido.origem !== 'novo' && <p className="text-xs text-gray-500">Fixar só simula aqui. Se você já fixou posts no Instagram, fixe os mesmos para a grade bater com o perfil.</p>}
                </div>
              )}

              {novos.length > 1 && (
                <div aria-label="Ordem para publicar" className="text-xs text-gray-600">
                  <p className="font-medium text-gray-800">Para a grade ficar assim, publique nesta ordem:</p>
                  <ol className="list-decimal pl-5">{[...novos].reverse().map((n) => <li key={n.id}>{n.nome}</li>)}</ol>
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg bg-orange-700 text-white hover:bg-orange-800 disabled:opacity-40" disabled={!tilesVisiveis.length} onClick={() => { setAnalisando(true); setIdeal(false) }}>Content: sugerir ajustes na grade</button>
                {nota != null && <span className="text-sm text-gray-700">Nota agora: <strong>{nota}</strong> de 100</span>}
              </div>
              {!analisando && <p className="text-xs text-gray-500">O Content mede a cor e a luz de cada post, procura vizinhos que brigam entre si e sugere ordem, posts para fixar e troca de fundo nos posts novos.</p>}
              {analisando && <SugestoesGrade analise={analise} pendentes={pendentes} nomes={nomes} idealAtivo={idealAtivo} bloqueado={bloqueado} onDestacar={setDestacados} onOrdem={(ids) => { mudar((g) => ({ ...g, ordem: ids })); setIdeal(false) }} onFixar={(ids) => { mudar((g) => ({ ...g, fixados: ids })); setIdeal(false) }} onFundo={aplicarFundo} onIdeal={() => setIdeal((v) => !v)} />}
            </div>
          </div>
        </div>
      )}
    </details>
  )
}
