import { describe, expect, it } from 'vitest'
import { legendaCurta, mapearPublicacoes, urlDeImagemInstagram } from './igMedia'

describe('mapearPublicacoes', () => {
  it('traduz tipo e escolhe a miniatura certa', () => {
    const lista = mapearPublicacoes([
      { id: '1', media_type: 'VIDEO', media_product_type: 'REELS', media_url: 'video.mp4', thumbnail_url: 'capa.jpg', caption: 'Reel' },
      { id: '2', media_type: 'CAROUSEL_ALBUM', media_url: 'primeira.jpg', permalink: 'https://www.instagram.com/p/x/' },
      { id: '3', media_type: 'IMAGE', media_url: 'foto.jpg' },
      { id: '4', media_type: 'VIDEO', media_url: 'video.mp4' },
    ])
    expect(lista.map((p) => p.tipo)).toEqual(['Reel', 'Carrossel', 'Imagem', 'Vídeo'])
    expect(lista.map((p) => p.miniatura)).toEqual(['capa.jpg', 'primeira.jpg', 'foto.jpg', null])
    expect(lista[1].link).toBe('https://www.instagram.com/p/x/')
  })

  it('mantém o ID como texto (a Meta envia string; número perderia precisão) e descarta itens sem ID', () => {
    const lista = mapearPublicacoes([{ id: '18146854624569957' }, { id: 123 }, { caption: 'sem id' }, null])
    expect(lista.map((p) => p.id)).toEqual(['18146854624569957', '123'])
  })

  it('aceita lista vazia ou ausente', () => {
    expect(mapearPublicacoes()).toEqual([])
    expect(mapearPublicacoes([])).toEqual([])
  })
})

describe('legendaCurta', () => {
  it('junta quebras de linha e corta com reticências', () => {
    expect(legendaCurta('linha 1\n\nlinha   2')).toBe('linha 1 linha 2')
    expect(legendaCurta('a'.repeat(100), 10)).toBe(`${'a'.repeat(9)}…`)
    expect(legendaCurta()).toBe('')
  })
})

describe('urlDeImagemInstagram', () => {
  it('aceita CDN do Instagram e do Facebook em https', () => {
    expect(urlDeImagemInstagram('https://scontent-gru2-1.cdninstagram.com/v/t51/abc.jpg?x=1')).toBe(true)
    expect(urlDeImagemInstagram('https://scontent.xx.fbcdn.net/v/abc.jpg')).toBe(true)
  })

  it('recusa outros hosts, http, usuário na URL e lixo', () => {
    for (const url of [
      'http://scontent.cdninstagram.com/a.jpg',
      'https://example.com/a.jpg',
      'https://cdninstagram.com.evil.test/a.jpg',
      'https://evilcdninstagram.com/a.jpg',
      'https://user:pass@scontent.cdninstagram.com/a.jpg',
      'https://127.0.0.1/a.jpg',
      'file:///etc/passwd',
      'não é url',
      '',
      undefined,
    ]) expect(urlDeImagemInstagram(url), String(url)).toBe(false)
  })
})
