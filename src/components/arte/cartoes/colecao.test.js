import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARTOES, CATEGORIAS } from './colecao'
import { fontes, fotoPadrao, fotosDe, htmlCartao, novoCartao, normalizarCartao } from './render'

// A ordem e os nomes do grupo "Cards" do design system "Karen Santos · Instagram".
const ORIGINAIS = ['16-tarefas', '17a-serie-bootzy', '18-selecao', '19-agenda', '20-conversa', '22-discos', '23-roteiro', '24-bastidores', '25-janela', '26-cachorro', '38-guia', '39-leves', '41-quem-sou', '42-templates', '43-baloes', '44-album', '45-favoritos', '46-chique', '47-liberdade', '48-comentarios', '49-ideias', '50-chamada', '51-player', '52-play', '53-pastas', '54-eu-voce', '55-tendencias', '57-motivos', '58-um-dia', '59-livros', '60-processo', '61-gravar', '62-cartao', '63-busca', 'meses-01-janeiro', 'notas-01-capa', 'rotina-01-capa', '79-planilha', '80-aula', '81-rabisco', '82-quinta']

const publico = (url) => existsSync(new URL(`../../../../public${url}`, import.meta.url))

describe('coleção de cards', () => {
  it('mantém quebras e linhas vazias dentro de um único item nos balões flex', () => {
    const def = CARTOES.find((c) => c.id === '26-cachorro')
    const html = htmlCartao(def, novoCartao(def.id, { textos: { balao: 'Primeira\r\n\r\n<segunda>' } }))
    expect(html).toContain('<span>Primeira<br><br>&lt;segunda&gt;</span>')
  })

  it('tem os 41 cards do design system, sem repetir', () => {
    expect(CARTOES.map((c) => c.id).sort()).toEqual([...ORIGINAIS].sort())
    expect(new Set(CARTOES.map((c) => c.id)).size).toBe(41)
  })

  it('cada card tem nome, categoria conhecida e campos com texto padrão', () => {
    for (const c of CARTOES) {
      expect(c.nome, c.id).toBeTruthy()
      expect(CATEGORIAS, c.id).toHaveProperty(c.categoria)
      expect(c.campos.length, c.id).toBeGreaterThan(0)
      if (c.titulo) expect(c.campos.map((k) => k.id), c.id).toContain(c.titulo)
      if (c.texto) expect(c.campos.map((k) => k.id), c.id).toContain(c.texto)
    }
  })

  it('monta o HTML de todos, com fotos e emojis que existem em public/', () => {
    for (const c of CARTOES) {
      const html = htmlCartao(c, novoCartao(c.id))
      for (const [, url] of html.matchAll(/url\('([^']+)'\)/g)) expect(publico(url), `${c.id}: ${url}`).toBe(true)
      for (const [, src] of html.matchAll(/src="([^"]+)"/g)) expect(publico(src), `${c.id}: ${src}`).toBe(true)
      for (const slot of fotosDe(c)) expect(publico(fotoPadrao(c, slot)), `${c.id}: ${slot}`).toBe(true)
    }
  })

  it('usa só as fontes do site (KS ...), nunca o nome de família dos geradores', () => {
    for (const c of CARTOES) {
      const html = htmlCartao(c, novoCartao(c.id)).replace(/'KS [A-Za-z]+'/g, '')
      expect(html, c.id).not.toMatch(/font-family:(Inter|Bootzy|InstrSerif|Hand)\b/)
      expect(html, c.id).not.toMatch(/font:[^;"]*\b(Inter|Bootzy|InstrSerif|Hand)\b/)
    }
    expect(fontes('<div style="font:italic 52px InstrSerif;font-family:Bootzy">')).toBe(`<div style="font:italic 52px 'KS Instrument';font-family:'KS Bootzy'">`)
  })

  it('todo campo editável aparece na arte e o texto dela é escapado', () => {
    for (const c of CARTOES) {
      for (const k of c.campos) {
        const marca = `zz${k.id}zz`
        const html = htmlCartao(c, novoCartao(c.id, { textos: { [k.id]: marca } }))
        // A hora do card 25 vai uma letra por caixinha.
        if (`${c.id}.${k.id}` === '25-janela.hora') expect(html).toContain('>z</span>')
        else expect(html, `${c.id}.${k.id}`).toContain(marca)
      }
    }
    const html = htmlCartao(CARTOES[0], novoCartao(CARTOES[0].id, { textos: { p1: '<b onmouseover=x>' } }))
    expect(html).not.toContain('<b onmouseover')
    expect(html).toContain('&lt;b onmouseover=x&gt;')
  })

  it('troca a foto de um espaço e, no texto atrás da cabeça, usa o recorte novo', () => {
    const cabeca = CARTOES.find((c) => c.id === '79-planilha')
    const html = htmlCartao(cabeca, novoCartao(cabeca.id, { fotos: { pessoa: 'data:image/jpeg;base64,AAA', 'pessoa:recorte': 'data:image/png;base64,BBB' } }))
    expect(html).toContain("url('data:image/jpeg;base64,AAA')")
    expect(html).toContain("url('data:image/png;base64,BBB')")
    const semRecorte = htmlCartao(cabeca, novoCartao(cabeca.id, { fotos: { pessoa: 'data:image/jpeg;base64,AAA', 'pessoa:recorte': '' } }))
    expect(semRecorte).not.toContain('camiseta-recorte')
  })

  it('o mês recalcula o layout pelas sílabas', () => {
    const mes = CARTOES.find((c) => c.id === 'meses-01-janeiro')
    const contar = (s) => (htmlCartao(mes, novoCartao(mes.id, { textos: { silabas: s } })).match(/class="ab bz"/g) ?? []).length
    expect(contar('ja-nei-ro')).toBe(3)
    expect(contar('fe-ve-rei-ro')).toBe(4)
  })

  it('rascunho antigo de card volta normalizado', () => {
    const s = normalizarCartao({ template: 'cartao', cartao: '20-conversa', textos: { b1: 'oi' }, emojis: [{ cod: 'xx' }, { cod: '2728', x: 1, y: 1, tam: 90 }] })
    expect(s.textos.b1).toBe('oi')
    expect(s.camadas).toEqual({})
    expect(s.emojis.map((e) => e.cod)).toEqual(['2728'])
  })

  it('só o 60-processo é story; os outros são feed 1080x1350', () => {
    for (const c of CARTOES) expect([c.w, c.h], c.id).toEqual(c.id === '60-processo' ? [1080, 1920] : [1080, 1350])
  })
})
