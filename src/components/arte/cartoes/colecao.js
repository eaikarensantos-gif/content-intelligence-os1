// Os 41 cards do grupo "Cards" do design system "Karen Santos · Instagram".
// Cada um é a transcrição do gerador original (repositório arte-ig, identidade/cards/gera4 a gera17):
// mesmo HTML, mesmas medidas, mesmas cores. O que muda é que os textos viram campos e as fotos
// viram espaços que ela pode trocar. Os emojis são os PNG da Apple em /marca/emoji.

const cr = '#F4EFE7', pe = '#F4C3A1', mo = '#E9C46A', te = '#A64B2A', ca = '#5C3B2B', ar = '#F1DFC4', ti = '#2B211B'

const emo = (c) => `/marca/emoji/${c}.png`

// ---------- texto ----------
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
/** Texto simples: quebra de linha vira <br>. */
const T = (s) => {
  const texto = esc(s).replace(/\r\n?/g, '\n')
  // Um único item de flex: balões e etiquetas também respeitam as quebras.
  return texto.includes('\n') ? `<span>${texto.replace(/\n/g, '<br>')}</span>` : texto
}
/** Texto com *trecho* marcado: o trecho ganha o invólucro do card original. */
const rico = (s, abre, fecha) => T(s).replace(/\*(.+?)\*/g, `${abre}$1${fecha}`)
const linhas = (s = '') => String(s).split('\n')

// ---------- emoji.py ----------
const _img = (cod, x, y, s, r = 0) => `<img class=ab style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:rotate(${r}deg);filter:drop-shadow(0 3px 6px rgba(30,20,14,.25))" src="${emo(cod)}">`
const estrela_ouro = (x, y, s, r = 0) => _img('2b50', x, y, s, r)
const brilho = (x, y, s) => _img('2728', x, y, s)
const coracao_joia = (x, y, s, tom = 'pessego', r = 0) => _img({ pessego: '1f497', mostarda: '1f9e1', terracota: '1f60d' }[tom], x, y, s, r)
const flor_esmalte = (x, y, s, _tom = 'mostarda', r = 0) => _img('1f338', x, y, s, r)
const gema = (x, y, s) => _img('1f48e', x, y, s * 1.4)
const ic = (f) => f.replace('class=ab style="left:0px;top:0px;', 'style="position:absolute;left:0;top:0;')

// Variações de emoji usadas por cada rodada de geradores.
const E = (c, x, y, s, r = 0) => `<img class=ab style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:rotate(${r}deg);filter:drop-shadow(0 3px 6px rgba(30,20,14,.3))" src="${emo(c)}">`
const Eseco = (c, x, y, s, r = 0) => `<img class=ab style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:rotate(${r}deg)" src="${emo(c)}">`
const Ei = (c, s) => `<img style="width:${s}px;height:${s}px;vertical-align:-6px" src="${emo(c)}">`

// ---------- blocos comuns ----------
const fundo = (F, f, pos, extra = '') => `<div class=ft style="background-image:${F(f)};background-position:${pos};${extra}"></div>`
const B = (x, y, t, s, c, ex = '') => `<div class="ab bz" style="left:${x}px;top:${y}px;font-size:${s}px;color:${c};${ex}">${t}</div>`

// ---------- rodada 3 (gera4) ----------
const pilula = (x, y, txt, icone = '') => `<div class=ab style="left:${x}px;top:${y}px;background:${ar};border-radius:30px;padding:10px 24px 10px 16px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 12px rgba(30,20,14,.25);font:500 30px Inter;color:${ti}"><span style="position:relative;width:30px;height:30px">${icone}</span>${txt}</div>`

// ---------- rodada 4 (gera5) ----------
const balao5 = (x, y, txt, icone = '') => `<div class=ab style="left:${x}px;top:${y}px;background:${cr};border-radius:40px 40px 40px 10px;padding:20px 30px;display:flex;align-items:center;gap:14px;box-shadow:0 6px 16px rgba(30,20,14,.25);font:500 34px Inter;color:${ti}">${txt}<span style="position:relative;width:38px;height:38px">${icone}</span></div>`
const pol = (F, x, y, w, h, fo, pos, leg, r = 0) => `<div class=ab style="left:${x}px;top:${y}px;transform:rotate(${r}deg);text-align:center"><div style="background:${cr};padding:10px;box-shadow:0 8px 20px rgba(30,20,14,.35)"><div style="width:${w}px;height:${h}px;background:${F(fo)} ${pos}/cover"></div></div><div style="margin-top:12px;font:700 28px Inter;color:${cr};text-shadow:0 2px 8px rgba(0,0,0,.45)">${leg}</div></div>`
const anel = (x, y) => `<div class=ab style="left:${x}px;top:${y}px;width:80px;height:46px;border:7px solid #CFC6B8;border-radius:24px;box-shadow:0 3px 6px rgba(0,0,0,.25)"></div>`

// ---------- rodada 6 (gera10) ----------
const balao10 = (x, y, t, bg, cauda = 'left', pequeno = false) => {
  const rad = cauda === 'left' ? '44px 44px 44px 10px' : '44px 44px 10px 44px'
  const tam = pequeno ? 'padding:14px 28px;font:500 30px' : 'padding:22px 40px;font:500 38px'
  return `<div class=ab style="left:${x}px;top:${y}px;background:${bg};border-radius:${rad};${tam} Inter;color:${ti};box-shadow:0 6px 16px rgba(30,20,14,.25)">${t}</div>`
}
const janelaCamera = (F, { x, y, w, h, barra, foto, altFoto, rodape }) =>
  `<div class=ab style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${barra};border-radius:8px;box-shadow:0 14px 40px rgba(0,0,0,.${rodape.sombra});overflow:hidden">` +
  `<div style="height:${rodape.topo}px;display:flex;align-items:center;justify-content:space-between;padding:0 6px 0 16px;font:500 18px Inter;color:#3B3B3B"><span>Câmera</span><span style="display:flex"><b style="font-weight:400;padding:0 18px">—</b><b style="font-weight:400;padding:0 18px">▢</b><b style="font-weight:400;padding:0 18px">✕</b></span></div>` +
  `<div style="height:${altFoto}px;background:${F(foto[0])} ${foto[1]}/cover"></div>` +
  rodape.html +
  '</div>'

// ---------- rodada 7 (gera11) ----------
const com = (x, y, t, r, av, lado = 'right', w = null) => {
  const avx = lado === 'left' ? '-34px' : 'auto'
  const avr = lado === 'left' ? 'auto' : '-34px'
  const ww = w ? `max-width:${w}px;` : ''
  return `<div class=ab style="left:${x}px;top:${y}px;${ww}transform:rotate(${r}deg);background:${cr};border-radius:34px;padding:20px 32px;font:500 30px/1.3 Inter;color:${ti};box-shadow:0 6px 16px rgba(30,20,14,.25)">${t}` +
    `<span style="position:absolute;left:${avx};right:${avr};top:-30px;width:68px;height:68px;border-radius:50%;background:${av};border:4px solid ${cr};font:700 26px/60px Inter;color:${cr};text-align:center"></span></div>`
}
const ONDA = '<svg viewBox="0 0 600 24" preserveAspectRatio="none" style="flex:1;height:24px"><path d="M0 12 Q15 2 30 12 Q45 22 60 12 Q75 2 90 12 Q105 22 120 12 Q135 2 150 12 Q165 22 180 12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M180 12 H600" stroke="currentColor" stroke-opacity=".35" stroke-width="5" stroke-linecap="round"/></svg>'
const player = (x, y, w, capa, tit, art, t1, t2) =>
  `<div class=ab style="left:${x}px;top:${y}px;width:${w}px;border-radius:40px;overflow:hidden;background:linear-gradient(90deg,rgba(43,33,27,.85),rgba(43,33,27,.35)),${capa};padding:40px 44px;color:${cr};box-shadow:0 10px 30px rgba(30,20,14,.3)">` +
  `<div style="display:flex;justify-content:space-between;align-items:flex-start"><div><div style="font:700 44px Inter">${tit}</div><div style="font:500 30px Inter;opacity:.85;margin-top:6px">${art}</div></div><span style="width:120px;height:96px;border-radius:30px;background:${pe};color:${ti};display:flex;align-items:center;justify-content:center;font:700 40px Inter">❚❚</span></div>` +
  `<div style="display:flex;align-items:center;gap:26px;margin-top:40px;font:700 36px Inter"><span>⏮</span>${ONDA}<span>⏭</span></div>` +
  `<div style="display:flex;justify-content:space-between;margin-top:10px;font:500 24px Inter;opacity:.85"><span>${t1}</span><span>${t2}</span></div></div>`

// ---------- notas (gera7) ----------
const fundoNotas = (F, f, pos, blur = 6) =>
  `<div class=ft style="inset:-40px;background-image:${F(f)};background-position:${pos};filter:blur(${blur}px) saturate(.75) sepia(.35) brightness(.85)"></div>` +
  '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(92,59,43,.35),rgba(92,59,43,.15) 40%,rgba(43,33,27,.55))"></div>'
const labN = (x, y, t, a = 'left') => `<div class=ab style="${a}:${x}px;top:${y}px;font:500 20px Inter;letter-spacing:4px;color:${cr};opacity:.85">${t}</div>`
const topoN = (e, d) => labN(80, 70, e) + `<div class=ab style="left:330px;right:330px;top:82px;height:1px;background:${cr};opacity:.5"></div>` + labN(80, 70, d, 'right')
const rodapeN = (e, d) => `<div class=ab style="left:80px;bottom:60px;font:500 20px Inter;letter-spacing:4px;color:${cr};opacity:.8;text-decoration:underline;text-underline-offset:6px">${e}</div><div class=ab style="right:80px;bottom:60px;font:500 20px Inter;letter-spacing:4px;color:${cr};opacity:.8;text-decoration:underline;text-underline-offset:6px">${d}</div>`
const menuN = (y) => `<div class=ab style="left:0;right:0;top:${y}px;display:flex;justify-content:center"><div style="display:flex;align-items:center;background:#FBF6EC;border-radius:10px;padding:4px 8px;font:500 26px Inter;color:${ti};box-shadow:0 8px 20px rgba(0,0,0,.3)">` + ['Recortar', 'Copiar', 'Colar', 'Compartilhar'].map((t) => `<span style="padding:12px 22px">${t}</span>`).join('') + '<span style="padding:12px 18px;font-weight:700">⋮</span></div></div>'
const tituloN = (y, texto, size = 96) => {
  const out = linhas(texto).map((l) => `<div style="display:inline-block;background:rgba(241,223,196,.28);padding:2px 14px 8px;font-family:Bootzy;font-size:${size}px;line-height:1;letter-spacing:.03em;color:${cr};white-space:nowrap">${rico(l, `<span style="color:${mo}">`, '</span>')}</div><br>`).join('')
  const cur = `<i style="position:absolute;left:-32px;top:${size + 8}px;width:30px;height:30px;border-radius:50% 0 50% 50%;background:${mo}"></i>` +
    `<i style="position:absolute;right:-32px;bottom:-30px;width:30px;height:30px;border-radius:0 50% 50% 50%;background:${mo}"></i>`
  return `<div class=ab style="left:0;right:0;top:${y}px;text-align:center"><div style="position:relative;display:inline-block;text-align:center">${out}${cur}</div></div>`
}
const corpoN = (y, t, w = 860, size = 36) => `<div class=ab style="left:${(1080 - w) / 2}px;width:${w}px;top:${y}px;text-align:center;font:500 ${size}px/1.4 Inter;color:${cr}">${rico(t, '<b style="font-weight:700">', '</b>')}</div>`

// ---------- texto atrás da cabeça (gera17) ----------
// A altura da cabeça (arquivo .y do recorte original) posiciona a palavra gigante.
const sobrepoe = ({ cabeca, big = 300, cor = cr, dest = cr }) => ({ t, F, R }) => {
  const tb = cabeca - Math.trunc(big * 0.47)
  return `<div class=ft style="background:${F('pessoa')} center/cover"></div><div class=ab style="inset:0;background:rgba(43,33,27,.3)"></div>` +
    `<div class=ab style="left:0;right:0;top:${tb - 80}px;text-align:center;font-family:Bootzy;font-size:68px;letter-spacing:.03em;color:${cor}">${T(t.l1)}</div>` +
    `<div class=ab style="left:0;right:0;top:${tb}px;text-align:center;font-family:Bootzy;font-size:${big}px;line-height:1;letter-spacing:.02em;color:${dest}">${T(t.l2)}</div>` +
    `<div class=ab data-recorte-pessoa style="left:0;top:0;width:1080px;height:1350px;background:${R('pessoa')} center/cover no-repeat"></div>` +
    `<div class=ab style="left:80px;top:1070px;font-family:Bootzy;font-size:64px;line-height:1.25;letter-spacing:.03em;color:${ca}">` + linhas(t.l3).map((x) => `<span style="background:${cr};padding:2px 16px">${T(x)}</span><br>`).join('') + '</div>' +
    `<div class=ab style="right:80px;top:1250px;text-align:right;font:44px/1.1 Hand;color:${cor}">${T(t.nota)}</div>`
}

// ---------- meses (gera6) ----------
const MESES_FOTOS = [['n4.jpg', '50% 25%'], ['n2.jpg', '50% 28%'], ['n1.jpg', '62% 45%'], ['g-sofa.jpg', '50% 40%']]
const mes = ({ t, F }) => {
  const sil = String(t.silabas || '').split('-').map((s) => s.trim()).filter(Boolean)
  const n = Math.max(1, sil.length)
  const q = ['right:540px;bottom:675px', 'left:540px;bottom:675px', 'right:540px;top:675px', 'left:540px;top:675px']
    .map((p, j) => `<div class=ft style="${p};background-image:${F(MESES_FOTOS[j][0])};background-position:${MESES_FOTOS[j][1]}"></div>`).join('')
  const size = n < 4 ? 250 : 205
  const lh = size * 0.86
  const y0 = 675 - (n * lh) / 2 - 20
  const x0 = 540 - (n - 1) * 70
  const txt = sil.map((s, i) => `<div class="ab bz" style="left:${x0 + i * 140}px;top:${y0 + i * lh}px;transform:translateX(-50%) rotate(${[-4, 3, -2, 4][i % 4]}deg);font-size:${size}px;color:#F4EFE7;text-shadow:0 6px 18px rgba(30,20,14,.35)">${T(s)}</div>`).join('')
  const est = estrela_ouro(x0 + 60, y0 - 40, 230, 12) + estrela_ouro(x0 - 260 + n * 20, y0 + lh * (n - 1) - 10, 260, -10) + estrela_ouro(x0 + (n - 1) * 140 + 120, y0 + lh * (n - 1) + 40, 140, 8)
  const rabisco = `<svg class=ab style="left:0;top:0" width="1080" height="1350"><path d="M120 ${y0 + 30} C200 ${y0 - 60} 280 ${y0 + 90} 220 ${y0 + 150} C160 ${y0 + 210} 330 ${y0 + 260} 300 ${y0 + 340} M820 ${y0 + n * lh} C900 ${y0 + n * lh + 60} 860 ${y0 + n * lh + 140} 960 ${y0 + n * lh + 170}" fill="none" stroke="#F4EFE7" stroke-width="7" stroke-linecap="round" opacity=".9"/></svg>`
  return q + '<div class=ab style="inset:0;background:rgba(43,33,27,.12)"></div>' + rabisco + est + txt
}

// ---------- categorias (famílias de componente do design system) ----------
export const CATEGORIAS = {
  interface: 'Interface de celular e computador',
  baloes: 'Balões e mensagens',
  pilulas: 'Pílulas e etiquetas',
  titulo: 'Título grande',
  cabeca: 'Texto atrás da cabeça',
  series: 'Capas de série',
}

const c = (id, nome, categoria, campos, html, extra = {}) => ({ id, nome, categoria, campos, html, w: 1080, h: 1350, ...extra })
const campo = (id, rotulo, padrao, ajuda) => ({ id, rotulo, padrao, ajuda })

export const CARTOES = [
  // ===== rodada 3 =====
  c('16-tarefas', 'Tarefas em pílulas', 'pilulas', [
    campo('p1', 'Pílula 1', 'responder e-mails'), campo('p2', 'Pílula 2', 'criar conteúdo'), campo('p3', 'Pílula 3', 'roteiro da palestra'),
    campo('p4', 'Pílula 4', 'achar referências'), campo('p5', 'Pílula 5', 'revisar a semana'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n2.jpg')};background-position:50% 32%"></div>
${gema(495, 20, 90)}
${pilula(600, 330, T(t.p1), ic(brilho(0, 0, 30)))}${pilula(90, 470, T(t.p2), ic(estrela_ouro(0, 0, 30)))}${pilula(650, 660, T(t.p3), ic(coracao_joia(0, 0, 30, 'pessego')))}${pilula(70, 800, T(t.p4), ic(brilho(0, 0, 30)))}${pilula(340, 980, T(t.p5), ic(flor_esmalte(0, 0, 30, 'mostarda')))}`),

  c('17a-serie-bootzy', 'Série em três faixas', 'pilulas', [
    campo('serie', 'Etiqueta da esquerda', 'série autonomia'), campo('parte', 'Etiqueta da direita', 'parte 5'),
    campo('t1', 'Título pequeno', 'como eu parei de reconstruir'), campo('t2', 'Título grande', 'contexto'),
  ], ({ t, F }) => `<div class=ft style="bottom:900px;background-image:${F('g-elevador.jpg')};background-position:50% 20%"></div>
<div class=ft style="top:450px;bottom:450px;background-image:${F('n0.jpg')};background-position:50% 45%"></div><div class=ab style="left:0;right:0;top:450px;height:450px;background:rgba(43,33,27,.45)"></div>
<div class=ft style="top:900px;background-image:${F('g-sofa.jpg')};background-position:50% 45%"></div>
<div class=ab style="left:130px;top:540px;background:${cr};border-radius:30px;padding:10px 28px;font:500 32px Inter;color:${ca}">${T(t.serie)}</div>
<div class=ab style="right:130px;top:540px;background:${cr};border-radius:30px;padding:10px 28px;font:500 32px Inter;color:${ca}">${T(t.parte)}</div>
<div class="ab bz" style="left:120px;top:625px;font-size:78px;color:#F1DFC4">${T(t.t1)}</div>
<div class="ab bz" style="left:112px;top:700px;font-size:176px;color:#F1DFC4">${T(t.t2)}</div>`, { titulo: 't2' }),

  c('18-selecao', 'Seleção de texto', 'interface', [
    campo('sel', 'Trecho selecionado', 'Se você está tentando organizar o seu negócio'), campo('resto', 'Continuação', 'sozinha, entre uma palestra e outra'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n0.jpg')};background-position:40% 50%"></div><div class=ab style="inset:0;background:rgba(43,33,27,.25)"></div>
<div class=ab style="left:150px;top:250px;display:flex;align-items:center;background:#FBF6EC;border-radius:10px;padding:6px 8px;font:500 26px Inter;color:${ti};box-shadow:0 8px 20px rgba(0,0,0,.3)"><span style="padding:12px 22px">Recortar</span><span style="padding:12px 22px">Copiar</span><span style="padding:12px 22px">Colar</span><span style="padding:12px 22px">Compartilhar</span><span style="padding:12px 18px;font-weight:700">⋮</span></div>
<div class=ab style="left:150px;top:360px;width:800px;font:500 66px/1.18 Inter;color:${cr};letter-spacing:-1.5px"><span style="background:rgba(233,196,106,.6);color:${ti};box-decoration-break:clone;-webkit-box-decoration-break:clone;padding:0 4px"><i style="display:inline-block;width:0;position:relative"><b style="position:absolute;left:-30px;top:60px;width:30px;height:30px;border-radius:50% 0 50% 50%;background:${mo}"></b></i>${T(t.sel)}<i style="display:inline-block;width:0;position:relative"><b style="position:absolute;left:0;top:60px;width:30px;height:30px;border-radius:0 50% 50% 50%;background:${mo}"></b></i></span> ${T(t.resto)}</div>
`, { titulo: 'sel', texto: 'resto' }),

  c('19-agenda', 'Evento de agenda', 'interface', [
    campo('hora', 'Hora', '09:00'), campo('evento', 'Evento', 'Mentoria · autonomia na prática'), campo('duracao', 'Horário', '9:00 – 10:30'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n4.jpg')};background-position:50% 50%"></div>
<div class=ab style="left:150px;right:150px;top:600px;background:#FBF6EC;border-radius:16px;padding:20px 26px;box-shadow:0 10px 30px rgba(30,20,14,.3);display:flex;gap:20px">
 <div style="font:500 24px Inter;color:#7A6E64;padding-top:6px">${T(t.hora)}</div>
 <div style="flex:1;background:${pe};border-left:8px solid ${te};border-radius:6px;padding:16px 20px"><div style="font:700 32px Inter;color:${ti}">${T(t.evento)}</div><div style="font:500 22px Inter;color:${te};margin-top:6px">${T(t.duracao)}</div></div></div>`, { titulo: 'evento' }),

  c('20-conversa', 'Conversa em dois balões', 'baloes', [
    campo('b1', 'Pergunta (balão rosado)', 'Você viu o que mudou no Instagram essa semana?'), campo('b2', 'Resposta (balão claro)', 'Vi! Agora dá pra postar no formato mais alto, 3:4.'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('g-elevador.jpg')};background-position:50% 30%"></div>
<div class=ab style="left:160px;top:330px;max-width:520px;background:${pe};border-radius:30px 30px 30px 6px;padding:28px 36px;font:500 38px/1.25 Inter;color:${ti};box-shadow:0 6px 18px rgba(30,20,14,.25)">${T(t.b1)}</div>
<div class=ab style="right:110px;top:560px;max-width:680px;background:${cr};border-radius:30px 30px 6px 30px;padding:28px 90px 28px 36px;font:500 38px/1.25 Inter;color:${ti};text-align:right;box-shadow:0 6px 18px rgba(30,20,14,.25)">${T(t.b2)}<span style="position:absolute;right:26px;bottom:26px;width:46px;height:46px;border-radius:16px;background:${te};color:${cr};font:700 28px/46px Inter;text-align:center">➤</span></div>`, { titulo: 'b1', texto: 'b2' }),

  // ===== rodada 4 =====
  c('22-discos', 'Polaroid e balão', 'baloes', [
    campo('legenda', 'Legenda da polaroid', 'a palestra de ontem'), campo('balao', 'Balão', 'garimpando referências'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n4.jpg')};background-position:50% 40%"></div>
${pol(F, 170, 370, 230, 260, 'n1.jpg', '62% 40%', T(t.legenda))}
${balao5(470, 920, T(t.balao), ic(brilho(0, 0, 38)))}`, { titulo: 'balao' }),

  c('23-roteiro', 'Balão no topo e polaroid', 'baloes', [
    campo('balao', 'Balão', 'escrevendo o roteiro da semana'), campo('legenda', 'Legenda da polaroid', 'versão sofá'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n2.jpg')};background-position:50% 30%"></div>
${balao5(90, 200, T(t.balao), ic(estrela_ouro(0, 0, 38)))}
${pol(F, 760, 880, 230, 260, 'g-sofa.jpg', '50% 40%', T(t.legenda), -2)}`, { titulo: 'balao' }),

  c('24-bastidores', 'Bastidores com campo de mensagem', 'baloes', [
    campo('titulo', 'Título', 'minha vida como\ncliente do meu\npróprio processo'), campo('parte', 'Etiqueta', 'parte um'),
    campo('mensagem', 'Campo de mensagem', 'bastidores de quem é consultora e criadora de conteúdo'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n4.jpg')};background-position:50% 45%"></div><div class=ab style="inset:0;background:rgba(43,33,27,.28)"></div>${flor_esmalte(140, 640, 70, 'pessego', 10)}${estrela_ouro(120, 860, 64, -8)}${flor_esmalte(910, 640, 64, 'mostarda', -6)}${estrela_ouro(860, 960, 70, 6)}${brilho(690, 560, 50)}${flor_esmalte(150, 1010, 62, 'areia', 4)}${brilho(330, 1060, 44)}
<div class="ab bz" style="left:0;right:0;top:640px;text-align:center;font-size:92px;line-height:1.02;color:${cr};text-shadow:0 4px 16px rgba(0,0,0,.3)">${T(t.titulo)}</div>
<div class=ab style="left:510px;top:960px;background:${ar};border-radius:30px;padding:8px 26px;font:500 30px Inter;color:${ti}">${T(t.parte)}</div>
<div class=ab style="left:150px;right:150px;top:1120px;background:${cr};border-radius:60px;padding:20px 24px;display:flex;align-items:center;gap:22px;box-shadow:0 6px 18px rgba(30,20,14,.3)"><span style="width:56px;height:56px;border-radius:50%;background:${mo};font:500 40px/56px Inter;text-align:center;color:${ti}">+</span><span style="flex:1;font:500 28px/1.25 Inter;color:${ti}">${T(t.mensagem)}</span><span style="font:500 34px Inter;color:#7A6E64">☺</span><span style="width:56px;height:56px;border-radius:18px;background:${te};color:${cr};font:700 26px/56px Inter;text-align:center">➤</span></div>`, { titulo: 'titulo', texto: 'mensagem' }),

  c('25-janela', 'Janela de notas em quatro fotos', 'interface', [
    campo('nota', 'Texto da janela', 'pequenas coisas que deixaram a minha semana mais leve'), campo('temp', 'Temperatura', '22°C'),
    campo('local', 'Local', 'home office'), campo('hora', 'Hora (uma letra por caixinha)', '19h'),
  ], ({ t, F }) => `<div class=ft style="right:545px;bottom:680px;background-image:${F('n2.jpg')};background-position:50% 25%"></div>
<div class=ft style="left:545px;bottom:680px;background-image:${F('n4.jpg')};background-position:50% 30%"></div>
<div class=ft style="right:545px;top:680px;background-image:${F('n1.jpg')};background-position:62% 45%"></div>
<div class=ft style="left:545px;top:680px;background-image:${F('n3.jpg')};background-position:50% 30%"></div>
<div class=ab style="left:0;right:0;top:665px;height:15px;background:${cr}"></div><div class=ab style="top:0;bottom:0;left:530px;width:15px;background:${cr}"></div>
${anel(500, 250)}${anel(500, 440)}${anel(500, 860)}${anel(500, 1080)}
<div class=ab style="left:370px;top:430px;font:500 46px Inter;color:${cr};text-shadow:0 2px 8px rgba(0,0,0,.4)">${T(t.temp)}</div>
<div class=ab style="left:760px;top:80px;background:${cr};border-radius:30px;padding:8px 18px;display:flex;gap:8px"><span style="position:relative;width:36px;height:36px">${ic(coracao_joia(0, 0, 36, 'pessego'))}</span><span style="position:relative;width:36px;height:36px">${ic(estrela_ouro(0, 0, 36))}</span><span style="position:relative;width:36px;height:36px">${ic(flor_esmalte(0, 0, 36, 'mostarda'))}</span></div>
<div class=ab style="left:250px;right:250px;top:520px;background:${cr};border-radius:14px;padding:22px 30px 30px;box-shadow:0 10px 28px rgba(30,20,14,.35);text-align:center">
 <div style="display:flex;justify-content:space-between;align-items:center;margin:-10px -14px 14px;font:500 22px Inter;color:#5C5048"><span>Notas</span><span style="letter-spacing:26px">—▢✕</span></div>
 <div style="font:500 44px/1.2 Inter;color:${ti}">${T(t.nota)}</div>
 <div style="margin-top:22px;height:44px;border-radius:8px;background:#E7DFD3"></div></div>
<div class=ab style="left:70px;top:1220px;background:rgba(43,33,27,.55);border-radius:24px;padding:8px 20px;font:500 26px Inter;color:${cr}">⌖ ${T(t.local)}</div>
<div class=ab style="left:880px;top:720px;display:flex;gap:4px">${[...String(t.hora || '')].map((d) => `<span style="background:rgba(244,239,231,.85);border-radius:6px;padding:4px 10px;font:700 30px Inter;color:${ti}">${T(d)}</span>`).join('')}</div>`, { titulo: 'nota' }),

  c('26-cachorro', 'Balão e polaroid com pet', 'baloes', [
    campo('balao', 'Balão', 'pausa obrigatória do dia'), campo('legenda', 'Legenda da polaroid', 'saindo pra palestra'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n3.jpg')};background-position:50% 40%"></div>
${balao5(80, 130, T(t.balao), ic(coracao_joia(0, 0, 38, 'terracota')))}
${pol(F, 760, 880, 230, 260, 'g-elevador-zoom.jpg', '50% 30%', T(t.legenda), 2)}`, { titulo: 'balao' }),

  // ===== rodada 5 =====
  c('38-guia', 'Guia com palavras soltas', 'titulo', [
    campo('g1', 'Palavra 1 (mostarda)', 'guia'), campo('g2', 'Palavra 2', 'pra'), campo('g3', 'Palavra 3 (mostarda)', 'pj'), campo('g4', 'Palavra 4', 'sem caos:'),
    campo('l1', 'Lateral, linha 1', 'coisas que eu'), campo('dest', 'Lateral, destaque', 'FARIA'), campo('l2', 'Lateral, linha 3', 'se estivesse'),
    campo('it', 'Lateral, final em itálico', 'começando\nhoje.'), campo('mini', 'Texto miúdo', 'coisas que eu faria se estivesse começando hoje.'), campo('handle', 'Assinatura', '@karensantosperfil'),
  ], ({ t, F }) => {
    const mini = (x, y, txt, a = 'left') => `<div class=ab style="${a}:${x}px;top:${y}px;width:150px;font:500 15px/1.2 Inter;color:${pe};text-align:${a}">${txt}</div>`
    return fundo(F, 'g-elevador.jpg', '50% 30%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,.45),rgba(43,33,27,0) 45%)"></div>' +
      B(230, 40, T(t.g1), 280, mo) + B(130, 300, T(t.g2), 140, cr) + B(400, 230, T(t.g3), 280, mo) + B(130, 450, T(t.g4), 140, cr) +
      E('2b50', 780, 180, 150, 12) + E('2728', 90, 430, 90) + E('2b50', 250, 880, 110, -10) + E('2728', 880, 800, 80) +
      `<div class=ab style="left:700px;top:620px;font:500 46px/1.15 Inter;color:${cr};letter-spacing:-1px">${T(t.l1)}<br><span style="background:${pe};color:${te};font-weight:700;padding:0 10px">${T(t.dest)}</span><br>${T(t.l2)}<br>` + linhas(t.it).map((l) => `<i style="font:italic 52px InstrSerif">${T(l)}</i>`).join('<br>') + '</div>' +
      mini(1010, 110, T(t.mini), 'right') + mini(30, 1000, T(t.mini)) +
      `<div class=ab style="left:0;right:0;bottom:60px;text-align:center;font:500 30px Inter;color:${cr}">${T(t.handle)}</div>`
  }, { titulo: 'g1' }),

  c('39-leves', 'Metas leves em palavras grandes', 'titulo', [
    campo('handle', 'Assinatura', '@karensantosperfil'), campo('w1', 'Palavra 1', 'tem'), campo('w2', 'Palavra 2 (mostarda)', 'metas'),
    campo('faixa', 'Faixa terracota', 'que ficam muito mais'), campo('w3', 'Palavra 3 (pêssego)', 'leves'),
    campo('rodape', 'Frase final (*trecho* em negrito)', 'quando a gente não carrega\ntudo *SOZINHA.*'),
  ], ({ t, F }) => {
    const dots = (x, y, w, h) => `<div class=ab style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background-image:radial-gradient(${cr} 2.2px,transparent 2.6px);background-size:16px 16px;opacity:.75;-webkit-mask-image:linear-gradient(135deg,#000,transparent 70%)"></div>`
    return fundo(F, 'n2.jpg', '50% 25%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,0) 45%,rgba(43,33,27,.45))"></div>' +
      dots(760, 0, 320, 300) + dots(0, 1080, 320, 270) +
      `<div class=ab style="left:0;right:0;top:80px;text-align:center;font:500 30px Inter;color:${cr}">${T(t.handle)}</div>` +
      B(250, 780, T(t.w1), 120, cr) + B(150, 860, T(t.w2), 240, mo) + `<div class=ab style="left:390px;top:1010px;background:${te};padding:2px 14px;font:500 44px Inter;color:${cr};letter-spacing:-1px">${T(t.faixa)}</div>` +
      B(330, 1040, T(t.w3), 240, pe) + `<div class=ab style="left:300px;top:1230px;font:500 40px/1.2 Inter;color:${cr};letter-spacing:-.5px">${rico(t.rodape, '<b>', '</b>')}</div>` +
      E('2b50', 260, 150, 100) + E('2b50', 800, 420, 90, 10) + E('2b50', 190, 1020, 130, -12) + E('2b50', 880, 1210, 80)
  }, { titulo: 'w2', texto: 'rodape' }),

  c('41-quem-sou', 'Quem sou eu, com estrelas', 'titulo', [
    campo('a', 'Linha 1', 'vem saber'), campo('b', 'Linha 2', 'quem'), campo('c', 'Linha 3', 'sou eu'), campo('d', 'Linha 4', 'e o que'), campo('e', 'Linha 5', 'eu faço'),
    campo('handle', 'Assinatura', '@KARENSANTOSPERFIL'),
  ], ({ t, F }) => fundo(F, 'g-elevador-zoom.jpg', '50% 35%') + '<div class=ab style="inset:0;background:rgba(43,33,27,.15)"></div>' +
    E('2b50', -110, 560, 300, -15) + E('2b50', 900, 320, 320, 20) + E('2b50', 760, 800, 200, 8) + E('2b50', 200, 840, 130, -8) + E('2b50', 230, 500, 110, 12) +
    B(260, 560, T(t.a), 110, cr) + B(400, 650, T(t.b), 190, cr) + B(330, 810, T(t.c), 190, cr) + B(450, 980, T(t.d), 80, cr) + B(330, 1050, T(t.e), 190, cr) +
    `<div class=ab style="left:0;right:0;bottom:60px;text-align:center;font:500 28px Inter;color:${cr};letter-spacing:2px">${T(t.handle)}</div>`, { titulo: 'b' }),

  c('42-templates', 'Janela de câmera do Windows', 'interface', [
    campo('etiqueta', 'Etiqueta', '[salva esses]'), campo('t1', 'Título grande', 'templates'), campo('t2', 'Título menor', 'de carrossel'),
    campo('serif', 'Frase em serifa', 'feitos com'), campo('dest', 'Palavra selecionada', 'IA'),
  ], ({ t, F }) => fundo(F, 'n1.jpg', '62% 45%', 'filter:brightness(.55) saturate(.9)') +
    janelaCamera(F, { x: 150, y: 560, w: 780, h: 560, barra: '#E9E3D9', foto: ['n4.jpg', '50% 32%'], altFoto: 440, rodape: { topo: 36, sombra: 4, html: `<div style="height:84px;display:flex;align-items:center;justify-content:space-between;padding:0 24px"><span style="font:500 20px Inter;color:#3B3B3B">⚙</span><span style="width:58px;height:58px;border-radius:50%;background:#fff;border:4px solid #3B3B3B;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:26px Inter;color:#3B3B3B">⌾</span><span style="background:#D8D0C4;border-radius:20px;padding:6px 18px;font:500 18px Inter;color:${ti}">Foto · Vídeo</span></div>` } }) +
    `<div class=ab style="left:230px;top:210px;background:${pe};padding:6px 18px;transform:rotate(-3deg);font:500 46px Inter;color:${te}">${T(t.etiqueta)}</div>` +
    B(170, 270, T(t.t1), 190, ar) + B(170, 430, T(t.t2), 110, ar) +
    `<div class=ab style="left:250px;top:890px;font:400 140px InstrSerif;color:${ar};white-space:nowrap;text-shadow:0 4px 18px rgba(0,0,0,.5)">${T(t.serif)} <span style="position:relative;background:rgba(166,75,42,.75);color:${cr};padding:0 10px"><i style="position:absolute;left:-5px;top:0;bottom:0;width:5px;background:${mo}"><b style="position:absolute;left:-7px;top:-12px;width:19px;height:19px;border-radius:50%;background:${mo}"></b></i>${T(t.dest)}<i style="position:absolute;right:-5px;top:0;bottom:0;width:5px;background:${mo}"><b style="position:absolute;left:-7px;bottom:-12px;width:19px;height:19px;border-radius:50%;background:${mo}"></b></i></span></div>` +
    E('2728', 90, 240, 100) + E('2b50', 900, 700, 110, 10) + E('2b50', 100, 1000, 90, -10), { titulo: 't1' }),

  // ===== rodada 6 =====
  c('43-baloes', 'Câmera com grade e dois balões', 'interface', [
    campo('b1', 'Balão de cima', 'dia de palestra'), campo('b2', 'Balão de baixo', 'e roteiro no caminho'),
  ], ({ t, F }) => {
    const grid = [360, 720].map((x) => `<div class=ab style="left:${x}px;top:0;bottom:0;width:2px;background:rgba(244,239,231,.55)"></div>`).join('') + [450, 900].map((y) => `<div class=ab style="top:${y}px;left:0;right:0;height:2px;background:rgba(244,239,231,.55)"></div>`).join('')
    const bot = '<span style="display:flex;gap:6px;background:rgba(43,33,27,.55);border-radius:40px;padding:8px">' + ['0.5', '1x', '2', '5'].map((x) => `<span style="width:70px;height:56px;border-radius:28px;${x === '1x' ? `background:${cr};color:${ti}` : `color:${cr}`};display:flex;align-items:center;justify-content:center;font:500 24px Inter">${x}</span>`).join('') + '</span>'
    return fundo(F, 'g-elevador.jpg', '50% 30%') + grid + balao10(560, 190, T(t.b1), cr, 'left') + balao10(90, 980, T(t.b2), pe, 'right') +
      `<div class=ab style="left:0;right:0;bottom:50px;display:flex;justify-content:center;gap:28px">${bot}</div>`
  }, { titulo: 'b1', texto: 'b2' }),

  c('44-album', 'Álbum de fotos', 'interface', [
    campo('titulo', 'Nome do álbum', 'arquivo pj'), campo('local', 'Local', 'SÃO PAULO'),
  ], ({ t, F }) => {
    const th = (f, pos) => `<div style="position:relative;width:300px;height:500px;flex:none;border-radius:20px;outline:10px solid #DDE7F7;outline-offset:-10px;background:${F(f)} ${pos}/cover"><span style="position:absolute;left:14px;top:14px;width:46px;height:46px;border-radius:50%;background:#1A73E8;color:#fff;font:700 26px/46px Inter;text-align:center;box-shadow:0 0 0 4px rgba(255,255,255,.9)">✓</span></div>`
    return fundo(F, 'n4.jpg', '50% 30%', 'filter:blur(14px) brightness(.85)') +
      `<div class=ab style="left:40px;right:40px;top:150px;background:${cr};border-radius:36px;padding:34px 0 34px 34px;box-shadow:0 14px 40px rgba(0,0,0,.3)">` +
      `<div style="display:flex;gap:28px;align-items:center;padding-right:34px"><div style="width:150px;height:150px;border-radius:18px;background:${F('n2.jpg')} 50% 25%/cover"></div><div><div class=bz style="font-size:84px;color:${ti}">${T(t.titulo)}</div><div style="margin-top:14px;display:inline-flex;align-items:center;gap:8px;border:2px solid #D6CBBB;border-radius:30px;padding:6px 18px;font:500 24px Inter;letter-spacing:1px;color:${ti}">${Ei('1f4cd', 28)} ${T(t.local)} ${Ei('1f352', 34)}</div></div></div>` +
      '<div style="height:2px;background:#E2D7C9;margin:30px 34px 30px 0"></div>' +
      `<div style="display:flex;gap:20px;overflow:hidden">${th('n1.jpg', '62% 45%')}${th('g-sofa.jpg', '50% 40%')}${th('n0.jpg', '45% 50%')}</div></div>`
  }, { titulo: 'titulo' }),

  c('45-favoritos', 'Favoritos na janela da câmera', 'interface', [
    campo('titulo', 'Título', 'favoritos da semana'), campo('b1', 'Balão rosado', 'lugares + pessoas'), campo('b2', 'Balão claro', 'mais disso, por favor'),
  ], ({ t, F }) => fundo(F, 'g-sofa.jpg', '50% 40%', 'filter:blur(10px) brightness(.85)') +
    janelaCamera(F, { x: 120, y: 330, w: 840, h: 820, barra: '#F7F2EA', foto: ['n3.jpg', '50% 35%'], altFoto: 680, rodape: { topo: 40, sombra: 35, html: `<div style="height:100px;display:flex;align-items:center;justify-content:space-between;padding:0 24px"><span style="width:70px;height:70px;border-radius:8px;background:${F('n2.jpg')} 50% 25%/cover"></span><span style="width:64px;height:64px;border-radius:50%;background:#fff;border:4px solid #3B3B3B;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:26px Inter;color:#3B3B3B">⌾</span><span style="background:#D8D0C4;border-radius:20px;padding:4px 16px;font:500 18px Inter;color:${ti}">Foto · Vídeo</span></div>` } }) +
    B(0, 150, T(t.titulo), 120, cr, 'left:0;right:0;text-align:center;text-shadow:0 4px 16px rgba(0,0,0,.3)') +
    E('1f497', 860, 90, 80, 12) +
    balao10(700, 520, T(t.b1), '#F4C3A1', 'left', true) +
    balao10(40, 880, T(t.b2), cr, 'right', true), { titulo: 'titulo' }),

  c('46-chique', 'Coisas que eu acho chique', 'titulo', [
    campo('lab1', 'Canto superior esquerdo (*trecho* em negrito)', '*AUTONOMIA* NA PRÁTICA'), campo('lab2', 'Canto superior direito', 'CONSULTORA'),
    campo('lab3', 'Canto inferior esquerdo', '@KARENSANTOS*PERFIL*'), campo('lab4', 'Canto inferior direito', 'VERSÃO *PJ*'),
    campo('titulo', 'Título (uma palavra por linha)', 'coisas\nque eu\nacho'), campo('serif', 'Palavra em serifa', 'chique'), campo('selo', 'Selo (*trecho* em negrito)', 'versão *consultora*'),
  ], ({ t, F }) => {
    const lab = (x, y, txt, a = 'left') => `<div class=ab style="${a}:${x}px;top:${y}px;font:500 24px Inter;letter-spacing:3px;color:${cr}">${txt}</div>`
    const b = (s) => rico(s, '<b>', '</b>')
    return fundo(F, 'n0.jpg', '45% 50%') + '<div class=ab style="inset:0;background:rgba(43,33,27,.3)"></div>' +
      lab(80, 90, b(t.lab1)) + lab(80, 90, b(t.lab2), 'right') + lab(80, 1240, b(t.lab3)) + lab(80, 1240, b(t.lab4), 'right') +
      `<div class=ab style="left:0;right:0;top:300px;text-align:center;color:${ar};text-shadow:0 4px 18px rgba(0,0,0,.35)">` + linhas(t.titulo).map((l) => `<div class=bz style="font-size:170px;line-height:.92">${T(l)}</div>`).join('') + `<div style="font:italic 200px/1 InstrSerif">${T(t.serif)}</div></div>` +
      `<div class=ab style="left:0;right:0;top:1030px;text-align:center"><span style="background:${pe};border:3px solid ${ti};padding:8px 26px;font:500 40px Inter;color:${ti}">${b(t.selo)}</span></div>` +
      E('1f496', 710, 250, 90, 12) + E('2728', 160, 470, 80) + E('2728', 830, 640, 80) + E('1f496', 150, 760, 80, -10) + E('1f496', 730, 900, 90, 8)
  }, { titulo: 'titulo' }),

  c('47-liberdade', 'Frase sublinhada', 'titulo', [
    campo('l1', 'Linha 1 (*trecho* em negrito)', 'A *autonomia* pra'), campo('l2', 'Linha 2', '*decidir* por onde'), campo('l3', 'Linha 3', '*começa a semana*'),
  ], ({ t, F }) => {
    const b = (s) => rico(s, '<b>', '</b>')
    return fundo(F, 'n2.jpg', '50% 28%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,0) 50%,rgba(43,33,27,.55))"></div>' +
      `<div class=ab style="left:80px;top:960px;font:500 74px/1.32 Inter;letter-spacing:-2px;color:${ar}">` +
      `<span style="border-bottom:4px solid ${ar}">${b(t.l1)}</span><br><span style="border-bottom:4px solid ${ar}">${b(t.l2)}</span> <span>${Ei('1f496', 70)}</span><br><span style="border-bottom:4px solid ${ar}">${b(t.l3)}</span></div>`
  }, { titulo: 'l1' }),

  // ===== rodada 7 =====
  c('48-comentarios', 'Comentários subindo', 'baloes', [
    campo('c1', 'Comentário 1', 'Comecei a escrever a próxima ação antes de fechar o notebook e retomar ficou muito mais leve.'),
    campo('c2', 'Comentário 2', 'Separar as metas em duas listas mudou meu jeito de planejar o ano.'),
    campo('c3', 'Comentário 3', 'Agora eu sei quais metas dependem de mim e quais viram negociação.'),
    campo('c4', 'Comentário 4', 'A pausa entrou na agenda antes do resto. Parece pouco, mas não é.'),
    campo('c5', 'Comentário 5', 'Achei que precisava de mais ferramenta. Precisava de ordem.'),
    campo('c6', 'Comentário 6', 'Salvei pra reler toda segunda.'), campo('c7', 'Comentário 7', 'Melhor carrossel da semana'),
  ], ({ t, F }) => fundo(F, 'g-sofa.jpg', '50% 45%') + '<div class=ab style="inset:0;background:rgba(43,33,27,.18)"></div>' +
    com(70, 160, T(t.c1), -4, te, 'right', 430) + com(560, 330, T(t.c2), 4, mo, 'left', 400) + com(70, 580, T(t.c3), -3, ca, 'right', 440) +
    com(570, 690, T(t.c4), 3, pe, 'left', 390) + com(200, 890, T(t.c5), -2, '#8A6A3F', 'right', 560) +
    com(90, 1080, T(t.c6), -5, te, 'right') + com(560, 1150, T(t.c7), 6, mo, 'left') +
    E('2764', 360, 110, 60) + E('2764', 700, 250, 56) + E('2764', 90, 480, 52) + E('2764', 920, 560, 58) + E('2764', 820, 940, 54), { titulo: 'c1' }),

  c('49-ideias', 'Edição do mês', 'titulo', [
    campo('etiqueta', 'Etiqueta', '[ edição de outubro ]'), campo('t1', 'Título', 'ideias de'), campo('serif', 'Palavra em serifa', 'conteúdo'),
    campo('texto', 'Texto (*trecho* em negrito)', 'Dez pautas pra quem cria conteúdo sobre trabalho autônomo: da conta das metas à pausa na agenda. *Todas testadas no meu próprio perfil.*'),
  ], ({ t, F }) => fundo(F, 'g-elevador-zoom.jpg', '50% 35%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,.35),rgba(43,33,27,0) 40%,rgba(43,33,27,.6))"></div>' +
    `<div class=ab style="left:120px;top:200px;background:${pe};padding:6px 20px;transform:rotate(-3deg);font:500 40px Inter;color:${te}">${T(t.etiqueta)}</div>` +
    B(110, 270, T(t.t1), 200, cr) + `<div class=ab style="left:300px;top:450px;font:italic 170px/1 InstrSerif;color:${ar}">${T(t.serif)}</div>` +
    `<svg class=ab style="left:320px;top:640px" width="520" height="40"><path d="M6 26 C150 6 340 10 514 18" stroke="${ar}" stroke-width="6" fill="none" stroke-linecap="round"/></svg>` +
    E('2728', 290, 460, 110) +
    `<div class=ab style="left:90px;right:90px;top:1080px;text-align:justify;font:500 34px/1.35 Inter;color:${cr}">${rico(t.texto, '<b>', '</b>')}</div>`, { titulo: 't1', texto: 'texto' }),

  c('50-chamada', 'Chamada recebida', 'interface', [
    campo('topo', 'Linha de cima', 'Chamada recebida'), campo('titulo', 'Título', 'a semana\ntá chamando'), campo('sub', 'Linha de baixo', 'Celular'),
    campo('recusar', 'Botão da esquerda', 'Recusar'), campo('atender', 'Botão da direita', 'Atender'), campo('responder', 'Rodapé', 'Responder'),
  ], ({ t, F }) => {
    const circ = (x, cor, icone, txt) => `<div class=ab style="left:${x}px;top:1040px;width:200px;text-align:center"><div style="width:150px;height:150px;border-radius:50%;margin:0 auto;background:${cor};display:flex;align-items:center;justify-content:center;font:700 60px Inter;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.3)">${icone}</div><div style="margin-top:14px;font:500 34px Inter;color:${cr};text-shadow:0 2px 8px rgba(0,0,0,.5)">${txt}</div></div>`
    return fundo(F, 'n2.jpg', '50% 28%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,.55),rgba(43,33,27,0) 32%,rgba(43,33,27,0) 62%,rgba(43,33,27,.55))"></div>' +
      `<div class=ab style="left:0;right:0;top:90px;text-align:center;color:${cr};text-shadow:0 2px 12px rgba(0,0,0,.35)"><div style="font:500 36px Inter;opacity:.9">${T(t.topo)}</div><div class=bz style="font-size:120px;line-height:1;margin-top:14px">${T(t.titulo)}</div><div style="font:500 36px Inter;opacity:.85;margin-top:16px">${T(t.sub)}</div></div>` +
      circ(140, '#D4513A', '✕', T(t.recusar)) + circ(740, '#3E9B5A', '✆', T(t.atender)) +
      `<div class=ab style="left:0;right:0;top:1250px;text-align:center;font:500 30px Inter;color:${cr};opacity:.9">${Ei('1f4ac', 40)} ${T(t.responder)}</div>`
  }, { titulo: 'titulo' }),

  c('51-player', 'Player de música', 'interface', [
    campo('titulo', 'Nome da faixa', 'Próxima ação'), campo('artista', 'Artista', 'Karen Santos · Roteiro da semana'),
    campo('t1', 'Tempo à esquerda', '1:12'), campo('t2', 'Tempo à direita', '−3:48'),
  ], ({ t, F }) => fundo(F, 'n4.jpg', '50% 35%') +
    player(70, 260, 940, `${F('n2.jpg')} 50% 25%/cover`, T(t.titulo), T(t.artista), T(t.t1), T(t.t2)), { titulo: 'titulo', texto: 'artista' }),

  c('52-play', 'Player com legenda', 'interface', [
    campo('titulo', 'Nome da faixa', 'Segunda sem pressa'), campo('artista', 'Artista', 'roteiro da semana · Karen Santos'),
    campo('t1', 'Tempo à esquerda', '0:24'), campo('t2', 'Tempo à direita', '8:40'), campo('legenda', 'Legenda em serifa', 'play na semana\nno meu ritmo'),
  ], ({ t, F }) => fundo(F, 'g-sofa.jpg', '50% 45%', 'filter:sepia(.25) brightness(.92)') +
    player(110, 180, 860, `${F('n4.jpg')} 50% 35%/cover`, T(t.titulo), T(t.artista), T(t.t1), T(t.t2)) +
    `<div class=ab style="left:110px;top:1060px;font:italic 72px/1.1 InstrSerif;color:${cr};text-shadow:0 2px 14px rgba(0,0,0,.6)">${T(t.legenda)}</div>` +
    `<div class=ab style="left:120px;top:1230px;display:flex;gap:10px">${Ei('1f4d6', 56)}${Ei('2615', 56)}${Ei('2728', 56)}</div>`, { titulo: 'titulo', texto: 'legenda' }),

  // ===== rodada 8 =====
  c('53-pastas', 'Antes e depois em pastas', 'interface', [
    campo('a1', 'Ano de cima', '2016'), campo('vs', 'Meio', 'vs'), campo('a2', 'Ano de baixo', '2026'),
    campo('p1', 'Pasta 1', 'roteiros'), campo('p2', 'Pasta 2', 'clientes'), campo('p3', 'Pasta 3', 'palestras'),
    campo('p4', 'Pasta 4', 'notas da\nsemana'), campo('p5', 'Pasta 5', 'arquivo pj'), campo('p6', 'Pasta 6', 'pós-graduação'),
  ], ({ t, F }) => {
    const pasta = (x, y, txt) => `<div class=ab style="left:${x}px;top:${y}px;width:200px;text-align:center"><img style="width:130px;height:130px;filter:drop-shadow(0 3px 6px rgba(0,0,0,.3))" src="${emo('1f4c1')}"><div style="font:500 24px/1.2 Inter;color:${cr};text-shadow:0 1px 6px rgba(0,0,0,.6)">${txt}</div></div>`
    return fundo(F, 'g-elevador.jpg', '50% 30%', 'filter:blur(16px) brightness(.8)') +
      B(80, 420, T(t.a1), 230, cr) + B(80, 640, T(t.vs), 230, cr) + B(80, 860, T(t.a2), 230, cr) +
      pasta(330, 90, T(t.p1)) + pasta(780, 170, T(t.p2)) + pasta(560, 420, T(t.p3)) + pasta(800, 640, T(t.p4)) + pasta(590, 900, T(t.p5)) + pasta(100, 1130, T(t.p6))
  }, { titulo: 'a1' }),

  c('54-eu-voce', 'Eu e você em círculos', 'pilulas', [
    campo('eu', 'Legenda da esquerda', 'eu'), campo('voce', 'Legenda da direita', 'você'), campo('local', 'Etiqueta', 'plateia de sábado'),
  ], ({ t, F }) => {
    const circ = (x, y, s, f, pos, lab) => `<div class=ab style="left:${x}px;top:${y}px;width:${s}px;text-align:center"><div style="font:500 32px Inter;color:${cr};text-shadow:0 2px 8px rgba(0,0,0,.6);margin-bottom:10px">${lab}</div><div style="width:${s}px;height:${s}px;border-radius:50%;border:6px solid ${cr};background:${F(f)} ${pos}/cover;box-shadow:0 10px 26px rgba(0,0,0,.35)"></div></div>`
    return fundo(F, 'n0.jpg', '45% 50%') +
      circ(230, 400, 340, 'n4.jpg', '50% 20%', T(t.eu)) + circ(650, 450, 310, 'g-sofa.jpg', '20% 85%', T(t.voce)) +
      `<div class=ab style="left:0;right:0;top:880px;text-align:center"><span style="background:${cr};border-radius:30px;padding:12px 26px;font:500 30px Inter;color:${ti}">${Ei('1f4cd', 34)} ${T(t.local)}</span></div>`
  }, { titulo: 'local' }),

  c('55-tendencias', 'Papel colado com fita', 'titulo', [
    campo('selo', 'Selo', 'NOVIDADES'), campo('t1', 'Título linha 1', 'tendências'), campo('t2', 'Título linha 2', 'de conteúdo'), campo('serif', 'Frase em serifa', '[ deste mês ]'),
  ], ({ t }) => {
    const grid = `background:${te};background-image:linear-gradient(rgba(244,239,231,.25) 2px,transparent 2px),linear-gradient(90deg,rgba(244,239,231,.25) 2px,transparent 2px);background-size:72px 72px`
    const fita = (x, y, r) => `<div class=ab style="left:${x}px;top:${y}px;width:200px;height:56px;background:rgba(241,223,196,.75);transform:rotate(${r}deg)"></div>`
    return `<div class=ft style="${grid}"></div>` +
      `<div class=ab style="left:90px;top:230px;width:900px;height:860px;background:${cr};box-shadow:0 14px 40px rgba(0,0,0,.25)"></div>` +
      fita(30, 190, -30) + fita(850, 190, 30) + fita(30, 1060, 30) + fita(850, 1060, -30) +
      `<div class=ab style="left:160px;top:330px;border:3px solid ${te};border-radius:30px;padding:4px 22px;font:500 34px Inter;letter-spacing:2px;color:${te}">${T(t.selo)}</div>` +
      `<div class=ab style="left:150px;top:420px;width:780px;height:330px;background:${mo};transform:rotate(-1deg)"></div>` +
      B(170, 400, T(t.t1), 160, ti) + B(170, 570, T(t.t2), 150, ti) +
      `<div class=ab style="left:330px;top:800px;border:3px solid ${ti};padding:4px 26px;font:italic 74px InstrSerif;color:${ti}">${T(t.serif)}</div>` +
      E('1f525', 700, 250, 150, 10) + E('2b50', 100, 830, 160, -12) + E('2728', 780, 860, 130)
  }, { titulo: 't1' }),

  c('57-motivos', 'Motivos pra me seguir', 'pilulas', [
    campo('n1', 'Nota 1', 'falo de IA sem prometer atalho'), campo('n2', 'Nota 2', 'mostro a planilha de verdade'), campo('n3', 'Nota 3', 'conto o que deu errado também'),
    campo('n4', 'Nota 4', 'bastidor de palestra'), campo('n5', 'Nota 5', 'falo muito, muito de contexto'), campo('n6', 'Nota 6', 'não tenho fórmula pronta'), campo('n7', 'Nota 7', 'posto rotina de pj sem filtro'),
    campo('titulo', 'Título', 'motivos pra me'), campo('dest', 'Palavra em destaque', 'seguir'), campo('sub', 'Linha de baixo', '(ou deixar de seguir)'),
  ], ({ t, F }) => {
    const nota = (x, y, txt, r = 0) => `<div class=ab style="left:${x}px;top:${y}px;width:250px;transform:rotate(${r}deg);font:500 25px/1.25 Inter;color:${cr};text-align:center;text-shadow:0 1px 6px rgba(0,0,0,.6)">${txt}</div>`
    return fundo(F, 'n2.jpg', '50% 28%') + '<div class=ab style="inset:0;background:rgba(43,33,27,.25)"></div>' +
      nota(60, 120, T(t.n1), -4) + nota(770, 110, T(t.n2), 5) + nota(60, 420, T(t.n3), 3) + nota(780, 420, T(t.n4), -3) +
      nota(70, 1100, T(t.n5), -5) + nota(400, 1180, T(t.n6), 2) + nota(760, 1090, T(t.n7), 4) +
      `<div class=ab style="left:0;right:0;top:680px;text-align:center;color:${cr};text-shadow:0 4px 16px rgba(0,0,0,.4)"><div class=bz style="font-size:110px">${T(t.titulo)} <span style="background:${pe};color:${ti};padding:0 16px;text-shadow:none">${T(t.dest)}</span></div><div class=bz style="font-size:80px;margin-top:10px">${T(t.sub)}</div></div>`
  }, { titulo: 'titulo' }),

  // ===== rodada 9 =====
  c('58-um-dia', 'Um dia na minha vida, com setas', 'baloes', [
    campo('t1', 'Título linha 1', 'um dia na'), campo('t2', 'Título linha 2', 'minha vida'), campo('b1', 'Balão de cima', 'café primeiro'), campo('b2', 'Balão de baixo', 'roteiro no notebook'),
  ], ({ t, F }) => {
    const bal = (x, y, txt) => `<div class=ab style="left:${x}px;top:${y}px;background:${cr};border-radius:30px;padding:14px 28px;font:500 30px Inter;color:${ti};box-shadow:0 6px 14px rgba(30,20,14,.25)">${txt}</div>`
    const seta = (d) => `<svg class=ab style="left:0;top:0" width="1080" height="1350"><path d="${d}" fill="none" stroke="${cr}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    return fundo(F, 'g-sofa.jpg', '50% 45%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,.4),rgba(43,33,27,0) 35%)"></div>' +
      B(80, 110, T(t.t1), 150, cr) + B(80, 250, T(t.t2), 150, cr) +
      bal(690, 560, T(t.b1)) + seta('M760 640 C730 700 690 720 640 760 M640 760 l10 -28 M640 760 l28 -6') +
      bal(60, 830, T(t.b2)) + seta('M300 900 C340 960 380 990 430 1010 M430 1010 l-26 -12 M430 1010 l-8 -26')
  }, { titulo: 't2' }),

  c('59-livros', 'Livros em capas coladas', 'titulo', [
    campo('circulo', 'Texto em círculo', '@karensantosperfil · estante pj ·'), campo('capa1', 'Capa 1', 'notas\nde leitura'), campo('capa2', 'Capa 2', 'marcações\nda semana'),
    campo('l1', 'Título linha 1', 'livros de'), campo('l2', 'Título linha 2', 'negócio que'), campo('l3', 'Título linha 3 (*trecho* em terracota)', 'eu *AMO*'), campo('selo', 'Selo manuscrito', 'estante de pj'),
  ], ({ t }) => {
    const cap = (x, y, r, bg, txt, emj) => `<div class=ab style="left:${x}px;top:${y}px;width:250px;height:340px;background:${bg};transform:rotate(${r}deg);box-shadow:0 10px 24px rgba(30,20,14,.3);padding:26px;display:flex;flex-direction:column;justify-content:space-between"><div class=bz style="font-size:44px;color:${ti};white-space:normal;line-height:1">${txt}</div><img style="width:90px;height:90px;align-self:flex-end" src="${emo(emj)}"></div>`
    const circTxt = `<svg class=ab style="left:70px;top:330px" width="260" height="260" viewBox="0 0 260 260"><defs><path id="cc" d="M130 130 m-95 0 a95 95 0 1 1 190 0 a95 95 0 1 1 -190 0"/></defs><text font-family="Inter" font-weight="700" font-size="25" letter-spacing="3" fill="${ti}"><textPath href="#cc">${T(t.circulo)}</textPath></text></svg>`
    return `<div class=ft style="background:${cr}"></div>` + circTxt +
      cap(760, 170, 8, mo, T(t.capa1), '1f4d6') + cap(80, 880, -8, pe, T(t.capa2), '1f4da') +
      B(0, 460, T(t.l1), 170, ti, 'left:0;right:0;text-align:center') + B(0, 620, T(t.l2), 170, ti, 'left:0;right:0;text-align:center') + B(0, 780, rico(t.l3, `<span style="color:${te}">`, '</span>'), 170, ti, 'left:0;right:0;text-align:center') +
      `<div class=ab style="left:480px;top:990px;transform:rotate(-5deg);border:3px solid ${te};border-radius:40px;background:${pe};padding:8px 34px;font:50px Hand;color:${te}">${T(t.selo)}</div>`
  }, { titulo: 'l1' }),

  c('60-processo', 'Processo criativo (story)', 'titulo', [
    campo('titulo', 'Título manuscrito', 'MEU PROCESSO\nCRIATIVO COM\nIA'),
  ], ({ t, F }) => fundo(F, 'n2.jpg', '50% 30%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,.45),rgba(43,33,27,0) 35%)"></div>' +
    `<div class=ab style="left:0;right:0;top:220px;text-align:center;font:92px/1.15 Hand;letter-spacing:4px;color:${cr};text-shadow:0 2px 10px rgba(0,0,0,.35)">${T(t.titulo)}</div>` +
    E('2728', 30, 240, 180, -10) + E('2728', 860, 500, 130) + E('2b50', 250, 640, 100, 8) + E('2728', 740, 60, 120), { titulo: 'titulo', h: 1920, formato: 'story' }),

  c('61-gravar', 'Como gravar, com serifa', 'titulo', [
    campo('handle', 'Assinatura', '@karensantosperfil'), campo('a', 'Linha 1', 'como'), campo('a2', 'Linha 1 em serifa', 'gravar'), campo('b', 'Título grande', 'você mesma'),
    campo('c', 'Linha 3', 'no'), campo('c2', 'Linha 3 em serifa', 'elevador'),
    campo('r1', 'Rodapé 1', 'plano a plano'), campo('r2', 'Rodapé 2 em serifa', 'elevador do prédio'), campo('r3', 'Rodapé 3 em negrito', 'começa aqui'),
  ], ({ t, F }) => fundo(F, 'g-elevador.jpg', '50% 30%') + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,.45),rgba(43,33,27,.1) 60%,rgba(43,33,27,.55))"></div>' +
    `<div class=ab style="left:0;right:0;top:70px;text-align:center;font:700 30px Inter;color:${cr}">${T(t.handle)}</div>` +
    `<div class=ab style="left:150px;top:200px;font:300 100px Inter;letter-spacing:-3px;color:${cr}">${T(t.a)} <i style="font:italic 120px InstrSerif">${T(t.a2)}</i></div>` +
    B(110, 330, T(t.b), 190, ar) +
    `<div class=ab style="left:420px;top:540px;font:300 90px Inter;letter-spacing:-3px;color:${cr}">${T(t.c)} <i style="font:italic 110px InstrSerif">${T(t.c2)}</i></div>` +
    `<div class=ab style="left:0;right:0;bottom:70px;text-align:center;font:500 30px Inter;color:${cr}">${T(t.r1)} &nbsp;//&nbsp; <i style="font:italic 36px InstrSerif">${T(t.r2)}</i> &nbsp;//&nbsp; <b>${T(t.r3)}</b></div>`, { titulo: 'b' }),

  c('62-cartao', 'Cartão tipográfico', 'titulo', [
    campo('l1', 'Linha 1 (*trecho* em itálico)', 'a semana'), campo('l2', 'Linha 2', '*cabe* quando'), campo('l3', 'Linha 3', 'tem *ordem*'),
    campo('s1', 'Selo 1', 'SEM'), campo('s2', 'Selo 2', 'CORRER'), campo('s3', 'Selo 3', 'ATRÁS'), campo('s4', 'Selo 4', 'DE TUDO'),
  ], ({ t }) => {
    const selo = (x, y, txt, r) => `<div class=ab style="left:${x}px;top:${y}px;transform:rotate(${r}deg);background:${te};padding:6px 18px;font:700 28px Inter;letter-spacing:2px;color:${cr}">${txt}</div>`
    const linha = (y, txt, s) => `<div class=ab style="left:0;right:0;top:${y}px;text-align:center;font:400 ${s}px/1 InstrSerif;letter-spacing:-4px;color:#6E2A14">${rico(txt, '<i>', '</i>')}</div>`
    return `<div class=ft style="background:${pe}"></div><div class=ab style="left:50px;right:50px;top:50px;bottom:50px;border:3px solid #6E2A14;border-radius:40px"></div>` +
      linha(300, t.l1, 190) + linha(480, t.l2, 170) + linha(650, t.l3, 190) +
      selo(250, 960, T(t.s1), -6) + selo(400, 975, T(t.s2), 4) + selo(640, 955, T(t.s3), -5) + selo(420, 1060, T(t.s4), 3)
  }, { titulo: 'l1' }),

  c('63-busca', 'Busca com histórico', 'interface', [
    campo('handle', 'Assinatura', '@karensantosperfil'), campo('busca', 'Busca', '5 coisas que eu amei este mês'),
    campo('i1', 'Item 1', 'o caderno que eu sempre recompro'), campo('i2', 'Item 2 (destacado)', 'o app de notas que ficou'), campo('i3', 'Item 3', 'a playlist pra escrever roteiro'),
    campo('i4', 'Item 4', 'a pausa das 15h'), campo('i5', 'Item 5', 'um café perto do coworking'), campo('rodape', 'Rodapé', 'LINK NA BIO'),
  ], ({ t, F }) => {
    const borda = (x, y, w, h, f, pos, r) => `<div class=ab style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${r}deg);background:${cr};padding:12px;box-shadow:0 8px 20px rgba(0,0,0,.3)"><div style="width:100%;height:100%;background:${F(f)} ${pos}/cover"></div></div>`
    const lupa = '<svg width="30" height="30" viewBox="0 0 30 30"><circle cx="12" cy="12" r="9" stroke="#7A6E64" stroke-width="3" fill="none"/><path d="M19 19 L27 27" stroke="#7A6E64" stroke-width="3" stroke-linecap="round"/></svg>'
    const lista = [t.i1, t.i2, t.i3, t.i4, t.i5].map((x, k) => `<div style="display:flex;gap:22px;align-items:center;padding:20px 30px;${k === 1 ? `background:${pe};` : ''}font:500 34px Inter;color:${ti}"><span style="font:500 30px Inter;color:#7A6E64">🕘</span><span style="flex:1">${T(x)}</span><span style="font:500 32px Inter;color:#7A6E64">↖</span></div>`).join('')
    return `<div class=ft style="background:${cr}"></div>` + borda(-120, -60, 330, 420, 'n4.jpg', '50% 30%', -8) + borda(900, -40, 320, 420, 'g-sofa.jpg', '50% 40%', 7) + borda(-140, 980, 330, 420, 'n1.jpg', '62% 45%', 6) + borda(920, 960, 320, 420, 'g-elevador.jpg', '50% 30%', -6) +
      `<div class=ab style="left:90px;top:40px;right:90px;bottom:40px;background:${F('n2.jpg')} 50% 28%/cover;box-shadow:0 10px 30px rgba(0,0,0,.35)"></div>` +
      `<div class=ab style="left:0;right:0;top:110px;text-align:center;font:500 32px Inter;color:${cr};text-shadow:0 2px 8px rgba(0,0,0,.5)">${T(t.handle)}</div>` +
      `<div class=ab style="left:150px;right:150px;top:520px;background:#F1E7DA;border-radius:56px;padding:26px 34px;display:flex;align-items:center;gap:20px;font:500 38px Inter;color:${ti};box-shadow:0 8px 20px rgba(0,0,0,.25)">${lupa}<span style="flex:1">${T(t.busca)}</span><span style="font:500 36px Inter;color:#5C5048">🎙</span><span style="font:500 36px Inter;color:#5C5048;margin-left:6px">⌾</span></div>` +
      `<div class=ab style="left:150px;right:150px;top:640px;background:rgba(244,239,231,.95);border-radius:30px;padding:16px 0;box-shadow:0 8px 20px rgba(0,0,0,.25)">${lista}</div>` +
      `<div class=ab style="left:0;right:0;bottom:90px;text-align:center;font:500 26px Inter;letter-spacing:4px;color:${cr};text-shadow:0 2px 8px rgba(0,0,0,.5)">${T(t.rodape)}</div>`
  }, { titulo: 'busca' }),

  // ===== séries =====
  c('meses-01-janeiro', 'Mês em sílabas', 'series', [
    campo('silabas', 'Sílabas (separe com hífen)', 'ja-nei-ro', 'Ex.: fe-ve-rei-ro, mar-ço, a-bril'),
  ], mes, { titulo: 'silabas' }),

  c('notas-01-capa', 'Notas pra semanas cheias', 'series', [
    campo('esq', 'Topo à esquerda', 'NOTAS PRA SEMANAS CHEIAS'), campo('dir', 'Topo à direita', '@KARENSANTOSPERFIL'),
    campo('titulo', 'Título (*trecho* em mostarda)', 'Pequenos *lembretes*\npra quem trabalha\n*sozinha*'), campo('corpo', 'Texto', 'Sete notas que eu releio quando a semana aperta.'),
    campo('rod1', 'Rodapé à esquerda', 'LEMBRETE 1 DE 7'), campo('rod2', 'Rodapé à direita', 'ARRASTA'),
  ], ({ t, F }) => fundoNotas(F, 'n4.jpg', '50% 30%') + topoN(T(t.esq), T(t.dir)) + menuN(430) + tituloN(530, t.titulo) + corpoN(940, t.corpo) + rodapeN(T(t.rod1), T(t.rod2)), { titulo: 'titulo', texto: 'corpo' }),

  c('rotina-01-capa', 'Um dia de trabalho comigo', 'series', [
    campo('titulo', 'Título', 'um dia de\ntrabalho\ncomigo'), campo('pilula', 'Pílula', 'versão consultora'), campo('handle', 'Assinatura', '@karensantosperfil'),
  ], ({ t, F }) => `<div class=ft style="background-image:${F('n2.jpg')};background-position:50% 30%"></div>` + '<div class=ab style="inset:0;background:linear-gradient(180deg,rgba(43,33,27,0) 35%,rgba(43,33,27,.55))"></div>' +
    `<div class="ab bz" style="left:0;right:0;top:640px;text-align:center;font-size:150px;line-height:.95;color:${cr};text-shadow:0 4px 16px rgba(0,0,0,.3)">${T(t.titulo)}</div>` +
    `<div class=ab style="left:0;right:0;top:1100px;text-align:center"><span style="background:${pe};border-radius:30px;padding:8px 24px;font:500 32px Inter;color:${ti}">${T(t.pilula)}</span></div>` +
    Eseco('2728', 150, 640, 90) + Eseco('2b50', 860, 900, 90, 10) + `<div class=ab style="left:0;right:0;bottom:50px;text-align:center;font:500 24px Inter;color:${cr};opacity:.85">${T(t.handle)}</div>`, { titulo: 'titulo' }),

  // ===== texto atrás da cabeça =====
  ...[
    ['79-planilha', 'Atrás da cabeça: horas', 'camiseta', 252, { l1: 'o que mais me devolve', l2: 'horas', l3: 'é a planilha que\nninguém vê.', nota: 'de verdade.' }, {}, ['2728', 890, 250, 90]],
    ['80-aula', 'Atrás da cabeça: aula', 'palestra', 285, { l1: 'o que eu falo na', l2: 'aula', l3: 'veio de um problema\nreal de cliente.', nota: 'quase sempre.' }, { dest: mo }, ['2b50', 90, 260, 90, -10]],
    ['81-rabisco', 'Atrás da cabeça: rabisco', 'discos', 384, { l1: 'antes de automatizar, eu', l2: 'rabisco', l3: 'o fluxo à mão\nprimeiro.', nota: 'depois a IA.' }, { big: 250, dest: pe }, ['1f4dd', 900, 180, 90, -10]],
    ['82-quinta', 'Atrás da cabeça: meta', 'sofa', 294, { l1: 'tem semana que a', l2: 'meta', l3: 'fica pra quinta.\ne a agenda aguenta.', nota: '' }, {}, ['1f90d', 100, 260, 80, -8]],
  ].map(([id, nome, foto, cabeca, txt, op, emoji]) => {
    const corpo = sobrepoe({ cabeca, ...op })
    return c(id, nome, 'cabeca', [
      campo('l1', 'Linha de cima', txt.l1), campo('l2', 'Palavra gigante (sem p, g, q, j, y)', txt.l2),
      campo('l3', 'Tarjas de baixo', txt.l3), campo('nota', 'Nota manuscrita', txt.nota),
    ], (a) => corpo(a) + Eseco(...emoji), { titulo: 'l2', texto: 'l3', camadasTexto: { l1: 2, l2: 3, l3: 5, nota: 6 }, cabeca: { slot: 'pessoa', base: `${foto}-base.jpg`, recorte: `${foto}-recorte.webp` } })
  }),
]

// Onde entram o título e o texto dela quando o slide troca para este card: [título, texto, campos que esvaziam].
// Escolhidos olhando cada desenho, para cair em lugar de frase e não deixar pedaços do exemplo
// misturados com a frase dela (nos cards em que o título original é montado em várias linhas).
const RECEBE = {
  '16-tarefas': ['p1', 'p2'], '17a-serie-bootzy': ['t1', null, ['t2']], '18-selecao': ['sel', 'resto'], '19-agenda': ['evento', 'duracao'],
  '20-conversa': ['b1', 'b2'], '22-discos': ['balao', null], '23-roteiro': ['balao', null], '24-bastidores': ['titulo', 'mensagem'],
  '25-janela': ['nota', null], '26-cachorro': ['balao', null], '38-guia': ['g1', 'l1', ['g2', 'g3', 'g4', 'dest', 'l2', 'it', 'mini']],
  '39-leves': ['w2', 'rodape', ['w1', 'w3', 'faixa']], '41-quem-sou': ['a', null, ['b', 'c', 'd', 'e']], '42-templates': ['t1', null, ['t2', 'serif', 'dest']],
  '43-baloes': ['b1', 'b2'], '44-album': ['titulo', null], '45-favoritos': ['titulo', 'b1'], '46-chique': ['titulo', 'selo', ['serif']],
  '47-liberdade': ['l1', 'l2', ['l3']], '48-comentarios': ['c1', 'c2'], '49-ideias': ['t1', 'texto', ['serif']], '50-chamada': ['titulo', null],
  '51-player': ['titulo', 'artista'], '52-play': ['titulo', 'legenda'], '53-pastas': ['a1', null, ['vs', 'a2']], '54-eu-voce': ['local', null],
  '55-tendencias': ['t1', 'serif', ['t2']], '57-motivos': ['titulo', 'n1', ['dest', 'sub']], '58-um-dia': ['t1', 'b1', ['t2']],
  '59-livros': ['l1', null, ['l2', 'l3']], '60-processo': ['titulo', null], '61-gravar': ['b', null, ['a', 'a2', 'c', 'c2']],
  '62-cartao': ['l1', null, ['l2', 'l3']], '63-busca': ['busca', 'i1'], 'meses-01-janeiro': [null, null], 'notas-01-capa': ['titulo', 'corpo'],
  'rotina-01-capa': ['titulo', null], '79-planilha': ['l3', 'l1'], '80-aula': ['l3', 'l1'], '81-rabisco': ['l3', 'l1'], '82-quinta': ['l3', 'l1'],
}
for (const k of CARTOES) k.recebe = RECEBE[k.id]

export const CARTAO = Object.fromEntries(CARTOES.map((k) => [k.id, k]))
