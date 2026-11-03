import { describe, expect, it } from 'vitest'
import { CARTOES } from './cartoes/colecao'
import { novoCartao } from './cartoes/render'
import { novoSlide } from './conteudoSlide'
import { MIN_AMOSTRAS, acharPost, agruparPorModelo, formatarRazao, nomeDoModelo, razaoSalvamento } from './resultadoPost'

const post = (id, likes, saves) => ({ id, likes, saves })
const arte = (mediaId, slide = novoSlide('tarjas')) => ({ projeto: { slides: [slide], publicacao: mediaId ? { mediaId } : undefined } })

describe('razaoSalvamento', () => {
  it('divide salvamentos por curtidas', () => expect(razaoSalvamento(post('1', 100, 21))).toBeCloseTo(0.21))
  it('sem curtida, sem salvamento medido ou sem post, não há razão', () => {
    expect(razaoSalvamento(post('1', 0, 5))).toBeNull()
    expect(razaoSalvamento({ id: '1', likes: 10, saves: null })).toBeNull()
    expect(razaoSalvamento(null)).toBeNull()
    expect(razaoSalvamento(post('1', 10, 0))).toBe(0)
  })
  it('mostra com vírgula e traço quando falta', () => {
    expect(formatarRazao(0.2134)).toBe('0,21')
    expect(formatarRazao(null)).toBe('–')
  })
})

describe('acharPost e nomeDoModelo', () => {
  it('compara o ID como texto', () => expect(acharPost([post(123, 1, 1)], '123')?.id).toBe(123))
  it('usa o nome do modelo base ou do card da coleção', () => {
    expect(nomeDoModelo(novoSlide('tarjas'))).toBe('Tarjas sobre foto')
    expect(nomeDoModelo(novoCartao(CARTOES[0].id))).toBe(CARTOES[0].nome)
    expect(nomeDoModelo(undefined)).toBe('Sem modelo')
  })
})

describe('agruparPorModelo', () => {
  it('tira a média por modelo e marca como insuficiente abaixo de 4 posts', () => {
    const posts = [post('a', 100, 20), post('b', 100, 40)]
    const { linhas } = agruparPorModelo([arte('a'), arte('b')], posts)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toMatchObject({ modelo: 'Tarjas sobre foto', amostras: 2, suficiente: false })
    expect(linhas[0].media).toBeCloseTo(0.3)
  })
  it('chega a suficiente com o mínimo de posts medidos', () => {
    const ids = ['1', '2', '3', '4']
    const { linhas } = agruparPorModelo(ids.map((i) => arte(i)), ids.map((i) => post(i, 100, 10)))
    expect(MIN_AMOSTRAS).toBe(4)
    expect(linhas[0]).toMatchObject({ amostras: 4, suficiente: true })
  })
  it('um post só conta uma vez, mesmo com várias artes apontando para ele', () => {
    const { linhas } = agruparPorModelo([arte('a'), arte('a')], [post('a', 100, 20)])
    expect(linhas[0].amostras).toBe(1)
  })
  it('separa o que não tem dado e o que não está entre os posts buscados', () => {
    const posts = [{ id: 'a', likes: 50, saves: null }]
    const r = agruparPorModelo([arte('a'), arte('fora'), arte(undefined)], posts)
    expect(r.semPost).toBe(1)
    expect(r.linhas[0]).toMatchObject({ amostras: 0, semDado: 1, media: null })
  })
  it('põe primeiro os modelos com amostra suficiente e, dentro deles, a maior média', () => {
    const outro = novoSlide('chat')
    const quatro = ['1', '2', '3', '4']
    const artes = [...quatro.map((i) => arte(i, outro)), arte('x')]
    const posts = [...quatro.map((i) => post(i, 100, 10)), post('x', 100, 90)]
    const { linhas } = agruparPorModelo(artes, posts)
    expect(linhas.map((l) => l.modelo)).toEqual(['Conversa', 'Tarjas sobre foto'])
  })
})
