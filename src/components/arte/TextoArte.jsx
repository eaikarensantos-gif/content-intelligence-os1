import { useRef } from 'react'

/** Enter e o botão inserem a mesma quebra, preservada no rascunho e na arte. */
export default function TextoArte({ value, onChange, style, ...props }) {
  const campo = useRef(null)
  const quebrar = () => {
    const el = campo.current
    const inicio = el.selectionStart
    const fim = el.selectionEnd
    onChange({ target: { value: value.slice(0, inicio) + '\n' + value.slice(fim) } })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(inicio + 1, inicio + 1)
    })
  }
  return (
    <span className="block">
      <textarea {...props} ref={campo} value={value} onChange={onChange} style={{ minHeight: '6rem', ...style }} />
      <span className="flex flex-wrap items-center justify-between gap-2 mt-1 text-xs">
        <span className="text-gray-500">Toque antes da palavra que deve ir para a próxima linha. Depois use Enter ou o botão.</span>
        <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={quebrar} className="min-h-11 px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-800">Quebrar linha</button>
      </span>
    </span>
  )
}
