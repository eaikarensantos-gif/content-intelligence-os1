import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import useHistorico from './useHistorico'
import { avaliarLayouts } from './avaliarLayouts'
import { CATALOGO_LAYOUTS, idLayout } from './layoutSuggestions'
import SugestoesLayout from './SugestoesLayout'
import { Download, FileText, LayoutGrid, Loader2, RotateCcw, Undo2, Redo2 } from 'lucide-react'
import { FORMATOS, normalizar } from './marca'
import { TEMPLATES } from './Templates'
import { lerRascunho, salvarRascunho } from './armazem'
import { prepararFoto, recortarPessoa } from './recorte'
import { fixarTextos, montarProjeto, pedidoDeSlides, pedirArte, pegarEntrada } from './pedido'
import { CARTAO, CARTOES, CATEGORIAS } from './cartoes/colecao'
import { camposDaCamada, ehCartao, formatoDe, fotosDe, normalizarCartao, novoCartao, textosDe } from './cartoes/render'
import Galeria from './Galeria'
import Pedido from './Pedido.jsx'
import Banco from './Banco.jsx'
import ArtesSalvas from './ArtesSalvas'
import EdicaoNaArte from './EdicaoNaArte'
import VisaoGeral from './VisaoGeral'
import PacotePublicacao from './PacotePublicacao'
import { arquivosDoPacote, pacoteDe } from './pacotePublicacao'
import RevisaoFinal from './RevisaoFinal'
import { revisarCards, gerarDownload, mesmaArte } from './exportacaoArte'
import { aplicarEmLote, reordenarProjeto, encaixarBloco, restaurarPosicoes } from './ajustesProjeto'
import { BASE_COM_FOTO, NOMES_BLOCO, PROJETO_INICIAL, aliviar, conteudoProprio, ehCamada, levarConteudo, novoSlide, padraoDe, tamanho, temAjustes } from './conteudoSlide'
import { Canvas } from './CanvasArte'
import PainelEmojis from './PainelEmojis'
import { SeletorModelo, SeletorVisual } from './SeletoresModelo'
import CampoTexto from './CampoTexto'
import PainelFoto from './PainelFoto'
import PainelCamada from './PainelCamada'
import PainelBloco from './PainelBloco'
import BarraCards from './BarraCards'
import ElementosDaArte from './ElementosDaArte'
import ModeloEImagens from './ModeloEImagens'
import { Campo, Cores, Faixa } from './controles'
import './marca.css'

export default function ArteStudio() {
  const { projeto, setProjeto, navegar, reset, desfazer, refazer, podeDesfazer, podeRefazer, iniciarGrupo, encerrarGrupo } = useHistorico(PROJETO_INICIAL)
  const [carregado, setCarregado] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [ocupado, setOcupado] = useState('')
  const [aviso, setAviso] = useState('')
  const [anterior, setAnterior] = useState(null)
  const [bancoAberto, setBancoAberto] = useState(false)
  const [fotoAlvo, setFotoAlvo] = useState(null)
  const [galeria, setGaleria] = useState(false)
  const [catVisual, setCatVisual] = useState(null)
  const [edicao, setEdicao] = useState(null)
  const [revisao, setRevisao] = useState(null)
  const [guiasAtivas, setGuiasAtivas] = useState(true)
  const [guias, setGuias] = useState([])
  const node = useRef(null)
  const projetoAtual = useRef(projeto)
  projetoAtual.current = projeto
  const [sugestoes, setSugestoes] = useState({})
  const [analisandoLayout, setAnalisandoLayout] = useState(null)
  const [larguraJanela, setLarguraJanela] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280))
  useEffect(() => {
    const atualizar = () => setLarguraJanela(window.innerWidth)
    window.addEventListener('resize', atualizar)
    return () => window.removeEventListener('resize', atualizar)
  }, [])

  const { formato, slides, atual } = projeto
  const arte = slides[atual]
  const cartao = ehCartao(arte)
  const def = cartao ? CARTAO[arte.cartao] : null
  const { w, h } = tamanho(arte, formato)
  // No celular a arte encolhe para caber na tela, com o painel logo abaixo.
  const escala = Math.min(520, larguraJanela - 48) / w
  const contadorDe = (i) => (projeto.contador && slides.length > 1 ? `${i + 1}/${slides.length}` : '')

  useEffect(() => {
    lerRascunho().then((salvo) => {
      if (salvo?.slides?.length) {
        const slides = salvo.slides
          .filter((s) => s.template in TEMPLATES || ehCartao(s))
          .map((s) => (ehCartao(s) ? normalizarCartao(s) : normalizar(s, { ...TEMPLATES[s.template].padrao, template: s.template })))
        if (slides.length) reset({ ...PROJETO_INICIAL, ...salvo, slides, atual: Math.min(salvo.atual ?? 0, slides.length - 1) })
      }
      setCarregado(true)
    })
  }, [reset])
  useEffect(() => { if (carregado) salvarRascunho(projeto) }, [projeto, carregado])

  const mudarProjeto = (campos) => setProjeto((p) => ({ ...p, ...campos }))
  const mudarPacote = (campos) => setProjeto((p) => ({ ...p, pacote: { ...pacoteDe(p), ...campos } }))
  const mudarGate = (id, valor) => setProjeto((p) => { const pacote = pacoteDe(p); return { ...p, pacote: { ...pacote, gates: { ...pacote.gates, [id]: valor } } } })
  const mudarAlt = (i, texto) => setProjeto((p) => ({ ...p, slides: p.slides.map((s, j) => (j === i ? { ...s, alt: texto } : s)) }))
  const mudarSlide = (fn) => setProjeto((p) => ({ ...p, slides: p.slides.map((s, i) => (i === p.atual ? fn(s) : s)) }))
  const mudar = (campos) => mudarSlide((s) => ({ ...s, ...campos }))
  const mudarEst = (id, campos) => mudarSlide((s) => ({ ...s, est: { ...s.est, [id]: { ...(s.est?.[id] ?? {}), ...campos } } }))
  const mudarCamada = (i, campos) => mudarSlide((s) => ({ ...s, camadas: { ...s.camadas, [i]: { ...(s.camadas?.[i] ?? {}), ...campos } } }))
  const mudarTexto = (id, valor) => mudarSlide((s) => ({ ...s, textos: { ...s.textos, [id]: valor } }))
  const apagarElemento = (id) => {
    if (id === 'foto') mudar({ foto: '', recorte: '' })
    else if (ehCamada(id)) mudarCamada(Number(id.slice(7)), { oculto: true })
    else if (id.startsWith('emoji:')) mudarSlide((s) => ({ ...s, emojis: s.emojis.filter((_, i) => i !== Number(id.slice(6))) }))
    else mudarEst(id, { oculto: true })
    setSelecionado(null)
  }

  const editarNaArte = e => {
    const canvas = node.current
    let elemento = e.target.closest('[data-elemento]')
    let campo
    if (cartao) {
      const raiz = canvas.querySelector('.kc')
      elemento = e.target
      while (elemento && elemento.parentElement !== raiz) elemento = elemento.parentElement
      if (!elemento) return
      const indice = [...raiz.children].indexOf(elemento)
      const campos = camposDaCamada(def, arte, indice)
      const valores = textosDe(def, arte)
      const trecho = e.target.textContent.trim()
      campo = campos.find(c => valores[c.id]?.replaceAll('*', '').includes(trecho)) || campos[0]
      if (!campo) return
      campo = { id: campo.id, valor: valores[campo.id] || '', cartao: true }
    } else {
      const id = elemento?.dataset.elemento
      if (!NOMES_BLOCO[id]) return
      campo = { id, valor: arte[id] || '', cartao: false }
    }
    const rect = elemento.getBoundingClientRect()
    const bounds = canvas.getBoundingClientRect()
    const x = Math.max(0, rect.left - bounds.left)
    const y = Math.max(0, Math.min(rect.top - bounds.top, bounds.height - 100))
    encerrarGrupo('pointer')
    setEdicao({ ...campo, x, y, largura: Math.min(Math.max(rect.width, 180), bounds.width - x), altura: Math.max(100, Math.min(rect.height + 24, bounds.height - y)), fonte: Math.max(16, Math.min(36, parseFloat(getComputedStyle(e.target).fontSize) * escala)) })
  }
  const voltarEdicao = () => { desfazer(); setSelecionado(null); setAnterior(null) }
  const repetirEdicao = () => { refazer(); setSelecionado(null); setAnterior(null) }
  useEffect(() => {
    const encerrar = () => { encerrarGrupo('pointer'); setGuias([]) }
    window.addEventListener('pointerup', encerrar)
    window.addEventListener('pointercancel', encerrar)
    return () => {
      window.removeEventListener('pointerup', encerrar)
      window.removeEventListener('pointercancel', encerrar)
    }
  }, [encerrarGrupo])

  useEffect(() => {
    const tecla = (e) => {
      const digitando = e.target.closest('textarea, input:not([type="range"]):not([type="checkbox"]), [contenteditable="true"]')
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !digitando && !galeria && !bancoAberto && !ocupado && carregado) {
        const key = e.key.toLowerCase()
        if (key === 'z' || key === 'y') {
          e.preventDefault()
          if (key === 'y' || e.shiftKey) repetirEdicao()
          else voltarEdicao()
          return
        }
      }
      if (!selecionado || galeria || bancoAberto || ocupado || !['Delete', 'Backspace'].includes(e.key) || e.target.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault()
      apagarElemento(selecionado)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const trocarTemplate = (id) => {
    // Texto que ainda é o exemplo do template antigo dá lugar ao exemplo do novo; texto escrito por ela fica.
    const proprio = (s, k) => (s[k] !== TEMPLATES[s.template].padrao[k] ? { [k]: s[k] } : {})
    setAnterior(projeto)
    mudarSlide((s) => {
      const c = conteudoProprio(s)
      return novoSlide(id, { conteudo: c, ...(c.titulo != null && { titulo: c.titulo }), ...(c.texto != null && { texto: c.texto }), ...proprio(s, 'detalhe'), foto: s.foto, recorte: s.recorte, fotoX: s.fotoX, fotoY: s.fotoY, fotoZoom: s.fotoZoom, fotoDX: s.fotoDX, fotoDY: s.fotoDY, fotoCorte: s.fotoCorte })
    })
    setSelecionado(null)
    if (TEMPLATES[id].recorta && arte.foto && !arte.recorte) gerarRecorte(arte.foto)
  }
  const alinharMovimento = (elemento, dx, dy) => {
    if (!guiasAtivas || !elemento || !node.current) return { dx, dy }
    const bounds = node.current.getBoundingClientRect()
    const rect = el => { const r = el.getBoundingClientRect(); return { x: (r.left - bounds.left) / escala, y: (r.top - bounds.top) / escala, w: r.width / escala, h: r.height / escala } }
    const atual = rect(elemento)
    const elementos = cartao ? [...node.current.querySelector('.kc').children] : [...node.current.querySelectorAll('[data-elemento]')]
    const outros = elementos.filter(el => el !== elemento && getComputedStyle(el).visibility !== 'hidden').map(rect).filter(r => r.w && r.h && r.w * r.h < w * h * 0.9)
    const ajuste = encaixarBloco({ ...atual, x: atual.x + dx, y: atual.y + dy }, outros, w, h)
    setGuias(ajuste.linhas)
    return { dx: ajuste.x - atual.x, dy: ajuste.y - atual.y }
  }
  const mover = (chave, x, y) => {
    if (chave !== 'foto') {
      const pos = chave.startsWith('emoji:') ? arte.emojis[Number(chave.slice(6))] : arte.pos[chave]
      if (pos) {
        const d = alinharMovimento(node.current?.querySelector(`[data-elemento="${chave}"]`), x - pos.x, y - pos.y)
        x = Math.round(pos.x + d.dx); y = Math.round(pos.y + d.dy)
      }
    }
    mudarSlide(s => {
      if (chave === 'foto') return { ...s, fotoDX: x, fotoDY: y }
      if (chave.startsWith('emoji:')) return { ...s, emojis: s.emojis.map((e, j) => j === Number(chave.slice(6)) ? { ...e, x, y } : e) }
      return { ...s, pos: { ...s.pos, [chave]: { x, y } } }
    })
  }
  const moverCamada = (i, dx, dy) => {
    const c = arte.camadas?.[i] || {}
    const d = alinharMovimento(node.current?.querySelector('.kc')?.children[i], dx - (c.dx || 0), dy - (c.dy || 0))
    mudarCamada(i, { dx: (c.dx || 0) + d.dx, dy: (c.dy || 0) + d.dy })
  }

  const gerarRecorte = async (foto) => {
    setOcupado('Recortando a pessoa da foto…')
    setAviso('')
    try {
      const recorte = await recortarPessoa(foto)
      setProjeto((p) => ({ ...p, slides: p.slides.map((s) => (s.foto === foto ? { ...s, recorte } : s)) }))
    } catch (err) {
      setAviso(`Não consegui recortar a foto: ${err?.message ?? err}`)
    } finally {
      setOcupado('')
    }
  }

  // Card "texto atrás da cabeça": a foto nova precisa de um recorte novo da pessoa.
  const recortarCartao = async (slot, foto) => {
    setOcupado('Recortando a pessoa da foto…')
    setAviso('')
    try {
      const recorte = await recortarPessoa(foto)
      setProjeto((p) => ({ ...p, slides: p.slides.map((s) => (s.fotos?.[slot] === foto ? { ...s, fotos: { ...s.fotos, [`${slot}:recorte`]: recorte } } : s)) }))
    } catch (err) {
      setAviso(`Não consegui recortar a foto: ${err?.message ?? err}`)
    } finally {
      setOcupado('')
    }
  }
  const trocarFotoCartao = async (slot, origem) => {
    const foto = typeof origem === 'string' ? origem : await prepararFoto(origem)
    const cabeca = def.cabeca?.slot === slot
    mudarSlide((s) => ({ ...s, fotos: { ...s.fotos, [slot]: foto, ...(cabeca && { [`${slot}:recorte`]: '' }) } }))
    if (cabeca) recortarCartao(slot, foto)
  }
  const fotoOriginal = (slot) => mudarSlide((s) => {
    const fotos = { ...s.fotos }
    delete fotos[slot]
    delete fotos[`${slot}:recorte`]
    return { ...s, fotos }
  })

  // Recebe um arquivo/Blob (upload ou banco) ou um data URL (quadro de vídeo, já reduzido).
  const usarFoto = async (origem, slot = fotoAlvo) => {
    if (cartao) return trocarFotoCartao(slot ?? fotosDe(def)[0], origem)
    const foto = typeof origem === 'string' ? origem : await prepararFoto(origem)
    mudar({ foto, recorte: '', fotoX: 50, fotoY: 30, fotoZoom: 100, fotoDX: 0, fotoDY: 0, fotoCorte: {}, veu: arte.veu || 0.3 })
    setSelecionado('foto')
    if (TEMPLATES[arte.template].recorta) gerarRecorte(foto)
  }
  const escolherFoto = (slot) => (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) usarFoto(f, slot)
  }
  const abrirBanco = (slot = null) => { setFotoAlvo(slot); setBancoAberto(true) }

  const papelLayout = (s, i, total, informado) => {
    if (['capa', 'explicacao', 'conversa', 'lista', 'fechamento'].includes(informado)) return informado
    if (s.template === 'chat' || (ehCartao(s) && CARTAO[s.cartao].categoria === 'baloes')) return 'conversa'
    return i === 0 ? 'capa' : i === total - 1 ? 'fechamento' : 'explicacao'
  }
  const renderLayout = (s, f = formato, numero = contadorDe(atual)) => <Canvas arte={s} formato={f} contador={numero} interativo={false} grao={false} />
  const sugerirLayouts = async () => {
    const origem = arte
    const indice = atual
    setAnalisandoLayout(indice)
    try {
      const resultado = await avaliarLayouts(origem, { formato: cartao ? formatoDe(def) : formato, papel: papelLayout(origem, indice, slides.length), anteriores: slides.slice(Math.max(0, indice - 2), indice).map(idLayout) }, s => renderLayout(s))
      setSugestoes(prev => ({ ...prev, [indice]: { origem, ...resultado } }))
    } catch {
      setAviso('Não consegui conferir os layouts. Sua arte foi mantida; tente novamente.')
    } finally { setAnalisandoLayout(null) }
  }
  const aplicarSugestao = (opcao) => {
    if (sugestoes[atual]?.origem !== arte) return
    mudarSlide(() => opcao.slide)
    setSugestoes(prev => ({ ...prev, [atual]: { ...prev[atual], origem: opcao.slide, problemas: [] } }))
    setSelecionado(null)
  }

  const aplicarPedido = async (resposta, pedido = '') => {
    const antes = projetoAtual.current
    const foto = cartao ? arte.fotos?.[fotosDe(def)[0]] || '' : arte.foto
    const novo = montarProjeto(resposta, foto)
    setOcupado('Conferindo os layouts…')
    setAviso('')
    try {
      const precisaRecorte = foto && novo.slides.some(s => ehCartao(s) ? CARTAO[s.cartao].cabeca && Object.values(s.fotos).includes(foto) : TEMPLATES[s.template]?.recorta && s.foto)
      if (precisaRecorte) {
        try {
          const recorte = await recortarPessoa(foto)
          novo.slides = novo.slides.map(s => {
            if (!ehCartao(s)) return s.foto === foto ? { ...s, recorte } : s
            const slot = CARTAO[s.cartao].cabeca?.slot
            return slot && s.fotos[slot] === foto ? { ...s, fotos: { ...s.fotos, [`${slot}:recorte`]: recorte } } : s
          })
        } catch { setAviso('Não consegui recortar a pessoa. Confira a foto antes de exportar.') }
      }
      const resultados = {}
      const usados = []
      const normal = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      const explicito = CATALOGO_LAYOUTS.find(c => normal(pedido).includes(normal(c.nome)))?.id || ''
      for (let i = 0; i < novo.slides.length; i++) {
        setOcupado(`Conferindo layout ${i + 1} de ${novo.slides.length}…`)
        const original = novo.slides[i]
        const resultado = await avaliarLayouts(original, { formato: novo.formato, papel: papelLayout(original, i, novo.slides.length, resposta.slides?.[i]?.papel), anteriores: usados.slice(-2), preferido: explicito, permitirFotoReferencia: !/sem fotos?|s[oó] (?:com )?textos?|apenas textos?/i.test(pedido) }, s => renderLayout(s, novo.formato, novo.contador ? `${i + 1}/${novo.slides.length}` : ''))
        if (!resultado.opcoes.length) throw new Error(`Não foi possível diagramar o card ${i + 1} sem sobreposição ou cortes. Divida o conteúdo em mais cards ou reduza o texto. Sua arte anterior foi mantida.`)
        const escolhido = resultado.opcoes[0].slide
        novo.slides[i] = escolhido
        resultados[i] = { ...resultado, origem: escolhido, problemas: resultado.opcoes.length ? [] : resultado.problemas }
        usados.push(idLayout(escolhido))
      }
      if (projetoAtual.current !== antes) {
        setAviso('A arte mudou durante a conferência. Mantive suas alterações; gere novamente quando terminar de editar.')
        return
      }
      setAnterior(antes)
      setProjeto(novo)
      setSugestoes(resultados)
      setSelecionado(null)
    } finally { setOcupado('') }
  }
  const desfazerPedido = () => { setProjeto(anterior); setAnterior(null); setSelecionado(null) }

  // Slides vindos de um gerador do Content: a IA só diagrama, o texto fica como veio.
  useEffect(() => {
    if (!carregado) return
    const entrada = pegarEntrada()
    if (!entrada) return
    setOcupado(`Montando o carrossel que veio do ${entrada.origem}…`)
    setAviso('')
    pedirArte(pedidoDeSlides(entrada.slides))
      .then(resposta => fixarTextos(resposta, entrada.slides), () => ({
        slides: entrada.slides.map(s => ({ template: 'corCheia', titulo: s.titulo, texto: s.texto })),
      }))
      .then(resposta => aplicarPedido(resposta))
      .catch(err => setAviso(err?.message || 'Não foi possível diagramar os cards. Sua arte anterior foi mantida.'))
      .finally(() => setOcupado(''))
  }, [carregado]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- galeria de modelos ----------
  const itensGaleria = useMemo(() => [
    ...CARTOES.map((k) => ({
      id: `cartao:${k.id}`, nome: k.nome, categoria: k.categoria, categoriaNome: CATEGORIAS[k.categoria], w: k.w, h: k.h,
      formato: formatoDe(k), comFoto: fotosDe(k).length > 0, busca: k.campos.map((c) => c.padrao).join(' '),
    })),
    ...Object.entries(TEMPLATES).map(([k, t]) => ({
      id: k, nome: t.nome, categoria: 'base', categoriaNome: 'Base do Studio', ...FORMATOS.feed,
      formato: 'feed', comFoto: BASE_COM_FOTO.includes(k), busca: `${t.padrao.titulo} ${t.padrao.texto}`,
    })),
  ], [])
  const renderMini = (item) =>
    item.id.startsWith('cartao:')
      ? <Canvas arte={novoCartao(item.id.slice(7))} formato="feed" interativo={false} grao={false} />
      : <Canvas arte={novoSlide(item.id)} formato="feed" interativo={false} />

  const aplicarModelo = (id, modo) => {
    let novo = id.startsWith('cartao:') ? novoCartao(id.slice(7)) : novoSlide(id)
    if (modo === 'atual') {
      // O texto e a foto sempre vão junto; só posições e ajustes finos ficam para trás, então só aí ela é avisada.
      if (temAjustes(arte) && !window.confirm('Trocar o modelo deste card? Seu título, seu texto e a foto vão para o novo modelo. As posições e ajustes que você fez neste modelo ficam para trás. Dá para voltar com Desfazer (Ctrl+Z).')) return
      novo = levarConteudo(arte, novo)
    }
    setAnterior(projeto)
    setProjeto((p) => (modo === 'novo'
      ? { ...p, slides: [...p.slides.slice(0, p.atual + 1), novo, ...p.slides.slice(p.atual + 1)], atual: p.atual + 1 }
      : { ...p, slides: p.slides.map((s, i) => (i === p.atual ? novo : s)) }))
    setSelecionado(null)
    setGaleria(false)
    if (!ehCartao(novo) && TEMPLATES[novo.template].recorta && novo.foto && !novo.recorte) gerarRecorte(novo.foto)
    if (ehCartao(novo) && CARTAO[novo.cartao].cabeca) {
      const slot = CARTAO[novo.cartao].cabeca.slot
      if (novo.fotos[slot] && !novo.fotos[`${slot}:recorte`]) recortarCartao(slot, novo.fotos[slot])
    }
  }

  // Slides
  const irPara = (i) => { navegar((p) => ({ ...p, atual: i })); setSelecionado(null) }
  const adicionar = () => setProjeto((p) => ({ ...p, slides: [...p.slides, padraoDe(p.slides[p.atual])], atual: p.slides.length }))
  const duplicar = () => setProjeto((p) => ({ ...p, slides: [...p.slides.slice(0, p.atual + 1), { ...structuredClone(p.slides[p.atual]), alt: '' }, ...p.slides.slice(p.atual + 1)], atual: p.atual + 1 }))
  const apagar = () => setProjeto((p) => (p.slides.length < 2 ? p : { ...p, slides: p.slides.filter((_, i) => i !== p.atual), atual: Math.max(0, p.atual - 1) }))
  const mudarOrdem = (d) => setProjeto((p) => {
    const j = p.atual + d
    if (j < 0 || j >= p.slides.length) return p
    const s = [...p.slides];
    [s[p.atual], s[j]] = [s[j], s[p.atual]]
    return { ...p, slides: s, atual: j }
  })

  const renderProjeto = (p, slide, i) => <Canvas arte={slide} formato={p.formato} contador={p.contador && p.slides.length > 1 ? `${i + 1}/${p.slides.length}` : ''} interativo={false} />
  const baixarRevisao = async r => {
    if (!mesmaArte(projetoAtual.current, r.origem)) { setAviso('A arte mudou. Revise novamente antes de baixar.'); return }
    setOcupado('Preparando download…')
    try {
      const arquivo = await gerarDownload(r.origem, r.indices, (s, i) => renderProjeto(r.origem, s, i), r.formato, setOcupado, r.formato === 'zip' ? arquivosDoPacote(projetoAtual.current, r.indices) : {})
      const url = URL.createObjectURL(arquivo.blob)
      const link = document.createElement('a'); link.href = url; link.download = arquivo.nome; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch { setAviso('Não foi possível exportar. Confira as imagens e tente novamente; sua arte foi mantida.') }
    finally { setOcupado('') }
  }
  const revisarExportacao = async (indices, formato = 'zip', automatico = true) => {
    const origem = projetoAtual.current
    indices = [...new Set(indices)].filter(i => i >= 0 && i < origem.slides.length).sort((a, b) => a - b)
    if (!indices.length) { setAviso('Selecione pelo menos um card para revisar.'); return }
    setOcupado('Revisando textos e diagramação…'); setAviso(''); setSelecionado(null)
    try {
      const cards = await revisarCards(origem, indices, (s, i) => renderProjeto(origem, s, i))
      const resultado = { origem, indices, formato, cards }
      setRevisao(resultado)
      const comAvisos = cards.some(c => c.problemas.length)
      if (comAvisos) setAviso('A revisão encontrou avisos. Confira o painel "Revisão antes de baixar" antes de exportar.')
      if (comAvisos || !automatico) requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('revisao-final')?.scrollIntoView({ behavior: 'smooth', block: 'center' })))
      if (automatico && !comAvisos) await baixarRevisao(resultado)
    } catch { setAviso('Não foi possível concluir a revisão. Tente novamente antes de baixar.') }
    finally { setOcupado('') }
  }
  const corrigirRevisao = async i => {
    const origem = projetoAtual.current
    setOcupado(`Conferindo alternativas para o card ${i + 1}…`)
    try {
      const resultado = await avaliarLayouts(origem.slides[i], { formato: origem.formato, papel: papelLayout(origem.slides[i], i, origem.slides.length) }, s => renderProjeto(origem, s, i))
      if (projetoAtual.current !== origem) return
      navegar(p => ({ ...p, atual: i }))
      setSugestoes(prev => ({ ...prev, [i]: { ...resultado, origem: origem.slides[i] } }))
      setAviso('Confira as sugestões de layout no painel. Depois de aplicar uma opção, revise novamente; cores podem precisar de ajuste manual.')
    } catch { setAviso('Não foi possível sugerir ajustes. O card foi mantido.') }
    finally { setOcupado('') }
  }
  const exportarAtual = () => revisarExportacao([atual], 'png')
  const exportarTodos = () => revisarExportacao(slides.map((_, i) => i), 'zip')
  const exportarPdf = () => revisarExportacao(slides.map((_, i) => i), 'pdf')

  const est = selecionado ? arte.est?.[selecionado] ?? {} : {}
  const tamanhoPadrao = { titulo: 100, texto: 40, detalhe: 46 }
  // Cada modelo tem o seu tamanho e largura de partida: lê o que está desenhado, e só cai no número fixo se não achar.
  const medirBloco = (id, tipo, reserva) => {
    const bloco = node.current?.querySelector(`[data-elemento="${id}"]`)
    if (!bloco) return reserva
    let valor = bloco.offsetWidth
    if (tipo === 'tamanho') {
      const no = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) }).nextNode()
      valor = no ? parseFloat(getComputedStyle(no.parentElement).fontSize) : NaN
    }
    return Number.isFinite(valor) && valor > 0 ? Math.round(valor) : reserva
  }
  const emojiSelecionado = selecionado?.startsWith('emoji:') ? arte.emojis[Number(selecionado.slice(6))] : null
  const camadaSel = ehCamada(selecionado) ? Number(selecionado.slice(7)) : -1
  const camada = camadaSel >= 0 ? arte.camadas?.[camadaSel] ?? {} : {}
  const elCamada = camadaSel >= 0 ? node.current?.querySelector('.kc')?.children[camadaSel] : null
  const camadasOcultas = cartao ? Object.entries(arte.camadas ?? {}).filter(([, c]) => c.oculto).map(([i]) => Number(i)) : []
  const fotosCartao = cartao ? fotosDe(def) : []

  // Lista com todos os modelos: trocar aqui leva o título, o texto e a foto do slide para o modelo escolhido.
  const trocarPelaLista = (id) => (!cartao && id in TEMPLATES ? trocarTemplate(id) : aplicarModelo(id, 'atual'))
  const seletorModelo = <SeletorModelo arte={arte} cartao={cartao} trocarPelaLista={trocarPelaLista} />

  // Miniaturas de todos os modelos já com o título, o texto e a foto deste slide.
  const modeloAtual = cartao ? `cartao:${arte.cartao}` : arte.template
  const categoriaAtual = catVisual ?? (cartao ? def.categoria : 'base')
  const arteAdiada = useDeferredValue(arte)
  const previas = useMemo(() => itensGaleria
    .filter((it) => categoriaAtual === 'todas' || it.categoria === categoriaAtual)
    .map((it) => ({ it, slide: aliviar(levarConteudo(arteAdiada, it.id.startsWith('cartao:') ? novoCartao(it.id.slice(7)) : novoSlide(it.id))) })),
  [itensGaleria, categoriaAtual, arteAdiada])
  const seletorVisual = <SeletorVisual previas={previas} categoriaAtual={categoriaAtual} setCatVisual={setCatVisual} modeloAtual={modeloAtual} trocarPelaLista={trocarPelaLista} />

  const painelEmojis = <PainelEmojis arte={arte} w={w} h={h} mudar={mudar} />

  const camposSelecionados = useMemo(() => cartao && camadaSel >= 0 ? camposDaCamada(def, arte, camadaSel) : [], [cartao, def, arte.textos, camadaSel]) // eslint-disable-line react-hooks/exhaustive-deps
  const idsSelecionados = new Set(camposSelecionados.map((c) => c.id))
  const renderCampoTexto = (c, compacto = false) => (
    <CampoTexto key={c.id} c={c} compacto={compacto} def={def} arte={arte} mudarTexto={mudarTexto} mudarCamada={mudarCamada} setSelecionado={setSelecionado} />
  )
  const camposTextoCartao = cartao ? def.campos.map((c) => renderCampoTexto(c)) : null

  return (
    <div className="p-6 pb-28 animate-fade-in"
      onPointerDownCapture={(e) => { if (e.target.closest('[data-canvas="editor"], input[type="range"]')) iniciarGrupo('pointer') }}
      onFocusCapture={(e) => { if (e.target.matches('textarea, input[type="text"]')) iniciarGrupo('texto') }}
      onBlurCapture={(e) => { if (e.target.matches('textarea, input[type="text"]')) encerrarGrupo('texto') }}
    >
      <ArtesSalvas onVincular={(id, nome, origem) => navegar(p => mesmaArte(p, origem) ? { ...p, bibliotecaId: id, nomeArte: nome } : p)} projeto={projeto} bloqueado={!carregado || !!ocupado} onAbrir={p => {
        encerrarGrupo('texto'); encerrarGrupo('pointer')
        setProjeto(p); setSelecionado(null); setAnterior(null); setSugestoes({}); setAviso('')
      }} onLimpar={() => {
        encerrarGrupo('texto'); encerrarGrupo('pointer')
        setProjeto({ ...PROJETO_INICIAL, slides: [novoSlide('corCheia', { titulo: '', texto: '', detalhe: '', foto: '', recorte: '', emojis: [] })] })
        setSelecionado(null); setAnterior(null); setSugestoes({}); setAviso('')
      }} />
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex gap-2" role="group" aria-label="Histórico de edição">
          <button type="button" onClick={voltarEdicao} disabled={!podeDesfazer || !carregado || !!ocupado} title="Desfazer (Ctrl+Z / ⌘Z)" className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40"><Undo2 size={16} />Desfazer</button>
          <button type="button" onClick={repetirEdicao} disabled={!podeRefazer || !carregado || !!ocupado} title="Refazer (Ctrl+Shift+Z / Ctrl+Y)" className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 disabled:opacity-40"><Redo2 size={16} />Refazer</button>
        </div>
        <div className="flex flex-wrap gap-2">

          <button type="button" onClick={exportarAtual} disabled={!!ocupado} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-40"><Download size={15} />Baixar este</button>
          <button type="button" onClick={exportarPdf} disabled={!!ocupado} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-40"><FileText size={15} />Baixar PDF</button>
          <button type="button" onClick={exportarTodos} disabled={!!ocupado} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg bg-orange-700 text-white hover:bg-orange-800 disabled:opacity-40"><Download size={15} />Baixar todos ({slides.length})</button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-5">Dê dois cliques ou dois toques no texto para editar na arte. Enter quebra a linha; clique fora para concluir. Arraste para reposicionar.</p>

      <details className="mb-4 rounded-xl border border-orange-200 bg-orange-50/30 p-3">
        <summary className="cursor-pointer text-sm font-semibold py-2.5">Criar com IA · descrever uma nova arte</summary>
        <div className="mt-3"><Pedido onResposta={aplicarPedido} desfazer={anterior ? desfazerPedido : null} /></div>
      </details>
      {bancoAberto && <Banco onFechar={() => setBancoAberto(false)} onEscolher={(origem) => { setBancoAberto(false); usarFoto(origem) }} />}
      {galeria && <Galeria itens={itensGaleria} categorias={{ ...CATEGORIAS, base: 'Base do Studio' }} renderMini={renderMini} onFechar={() => setGaleria(false)} onAplicar={aplicarModelo} />}

      {(ocupado || aviso) && (
        <div className={`mb-4 flex items-center gap-2 text-sm ${aviso ? 'text-red-600' : 'text-gray-600'}`}>
          {ocupado && <Loader2 size={15} className="animate-spin" />}{ocupado || aviso}
        </div>
      )}

      <VisaoGeral key={slides.length + ':' + (projeto.bibliotecaId || '')} projeto={projeto} bloqueado={!!ocupado} renderizar={(s, i) => renderProjeto(projeto, s, i)} tamanho={s => tamanho(s, formato)} onAbrir={i => { irPara(i); node.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} onReordenar={(de, para) => setProjeto(p => reordenarProjeto(p, de, para))} onLote={(indices, ajustes) => { setProjeto(p => aplicarEmLote(p, indices, ajustes)); setAviso('Ajustes aplicados. Revise o carrossel antes de exportar.'); }} onExportar={indices => revisarExportacao([...indices].sort((a, b) => a - b), 'zip')} />
      <PacotePublicacao projeto={projeto} bloqueado={!!ocupado} onLegenda={(legenda) => mudarPacote({ legenda })} onGate={mudarGate} onAlt={mudarAlt} onPublicacao={(publicacao) => mudarProjeto({ publicacao })} />
      <RevisaoFinal revisao={revisao} atual={projeto} bloqueado={!!ocupado} onAbrir={irPara} onCorrigir={corrigirRevisao} onRevisar={() => revisarExportacao(revisao.indices, revisao.formato, false)} onBaixar={() => baixarRevisao(revisao)} />
      <div className="flex flex-wrap gap-3 mb-3 text-xs">
        <label className="flex gap-2 items-center min-h-11"><input type="checkbox" checked={guiasAtivas} onChange={e => { setGuiasAtivas(e.target.checked); setGuias([]) }} />Guias e alinhamento automático</label>
        <button type="button" className="min-h-11 px-2 text-orange-800 underline disabled:opacity-40" disabled={!!ocupado} onClick={() => revisarExportacao(slides.map((_, i) => i), 'zip', false)}>Revisar carrossel</button>
        <span className="self-center">Baixar todos gera um ZIP com os cards em ordem. Baixar PDF junta os cards, uma página cada, para o LinkedIn.</span>
      </div>
      {/* Slides do carrossel */}
      <BarraCards slides={slides} formato={formato} atual={atual} irPara={irPara} contadorDe={contadorDe} adicionar={adicionar} duplicar={duplicar} mudarOrdem={mudarOrdem} apagar={apagar} />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="relative shrink-0 rounded-xl border border-gray-200" style={{ width: w * escala, height: h * escala }} onDoubleClick={editarNaArte} onKeyDown={e => {
          if (e.key !== 'Enter' || e.target.matches('input, textarea, button, select') || !selecionado) return
          const target = cartao ? node.current?.querySelector('.kc')?.children[camadaSel] : node.current?.querySelector(`[data-elemento="${selecionado}"]`)
          if (target) { e.preventDefault(); editarNaArte({ target }) }
        }}>
          <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left' }}>
            <Canvas arte={arte} formato={formato} contador={contadorDe(atual)} escala={escala} onMover={mover} onMoverCamada={moverCamada} onSelecionar={setSelecionado} selecionado={selecionado} nodeRef={node} />
          </div>
          {guiasAtivas && <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute border border-dashed border-cyan-500/40" style={{ inset: 64 * escala }} />
            {guias.map((g, i) => <div key={i} className="absolute border-cyan-500" style={g.eixo === 'x' ? { left: g.valor * escala, top: 0, bottom: 0, borderLeftWidth: 1 } : { top: g.valor * escala, left: 0, right: 0, borderTopWidth: 1 }}>{g.iguais && <span className="bg-white text-cyan-800 text-xs">Espaços iguais</span>}</div>)}
          </div>}
          {edicao && <EdicaoNaArte key={`${atual}:${edicao.id}`} campo={edicao} onCancelar={() => setEdicao(null)} onConcluir={valor => {
            if (valor !== edicao.valor) {
              if (edicao.cartao) mudarTexto(edicao.id, valor)
              else mudar({ [edicao.id]: valor })
            }
            setEdicao(null)
          }} />}
        </div>

        <div className="flex-1 w-full min-w-0 lg:max-w-sm flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[85vh] lg:overflow-y-auto">
          <ModeloEImagens arte={arte} def={def} cartao={cartao} fotosCartao={fotosCartao} itensGaleria={itensGaleria} setGaleria={setGaleria} escolherFoto={escolherFoto} abrirBanco={abrirBanco} mudar={mudar} fotoOriginal={fotoOriginal} />
          <details className="rounded-xl border border-gray-200 p-3">
            <summary className="text-sm cursor-pointer py-2.5">Restaurar diagramação</summary>
            <div className="mt-2">          <button type="button" onClick={() => { mudarSlide((s) => restaurarPosicoes(s, ehCartao(s) ? undefined : TEMPLATES[s.template].padrao.pos)); setSelecionado(null) }} className="flex items-center gap-1.5 min-h-11 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><RotateCcw size={15} />Posições padrão</button>
              <p className="text-xs text-gray-500 mt-1">Volta só a posição dos elementos. Fonte, cor, tamanho e elementos apagados ficam como estão.</p></div>
          </details>
          <SugestoesLayout arte={arte} resultado={sugestoes[atual]} analisando={analisandoLayout != null || !!ocupado} onAnalisar={sugerirLayouts} onAplicar={aplicarSugestao} renderizar={s => renderLayout(s)} tamanho={s => tamanho(s, formato)} />
          {!cartao && <ElementosDaArte arte={arte} selecionado={selecionado} setSelecionado={setSelecionado} mudar={mudar} mudarEst={mudarEst} apagarElemento={apagarElemento} />}

          {!cartao && arte.foto && (!selecionado || selecionado === 'foto') && (
            <PainelFoto arte={arte} w={w} h={h} mudar={mudar} gerarRecorte={gerarRecorte} apagarElemento={apagarElemento} ocupado={ocupado} />
          )}

          {emojiSelecionado && <div className="rounded-xl border border-orange-200 p-4 space-y-3"><h2 className="text-sm font-semibold">Emoji selecionado</h2><Faixa rotulo="Tamanho do emoji" valor={emojiSelecionado.tam} min={20} max={400} onChange={(tam) => mudar({ emojis: arte.emojis.map((e, i) => i === Number(selecionado.slice(6)) ? { ...e, tam } : e) })} /><button type="button" onClick={() => apagarElemento(selecionado)} className="text-sm text-red-600">Apagar emoji</button><button type="button" onClick={() => setSelecionado(null)} className="ml-3 text-sm text-gray-500">Fechar</button></div>}
          {camadaSel >= 0 ? (
            <PainelCamada arte={arte} def={def} elCamada={elCamada} camadaSel={camadaSel} camada={camada} camposSelecionados={camposSelecionados} idsSelecionados={idsSelecionados} selecionado={selecionado} setSelecionado={setSelecionado} apagarElemento={apagarElemento} mudarCamada={mudarCamada} renderCampoTexto={renderCampoTexto} />
          ) : cartao ? (
            <>
              <div className="rounded-xl border border-gray-200 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate" data-testid="modelo-atual">{def.nome}</p>
                  <p className="text-xs text-gray-500">{CATEGORIAS[def.categoria]} · {formatoDe(def) === 'story' ? 'Story 9:16' : 'Feed 4:5'}</p>
                </div>
                <button type="button" onClick={() => setGaleria(true)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"><LayoutGrid size={14} />Ver galeria</button>
              </div>
              {seletorVisual}
              <Campo rotulo="Modelo (pelo nome)">{seletorModelo}</Campo>
              <p className="text-xs text-gray-500">Clique em qualquer elemento da arte para mudar tamanho, fonte, cor, cortar ou apagar.</p>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={projeto.contador} onChange={(e) => mudarProjeto({ contador: e.target.checked })} />
                {slides.length > 1 ? `Numerar os cards (1/${slides.length}) em manuscrita` : 'Numerar os cards em manuscrita (aparece a partir de 2 cards)'}
              </label>
              {camadasOcultas.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {camadasOcultas.length === 1 ? '1 elemento apagado' : `${camadasOcultas.length} elementos apagados`}
                  <button type="button" onClick={() => mudarSlide((s) => ({ ...s, camadas: Object.fromEntries(Object.entries(s.camadas).map(([i, c]) => [i, { ...c, oculto: false }])) }))} className="flex items-center gap-1 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"><RotateCcw size={12} />Voltar todos</button>
                </div>
              )}

              <details><summary className="text-xs cursor-pointer py-2.5">Textos ocultos ou vazios · edição alternativa</summary><div className="space-y-3 mt-3">{camposTextoCartao}</div></details>

              {painelEmojis}
            </>
          ) : selecionado && NOMES_BLOCO[selecionado] ? (
            <PainelBloco arte={arte} selecionado={selecionado} est={est} setSelecionado={setSelecionado} mudar={mudar} mudarEst={mudarEst} mudarSlide={mudarSlide} apagarElemento={apagarElemento} medirBloco={medirBloco} tamanhoPadrao={tamanhoPadrao} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Modelo">{seletorModelo}</Campo>
                <Campo rotulo="Formato dos modelos base">
                  <select value={formato} onChange={(e) => mudarProjeto({ formato: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                    {Object.entries(FORMATOS).map(([k, f]) => <option key={k} value={k}>{f.nome}</option>)}
                  </select>
                </Campo>
              </div>
              {seletorVisual}
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={projeto.contador} onChange={(e) => mudarProjeto({ contador: e.target.checked })} />
                {slides.length > 1 ? `Numerar os cards (1/${slides.length}) em manuscrita` : 'Numerar os cards em manuscrita (aparece a partir de 2 cards)'}
              </label>

              <details><summary className="text-xs cursor-pointer py-2.5">Adicionar texto ou editar campos vazios</summary><div className="space-y-3 mt-3">
              <Campo rotulo="Título (*trecho* ganha a cor de destaque)">
                <textarea rows={2} value={arte.titulo} onChange={(e) => mudar({ titulo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>
              <Campo rotulo={arte.template === 'chat' ? 'Mensagens (uma por linha; ">" no começo = sua)' : arte.template === 'busca' ? 'Busca na 1ª linha, sugestões nas seguintes' : 'Texto'}>
                <textarea rows={3} value={arte.texto} onChange={(e) => mudar({ texto: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>
              <Campo rotulo="Detalhe manuscrito (opcional)">
                <textarea rows={2} value={arte.detalhe} onChange={(e) => mudar({ detalhe: e.target.value })} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </Campo>

              </div></details>
              <Campo rotulo="Fundo"><Cores valor={arte.fundo} onChange={(fundo) => mudar({ fundo })} /></Campo>
              <Campo rotulo="Cor de destaque"><Cores valor={arte.corDestaque} onChange={(corDestaque) => mudar({ corDestaque })} /></Campo>
              {arte.template === 'tarjas' && <Campo rotulo="Cor da tarja"><Cores valor={arte.corTarja} onChange={(corTarja) => mudar({ corTarja })} /></Campo>}

              {painelEmojis}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
