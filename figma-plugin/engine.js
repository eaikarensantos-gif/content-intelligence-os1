import { templates, FILE_KEY, PAGE_ID } from '../src/lib/figmaCarousel/catalog'
import { validateJob } from '../src/lib/figmaCarousel/job'

// The adapter is injected so the same assembly is exercised in Figma and tests.
export async function assemble(figma, input) {
  const job = validateJob(input)
  if (figma.fileKey && figma.fileKey !== FILE_KEY) throw new Error('Abra o arquivo original da biblioteca antes de montar.')
  const page = await figma.getNodeByIdAsync(PAGE_ID)
  if (!page || page.type !== 'PAGE') throw new Error('Página de templates não encontrada.')
  await figma.setCurrentPageAsync(page)
  const sources = new Map()
  const fonts = new Map()
  for (const slide of job.slides) {
    const template = templates.find(t => t.id === slide.templateId)
    if (sources.has(template.id)) continue
    const source = await figma.getNodeByIdAsync(template.nodeId)
    if (!source || source.type !== 'COMPONENT' || source.width !== 1080 || source.height !== 1350) throw new Error(`Template alterado ou indisponível: ${template.name}.`)
    for (const field of Object.values(template.fields)) {
      if (source.componentPropertyDefinitions[field.property]?.type !== 'TEXT') throw new Error(`Campo alterado em ${template.name}. Atualize o catálogo.`)
    }
    for (const text of source.findAllWithCriteria({ types: ['TEXT'] })) {
      for (const segment of text.getStyledTextSegments(['fontName'])) fonts.set(JSON.stringify(segment.fontName), segment.fontName)
    }
    sources.set(template.id, source)
  }
  // No mutation until all required fonts have loaded. Never substitute fonts.
  for (const font of fonts.values()) {
    try { await figma.loadFontAsync(font) } catch { throw new Error(`Fonte indisponível: ${font.family} ${font.style}. Instale a fonte original.`) }
  }
  const right = Math.max(0, ...page.children.map(n => n.x + n.width))
  const created = []
  const issues = []
  try {
    for (const [index, slide] of job.slides.entries()) {
      const template = templates.find(t => t.id === slide.templateId)
      const source = sources.get(template.id)
      const instance = source.createInstance()
      created.push(instance)
      page.appendChild(instance)
      instance.x = right + 200 + index * 1160
      instance.y = 0
      instance.name = `${job.title.slice(0, 100)} / ${String(index + 1).padStart(2, '0')}`
      const before = instance.findAllWithCriteria({ types: ['TEXT'] }).map(n => ({ id: n.id, w: n.width, h: n.height, text: n.characters }))
      const props = Object.fromEntries(Object.entries(template.fields).map(([key, field]) => [field.property, slide.fields[key]]))
      instance.setProperties(props)
      // Conservative fit contract: do not expand any text beyond its original box.
      // This prevents shifting absolute decorations; larger copy must be reviewed.
      for (const text of instance.findAllWithCriteria({ types: ['TEXT'] })) {
        const original = before.find(n => n.id === text.id)
        if (!original || text.characters === original.text) continue
        const b = text.absoluteBoundingBox, outer = instance.absoluteBoundingBox
        if (text.width > original.w + 1 || text.height > original.h + 1 ||
            b.x < outer.x - 1 || b.y < outer.y - 1 || b.x + b.width > outer.x + outer.width + 1 || b.y + b.height > outer.y + outer.height + 1) {
          issues.push({ slide: index + 1, nodeId: text.id, field: text.name, message: 'Texto excede a área original. Revise o roteiro antes de exportar.' })
        }
      }
    }
    return { createdNodeIds: created.map(n => n.id), issues }
  } catch (error) {
    for (const node of created) node.remove()
    throw error
  }
}
