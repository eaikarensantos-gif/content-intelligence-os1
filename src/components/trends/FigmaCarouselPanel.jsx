import { useMemo, useState } from 'react'
import { FILE_KEY, templates } from '../../lib/figmaCarousel/catalog'
import { prepareJob, validateJob, fitWarnings } from '../../lib/figmaCarousel/job'

export default function FigmaCarouselPanel({ result }) {
  const initial = useMemo(() => prepareJob(result), [result])
  const [edited, setEdited] = useState(null)
  const job = edited?.source === initial ? edited.job : initial
  const [error, setError] = useState('')
  const warnings = fitWarnings(job)
  function change(index, key, value) {
    setEdited({ source: initial, job: { ...job, slides: job.slides.map((s, i) => i === index ? { ...s, fields: { ...s.fields, [key]: value } } : s) } })
  }
  function download() {
    try {
      validateJob(job)
      const url = URL.createObjectURL(new Blob([JSON.stringify(job, null, 2)], { type: 'application/json' }))
      const a = document.createElement('a'); a.href = url; a.download = 'carrossel-figma.json'; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000); setError('')
    } catch (e) { setError(e.message) }
  }
  return <section className="card p-4 space-y-4">
    <h3 className="font-semibold">Montar com meus templates do Figma</h3>
    <p className="text-sm text-gray-500">Minha própria marca · 5 componentes originais. Revise os campos abaixo, baixe o roteiro e importe no plugin Content Carousel no Figma. Fontes, fotos e composição vêm dos componentes.</p>
    <p className="text-xs text-gray-500">As fotos originais serão mantidas. Os limites de caracteres são estimativas; o plugin confere o espaço real e bloqueia a exportação quando o texto excede a área validada.</p>
    <details><summary className="cursor-pointer text-sm">Revisar campos dos {job.slides.length} slides</summary>
      <div className="grid gap-3 mt-3 md:grid-cols-2">{job.slides.map((slide, index) => <fieldset className="border rounded-lg p-3 space-y-2" key={index}>
        <legend className="text-xs">{index + 1}. {templates.find(t => t.id === slide.templateId).name}</legend>
        {Object.entries(slide.fields).map(([key, value]) => <label className="block text-xs" key={key}>
          {{ title: 'Título', body: 'Texto', label: 'Etiqueta' }[key]}
          <textarea className="input w-full mt-1" value={value} onChange={e => change(index, key, e.target.value)} />
        </label>)}
      </fieldset>)}</div>
    </details>
    {warnings.length > 0 && <details className="text-sm text-amber-700"><summary>{warnings.length} campos precisam de revisão de tamanho</summary><ul>{warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    {error && <p role="alert">{error}</p>}
    <div className="flex flex-wrap gap-3 text-sm">
      <button className="btn-primary" onClick={download}>Baixar roteiro para Figma</button>
      <a className="btn-ghost" href={`https://www.figma.com/design/${FILE_KEY}?node-id=238-4`} target="_blank" rel="noreferrer">Abrir biblioteca no Figma</a>
      <a className="btn-ghost" href="/figma-carousel-plugin.zip" download>Baixar plugin</a>
    </div>
    <p className="text-xs text-gray-500">Primeiro uso: extraia o plugin e, no Figma desktop, importe o manifest.json pelo menu Plugins → Development → Import plugin from manifest.</p>
  </section>
}
