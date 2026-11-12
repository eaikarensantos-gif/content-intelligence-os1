// Versões alternativas da capa de um post novo, ranqueadas pela nota que a grade teria com cada uma.
// Usa o navegador (renderiza e mede de verdade); a parte pura de decisão fica em ajusteDeCor.js e harmonia.js.
import { CORES } from '../marca'
import { avaliarLayouts } from '../avaliarLayouts'
import { idLayout } from '../layoutSuggestions'
import { miniaturaDoCard } from '../exportacaoArte'
import { podeTrocarFundo, variantePorFundo } from './ajusteDeCor'
import { projetarFundo } from './cor'
import { lerCorDeDataUrl } from './leitura'

const MELHORES_FUNDOS = 3

/**
 * item: { capa, formato, contador } do post novo; tile: o tile atual dele; notaCom(tile) vem de criarNotaCom.
 * renderizar(slide) devolve o elemento da arte em tamanho real. Devolve até `max` versões, da melhor nota para a pior:
 * { rotulo, slide, thumb, nota }, onde nota é a da grade inteira com aquela versão no lugar.
 */
export async function gerarVariantes({ item, tile, notaCom, renderizar, progresso = () => {}, max = 5 }) {
  const { capa, formato } = item
  const candidatos = []

  // Fundos: ranqueados pela projeção barata e só os melhores passam para a medição real.
  if (podeTrocarFundo(capa) && tile.energia != null) {
    const atual = CORES[capa.fundo].hex
    Object.keys(CORES)
      .map((id) => ({ id, slide: variantePorFundo(capa, id) }))
      .filter((c) => c.slide)
      .map((c) => ({ ...c, nota: notaCom(projetarFundo(tile, atual, CORES[c.id].hex)) }))
      .sort((a, b) => b.nota - a.nota)
      .slice(0, MELHORES_FUNDOS)
      .forEach((c) => candidatos.push({ rotulo: `Fundo ${CORES[c.id].nome}`, slide: c.slide }))
  }

  // Layouts: o avaliador já descarta o que corta ou sobrepõe texto na renderização real.
  progresso('Conferindo outros layouts…')
  try {
    const { opcoes } = await avaliarLayouts(capa, { formato, papel: 'capa' }, renderizar)
    for (const o of opcoes) if (o.id !== idLayout(capa)) candidatos.push({ rotulo: `Layout ${o.nome}`, slide: o.slide })
  } catch { /* sem layouts alternativos: ficam só os fundos */ }

  const versoes = []
  for (const [i, c] of candidatos.entries()) {
    progresso(`Medindo a cor da versão ${i + 1} de ${candidatos.length}…`)
    try {
      const thumb = await miniaturaDoCard(c.slide, 0, renderizar)
      const props = await lerCorDeDataUrl(thumb)
      if (props) versoes.push({ rotulo: c.rotulo, slide: c.slide, thumb, nota: notaCom({ ...tile, ...props }) })
    } catch { /* versão que não renderiza fica de fora */ }
  }
  return versoes.sort((a, b) => b.nota - a.nota).slice(0, max)
}
