import { FILE_KEY, CATALOG_VERSION, templates } from './catalog'

export function prepareJob(result) {
  const slides = (result.slides || []).map((slide, index, all) => {
    const template = templates[index === 0 ? 0 : index === all.length - 1 ? 4 : 1 + ((index - 1) % 3)]
    return { templateId: template.id, fields: template.role === 'body'
      ? { body: [slide.headline, slide.subtext].filter(Boolean).join('\n\n') }
      : { title: slide.headline || '', body: slide.subtext || '', ...(template.role === 'cover' ? { label: '01' } : {}) } }
  })
  return { schemaVersion: 1, catalogVersion: CATALOG_VERSION, fileKey: FILE_KEY, title: result.title || result.hook || 'Carrossel Content', slides }
}

export function validateJob(job) {
  if (!job || job.schemaVersion !== 1 || job.catalogVersion !== CATALOG_VERSION || job.fileKey !== FILE_KEY) throw new Error('Arquivo incompatível com esta biblioteca de templates.')
  if (typeof job.title !== 'string' || job.title.length > 500) throw new Error('Título inválido.')
  if (!Array.isArray(job.slides) || job.slides.length < 2 || job.slides.length > 30) throw new Error('Use entre 2 e 30 slides.')
  job.slides.forEach((slide, i) => {
    const template = templates.find(t => t.id === slide.templateId)
    if (!template || !slide.fields || typeof slide.fields !== 'object') throw new Error(`Slide ${i + 1}: template inválido.`)
    if (Object.keys(slide.fields).some(key => !template.fields[key])) throw new Error(`Slide ${i + 1}: campo não autorizado.`)
    for (const key of Object.keys(template.fields)) {
      if (typeof slide.fields[key] !== 'string' || slide.fields[key].length > 5000) throw new Error(`Slide ${i + 1}: campo ${key} inválido.`)
    }
  })
  return job
}

export function fitWarnings(job) {
  return job.slides.flatMap((slide, index) => {
    const template = templates.find(t => t.id === slide.templateId)
    return Object.entries(template.fields).filter(([key, field]) => slide.fields[key].length > field.budget)
      .map(([key, field]) => `Slide ${index + 1}: ${key} tem ${slide.fields[key].length} caracteres; referência do template: ${field.budget}.`)
  })
}
