import { ehCartao } from './cartoes/render'

export function reordenarProjeto(projeto, de, para) {
  if (de === para || de < 0 || para < 0 || de >= projeto.slides.length || para >= projeto.slides.length) return projeto
  const selecionado = projeto.slides[projeto.atual]
  const slides = [...projeto.slides]
  slides.splice(para, 0, slides.splice(de, 1)[0])
  return { ...projeto, slides, atual: slides.indexOf(selecionado) }
}

export function aplicarEmLote(projeto, indices, ajustes) {
  return { ...projeto, ...(ajustes.contador !== undefined ? { contador: ajustes.contador } : {}), slides: projeto.slides.map((s, i) => {
    if (!indices.includes(i)) return s
    const comum = { ...(ajustes.assinatura !== undefined ? { assinatura: ajustes.assinatura } : {}), ...(ajustes.fundo ? { fundo: ajustes.fundo } : {}) }
    if (ehCartao(s)) {
      const camadas = Object.fromEntries(Object.entries(s.camadas || {}).map(([id, c]) => {
        const novo = { ...c }
        if (ajustes.cor) delete novo.cor
        if (ajustes.fonte) delete novo.fonte
        return [id, novo]
      }))
      return { ...s, ...comum, camadas, estiloLote: { ...s.estiloLote, ...(ajustes.fundo ? { fundo: ajustes.fundo } : {}), ...(ajustes.cor ? { cor: ajustes.cor } : {}), ...(ajustes.fonte ? { fonte: ajustes.fonte } : {}) } }
    }
    const est = { ...s.est }
    for (const id of ['titulo', 'texto', 'detalhe']) est[id] = { ...est[id], ...(ajustes.fonte ? { fonte: ajustes.fonte } : {}), ...(ajustes.cor ? { cor: ajustes.cor } : {}) }
    if (ajustes.cor && s.template === 'tarjas') est.texto.fundo = s.est?.texto?.fundo ?? s.corDestaque
    return { ...s, ...comum, est, ...(ajustes.cor ? { corTitulo: ajustes.cor, corTexto: ajustes.cor, corDestaque: ajustes.cor } : {}) }
  }) }
}

// Coordenadas reais da arte (1080px). Encosta bordas/centros e equilibra o vão entre vizinhos.
export function encaixarBloco(rect, outros, w, h, tolerancia = 12) {
  const linhas = []
  const eixo = (inicio, tamanho, limite, pares, direcao) => {
    const alvos = [64, limite / 2, limite - 64, ...pares.flatMap(p => [p.inicio, p.inicio + p.tamanho / 2, p.inicio + p.tamanho])]
    let melhor = { delta: tolerancia + 1 }
    for (const alvo of alvos) for (const offset of [0, tamanho / 2, tamanho]) {
      const delta = alvo - inicio - offset
      if (Math.abs(delta) < Math.abs(melhor.delta)) melhor = { delta, alvo }
    }
    const ordenados = [...pares].sort((a, b) => a.inicio - b.inicio)
    for (let i = 0; i < ordenados.length - 1; i++) {
      const fim = ordenados[i].inicio + ordenados[i].tamanho
      const comeco = ordenados[i + 1].inicio
      if (comeco - fim < tamanho) continue
      const alvo = (fim + comeco - tamanho) / 2
      if (Math.abs(alvo - inicio) < Math.abs(melhor.delta)) melhor = { delta: alvo - inicio, alvo: alvo + tamanho / 2, iguais: true }
    }
    if (Math.abs(melhor.delta) <= tolerancia) {
      linhas.push({ eixo: direcao, valor: melhor.alvo, iguais: !!melhor.iguais })
      return inicio + melhor.delta
    }
    return inicio
  }
  return { x: eixo(rect.x, rect.w, w, outros.map(r => ({ inicio: r.x, tamanho: r.w })), 'x'), y: eixo(rect.y, rect.h, h, outros.map(r => ({ inicio: r.y, tamanho: r.h })), 'y'), linhas }
}
