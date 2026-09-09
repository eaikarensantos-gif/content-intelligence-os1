import { useState, useRef, useEffect } from 'react'
import {
  X, Plus, Trash2, Upload, Loader2, AlertCircle, LayoutTemplate,
  AlignLeft, AlignCenter, Sun, Moon, Pencil,
} from 'lucide-react'
import useStore from '../../store/useStore'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

const BUCKET = 'cio-media'
const LIGHT = '#ffffff'
const DARK = '#1a1a1a'

const DEFAULT_HEADLINE_ZONE = { xPct: 8, yPct: 30, wPct: 84, hPct: 32, color: LIGHT, align: 'left' }
const DEFAULT_SUBTEXT_ZONE = { xPct: 8, yPct: 64, wPct: 84, hPct: 18, color: LIGHT, align: 'left' }

function isLight(color) {
  return color === LIGHT || /255,\s*255,\s*255/.test(color || '')
}

// ─── Draggable/resizable zone box over the background preview ──────────────
function ZoneBox({ label, zone, onChange, containerRef }) {
  const [drag, setDrag] = useState(null)

  const startDrag = (e, mode) => {
    e.stopPropagation()
    e.preventDefault()
    setDrag({ mode, startX: e.clientX, startY: e.clientY, start: { ...zone } })
  }

  useEffect(() => {
    if (!drag) return
    const handleMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const dxPct = ((e.clientX - drag.startX) / rect.width) * 100
      const dyPct = ((e.clientY - drag.startY) / rect.height) * 100
      if (drag.mode === 'move') {
        const xPct = Math.min(Math.max(drag.start.xPct + dxPct, 0), 100 - drag.start.wPct)
        const yPct = Math.min(Math.max(drag.start.yPct + dyPct, 0), 100 - drag.start.hPct)
        onChange({ xPct, yPct })
      } else {
        const wPct = Math.min(Math.max(drag.start.wPct + dxPct, 10), 100 - drag.start.xPct)
        const hPct = Math.min(Math.max(drag.start.hPct + dyPct, 6), 100 - drag.start.yPct)
        onChange({ wPct, hPct })
      }
    }
    const handleUp = () => setDrag(null)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [drag])

  return (
    <div
      onPointerDown={(e) => startDrag(e, 'move')}
      className="absolute border-2 border-dashed border-orange-400 bg-orange-400/10 cursor-move touch-none"
      style={{ left: `${zone.xPct}%`, top: `${zone.yPct}%`, width: `${zone.wPct}%`, height: `${zone.hPct}%` }}
    >
      <span className="absolute -top-5 left-0 text-[9px] font-semibold text-orange-600 bg-white/90 px-1 rounded whitespace-nowrap">{label}</span>
      <div
        onPointerDown={(e) => startDrag(e, 'resize')}
        className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-orange-500 rounded-full cursor-nwse-resize border-2 border-white shadow touch-none"
      />
    </div>
  )
}

// ─── One background + its two text zones ────────────────────────────────────
function BackgroundEditor({ bg, onChange, onRemove }) {
  const containerRef = useRef(null)
  const updateZone = (key, updates) => onChange({ ...bg, [key]: { ...bg[key], ...updates } })

  const ZONE_LABELS = { headline: 'Título', subtext: 'Subtexto' }

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-500">Slide de fundo</p>
        <button onClick={onRemove} className="p-1 hover:bg-red-50 rounded" title="Remover este fundo">
          <Trash2 size={13} className="text-gray-300 hover:text-red-500" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="relative w-full max-w-[220px] mx-auto aspect-[4/5] rounded-lg overflow-hidden bg-gray-900 select-none"
      >
        <img
          src={bg.imageUrl}
          alt="Fundo do template"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
        <ZoneBox label="Título" zone={bg.headline} onChange={(u) => updateZone('headline', u)} containerRef={containerRef} />
        <ZoneBox label="Subtexto" zone={bg.subtext} onChange={(u) => updateZone('subtext', u)} containerRef={containerRef} />
      </div>
      <p className="text-[10px] text-gray-400 text-center">
        Arraste as caixas pra posicionar · puxe o ponto do canto pra redimensionar
      </p>

      <div className="grid grid-cols-2 gap-3">
        {['headline', 'subtext'].map((key) => (
          <div key={key} className="space-y-1.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase">{ZONE_LABELS[key]}</p>
            <div className="flex gap-1">
              <button
                onClick={() => updateZone(key, { color: LIGHT })}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                  isLight(bg[key].color) ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'
                }`}
              ><Sun size={10} /> Claro</button>
              <button
                onClick={() => updateZone(key, { color: DARK })}
                className={`flex-1 flex items-center justify-center gap-1 text-[10px] px-2 py-1 rounded border transition-colors ${
                  !isLight(bg[key].color) ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'
                }`}
              ><Moon size={10} /> Escuro</button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => updateZone(key, { align: 'left' })}
                className={`flex-1 flex items-center justify-center text-[10px] px-2 py-1 rounded border transition-colors ${
                  bg[key].align !== 'center' ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'
                }`}
              ><AlignLeft size={11} /></button>
              <button
                onClick={() => updateZone(key, { align: 'center' })}
                className={`flex-1 flex items-center justify-center text-[10px] px-2 py-1 rounded border transition-colors ${
                  bg[key].align === 'center' ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500'
                }`}
              ><AlignCenter size={11} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Create/edit form for one template ───────────────────────────────────────
function TemplateForm({ template, onSave, onCancel }) {
  const [name, setName] = useState(template?.name || '')
  const [backgrounds, setBackgrounds] = useState(template?.backgrounds || [])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleUpload = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Envie um arquivo de imagem (JPG ou PNG).')
      return
    }
    if (!isSupabaseConfigured()) {
      setError('Configure o Supabase em Configurações — é usado para hospedar as imagens dos seus templates.')
      return
    }
    setUploading(true)
    setError(null)
    try {
      const supabase = getSupabase()
      const path = `templates/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
      })
      if (uploadError) {
        throw new Error(`Falha ao hospedar a imagem (bucket "${BUCKET}"): ${uploadError.message}. Crie um bucket público com esse nome no seu projeto Supabase (Storage → New bucket → Public bucket) se ainda não existir.`)
      }
      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
      if (!publicUrlData?.publicUrl) throw new Error('Não foi possível obter a URL pública da imagem.')

      setBackgrounds((prev) => [...prev, {
        imageUrl: publicUrlData.publicUrl,
        headline: { ...DEFAULT_HEADLINE_ZONE },
        subtext: { ...DEFAULT_SUBTEXT_ZONE },
      }])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const updateBackground = (idx, next) =>
    setBackgrounds((prev) => prev.map((b, i) => (i === idx ? next : b)))

  const removeBackground = (idx) =>
    setBackgrounds((prev) => prev.filter((_, i) => i !== idx))

  const canSave = name.trim() && backgrounds.length > 0

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nome do template</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Ex: "Identidade laranja", "Capa escura + slides claros"'
          className="input mt-1 w-full text-sm"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Fundos ({backgrounds.length})
          </label>
          <button
            onClick={() => !uploading && inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition-all disabled:opacity-50"
          >
            {uploading ? <><Loader2 size={11} className="animate-spin" /> Enviando...</> : <><Upload size={11} /> Adicionar fundo</>}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { handleUpload(e.target.files?.[0]); e.target.value = '' }}
          />
        </div>
        <p className="text-[10px] text-gray-400 mb-3">
          Suba as imagens de fundo já com a sua identidade visual (Canva, Figma, PDF exportado como imagem...). O carrossel gerado alterna entre os fundos que você adicionar aqui, na ordem em que aparecem.
        </p>

        {backgrounds.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
            <LayoutTemplate size={22} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Nenhum fundo adicionado ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {backgrounds.map((bg, i) => (
              <BackgroundEditor
                key={i}
                bg={bg}
                onChange={(next) => updateBackground(i, next)}
                onRemove={() => removeBackground(i)}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
        <button onClick={onCancel} className="btn-ghost text-xs border border-gray-200">Cancelar</button>
        <button
          onClick={() => onSave({ name: name.trim(), backgrounds })}
          disabled={!canSave}
          className="btn-primary text-xs disabled:opacity-40"
        >
          Salvar template
        </button>
      </div>
    </div>
  )
}

// ─── Main modal: list of templates + create/edit ─────────────────────────────
export default function CarouselTemplateManager({ onClose }) {
  const carouselTemplates = useStore((s) => s.carouselTemplates)
  const addCarouselTemplate = useStore((s) => s.addCarouselTemplate)
  const updateCarouselTemplate = useStore((s) => s.updateCarouselTemplate)
  const deleteCarouselTemplate = useStore((s) => s.deleteCarouselTemplate)

  const [editingId, setEditingId] = useState(null) // null = list view, 'new' = criando, id = editando
  const editingTemplate = editingId && editingId !== 'new'
    ? carouselTemplates.find((t) => t.id === editingId)
    : null

  const handleSave = (data) => {
    if (editingId === 'new') addCarouselTemplate(data)
    else updateCarouselTemplate(editingId, data)
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <LayoutTemplate size={18} className="text-orange-500" />
            <h2 className="text-sm font-bold text-gray-900">
              {editingId ? (editingId === 'new' ? 'Novo template visual' : 'Editar template') : 'Meus templates visuais'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {editingId ? (
            <TemplateForm
              template={editingTemplate}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => setEditingId('new')}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-4 text-sm font-medium text-gray-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all"
              >
                <Plus size={16} /> Novo template
              </button>

              {carouselTemplates.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  Nenhum template cadastrado ainda. Crie um com os fundos da sua identidade visual pra gerar carrosséis prontos automaticamente.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {carouselTemplates.map((t) => (
                    <div key={t.id} className="border border-gray-200 rounded-xl overflow-hidden group">
                      <div className="aspect-[4/5] bg-gray-100 relative">
                        {t.backgrounds?.[0]?.imageUrl && (
                          <img src={t.backgrounds[0].imageUrl} alt={t.name} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => setEditingId(t.id)}
                            className="p-2 bg-white rounded-lg hover:bg-gray-100"
                            title="Editar"
                          >
                            <Pencil size={14} className="text-gray-700" />
                          </button>
                          <button
                            onClick={() => deleteCarouselTemplate(t.id)}
                            className="p-2 bg-white rounded-lg hover:bg-red-50"
                            title="Excluir"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p>
                        <p className="text-[10px] text-gray-400">{t.backgrounds?.length || 0} fundo(s)</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
