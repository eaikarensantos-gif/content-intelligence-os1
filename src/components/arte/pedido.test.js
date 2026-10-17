import { describe, expect, it } from 'vitest'
import { CARTOES } from './cartoes/colecao'
import { fotosDe, htmlCartao } from './cartoes/render'
import { fixarTextos, guardarEntrada, instrucoes, montarProjeto, pedidoDeSlides, pegarEntrada } from './pedido'

describe('entrada vinda dos geradores', () => {
  const slides = [
    { titulo: 'organizar a semana', texto: 'três coisas e só três.', papel: 'capa', visual: 'fundo escuro com destaque' },
    { titulo: 'o resto vai para quarta', texto: 'sem culpa.', papel: 'cta' },
  ]

  it('mantém o texto do gerador e aceita só os asteriscos de destaque', () => {
    const r = fixarTextos({ slides: [
      { template: 'tarjas', titulo: 'organizar a *semana*', texto: 'três coisas e só três.' },
      { template: 'corCheia', titulo: 'o resto pode ir pra quarta', texto: 'sem culpa nenhuma.' },
    ] }, slides)
    expect(r.slides[0].titulo).toBe('organizar a *semana*')
    expect(r.slides[1].titulo).toBe('o resto vai para quarta')
    expect(r.slides[1].texto).toBe('sem culpa.')
  })

  it('completa slides que a IA deixou de fora, na mesma ordem', () => {
    const r = fixarTextos({ slides: [{ template: 'tarjas', titulo: 'organizar a semana', texto: 'três coisas e só três.' }] }, slides)
    expect(r.slides).toHaveLength(2)
    expect(r.slides[1]).toMatchObject({ template: 'corCheia', titulo: 'o resto vai para quarta' })
  })

  it('o pedido lista cada slide com papel e sugestão visual', () => {
    const p = pedidoDeSlides(slides)
    expect(p).toContain('exatamente 2 slides')
    expect(p).toContain('Slide 1 (capa)')
    expect(p).toContain('sugestão visual do gerador: fundo escuro com destaque')
  })

  it('a entrada é lida uma vez só', () => {
    const mem = {}
    globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v }, removeItem: (k) => { delete mem[k] } }
    guardarEntrada('Carrossel Studio', slides)
    expect(pegarEntrada()?.slides).toHaveLength(2)
    expect(pegarEntrada()).toBeNull()
  })
})

describe('pedido de arte', () => {
  it('monta os slides e descarta o que a identidade não aceita', () => {
    const p = montarProjeto({
      formato: 'quadrado',
      slides: [
        { template: 'corCheia', titulo: 'segunda organiza', texto: 'o resto espera', fundo: 'neon', corTitulo: 'mostarda', fonteTitulo: 'comic', emojis: ['2728', 'zz', '1f440', '1f525'] },
        { template: 'inventado', titulo: 'dois' },
      ],
    })
    expect(p.formato).toBe('feed')
    expect(p.contador).toBe(false)
    expect(p.slides).toHaveLength(2)
    const [a, b] = p.slides
    expect(a.titulo).toBe('segunda organiza')
    expect(a.fundo).toBe('cafe')
    expect(a.corTitulo).toBe('mostarda')
    expect(a.fonteTitulo).toBe('bootzy')
    expect(a.emojis.map((e) => e.cod)).toEqual(['2728', '1f440'])
    expect(b.template).toBe('corCheia')
  })

  it('sem foto, os modelos de cabeça viram modelos sem recorte', () => {
    const p = montarProjeto({ slides: [{ template: 'atrasCabeca', titulo: 'horas' }, { template: 'cabecaCaixa', titulo: 'x' }] })
    expect(p.slides.map((s) => s.template)).toEqual(['tarjas', 'corCheia'])
    expect(p.slides.every((s) => !s.foto)).toBe(true)
  })

  it('com foto, aplica só onde o modelo mostra a foto', () => {
    const p = montarProjeto({ slides: [{ template: 'atrasCabeca', titulo: 'horas' }, { template: 'corCheia', usarFoto: true }, { template: 'tarjas', usarFoto: true }] }, 'data:foto')
    expect(p.slides.map((s) => s.foto)).toEqual(['data:foto', '', 'data:foto'])
    expect(p.contador).toBe(true)
  })

  it('recusa resposta sem slides', () => {
    expect(() => montarProjeto({ slides: [] })).toThrow()
  })

  it('as instruções listam todos os templates', () => {
    for (const t of ['tarjas', 'atrasCabeca', 'cabecaCaixa', 'corCheia', 'caixa', 'selecao', 'chat', 'busca']) expect(instrucoes()).toContain(`- ${t}:`)
  })
})


describe('geração com o catálogo completo', () => {
  it('oferece os 49 modelos e os campos reais de cada card', () => {
    const prompt = instrucoes()
    expect(prompt).toContain('Catálogo completo: 49 modelos')
    for (const def of CARTOES) {
      expect(prompt).toContain(`- ${def.id}: ${def.nome}`)
      for (const campo of def.campos) expect(prompt).toContain(`"id":"${campo.id}"`)
    }
  })

  it('converte os 41 cards em slides editáveis, sem voltar a cor cheia', () => {
    for (const def of CARTOES) {
      const textos = Object.fromEntries(def.campos.map(c => [c.id, `novo ${c.id}`]))
      const { slides: [slide] } = montarProjeto({ slides: [{ template: 'cartao', cartao: def.id, textos }] })
      expect(slide.template).toBe('cartao')
      expect(slide.cartao).toBe(def.id)
      expect(slide.textos).toEqual(textos)
      expect(htmlCartao(def, slide)).toBeTruthy()
    }
  })

  it('não deixa textos de exemplo ou campos inventados na arte gerada', () => {
    const { slides: [slide] } = montarProjeto({ slides: [{ template: 'cartao', cartao: '62-cartao', textos: { l1: 'minha frase', l2: 23, inventado: 'não entra' } }] })
    expect(slide.textos).toEqual({ l1: 'minha frase', l2: '', l3: '', s1: '', s2: '', s3: '', s4: '' })
    expect(() => montarProjeto({ slides: [{ template: 'cartao', cartao: 'inventado' }] })).toThrow('não existe')
  })

  it('aplica a foto enviada nos espaços e limpa o recorte original', () => {
    for (const def of CARTOES.filter(c => fotosDe(c).length)) {
      const { slides: [slide] } = montarProjeto({ slides: [{ template: 'cartao', cartao: def.id, usarFoto: true }] }, 'data:minha-foto')
      for (const slot of fotosDe(def)) expect(slide.fotos[slot]).toBe('data:minha-foto')
      if (def.cabeca) expect(slide.fotos[`${def.cabeca.slot}:recorte`]).toBe('')
    }
    const { slides: [slide] } = montarProjeto({ slides: [{ template: 'cartao', cartao: '82-quinta' }] })
    expect(slide.fotos).toEqual({})
  })

  it('protege título e corpo vindos do gerador nos campos da coleção', () => {
    const orig = [{ titulo: 'Título original', texto: 'Parágrafo original.' }]
    const resposta = fixarTextos({ slides: [{ template: 'cartao', cartao: '79-planilha', textos: { l1: 'frase extra inventada', l2: 'Título *original*', l3: 'Parágrafo alterado', nota: 'outra frase' } }] }, orig)
    expect(resposta.slides[0].textos).toEqual({ l1: '', l2: 'Título *original*', l3: 'Parágrafo original.', nota: '' })
    expect(montarProjeto(resposta).slides[0].cartao).toBe('79-planilha')
  })

  it('preserva parágrafos mesmo quando a IA escolhe um card sem campo de corpo', () => {
    const orig = [{ titulo: 'Título', texto: 'Não pode sumir.' }]
    const resposta = fixarTextos({ slides: [{ template: 'cartao', cartao: '62-cartao', textos: { l1: 'Título' } }] }, orig)
    expect(resposta.slides[0]).toEqual({ template: 'corCheia', titulo: 'Título', texto: 'Não pode sumir.' })
    const titulo = fixarTextos({ slides: [{ template: 'cartao', cartao: '62-cartao', textos: { l1: 'Título' } }] }, [{ titulo: 'Título', texto: '' }])
    expect(titulo.slides[0].cartao).toBe('62-cartao')
  })
})
