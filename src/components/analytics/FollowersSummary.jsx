import { useState } from 'react'
import useStore from '../../store/useStore'

const PLATFORMS = { instagram: 'Instagram', tiktok: 'TikTok', linkedin: 'LinkedIn', youtube: 'YouTube', twitter: 'X/Twitter', facebook: 'Facebook' }

export default function FollowersSummary() {
  const profile = useStore((s) => s.creatorProfile)
  const setProfile = useStore((s) => s.setCreatorProfile)
  const followers = profile.followersByPlatform || {}
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({})
  const entries = Object.entries(PLATFORMS).filter(([key]) => followers[key] !== '' && followers[key] != null && Number.isFinite(Number(followers[key])) && Number(followers[key]) >= 0)

  const save = (event) => {
    event.preventDefault()
    setProfile({ followersByPlatform: { ...followers, ...draft }, followersUpdatedAt: new Date().toISOString() })
    setEditing(false)
  }

  return (
    <section aria-labelledby="followers-heading" className="card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="followers-heading" className="text-sm font-semibold text-gray-900">Seguidores por rede</h2>
          <p className="text-sm text-gray-600">Preenchimento manual · {profile.followersUpdatedAt ? `atualizado em ${new Date(profile.followersUpdatedAt).toLocaleDateString('pt-BR')}` : 'data de atualização não registrada'}</p>
        </div>
        {!editing && <button type="button" onClick={() => { setDraft({ ...followers }); setEditing(true) }} className="btn-secondary min-h-11">{entries.length ? 'Editar seguidores' : 'Adicionar seguidores'}</button>}
      </div>
      {!editing && (entries.length ? (
        <dl className="flex flex-wrap gap-3">
          {entries.map(([key, label]) => <div key={key} className="rounded-lg bg-gray-50 px-3 py-2 border border-gray-200"><dt className="text-xs text-gray-600">{label}</dt><dd className="text-base font-semibold text-gray-900">{Number(followers[key]).toLocaleString('pt-BR')}</dd></div>)}
        </dl>
      ) : <p className="text-sm text-gray-600">Nenhum número informado. As métricas dos posts continuam disponíveis abaixo.</p>)}
      {editing && (
        <form onSubmit={save} className="space-y-3">
          <p className="text-sm text-gray-600">Deixe em branco as redes sem informação. Zero indica uma contagem conhecida.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(PLATFORMS).map(([key, label]) => <label key={key} className="text-sm text-gray-700">{label}<input type="number" min="0" step="1" className="input mt-1" value={draft[key] ?? ''} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value === '' ? '' : Number(event.target.value) }))} /></label>)}
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button><button type="submit" className="btn-primary">Salvar seguidores</button></div>
        </form>
      )}
    </section>
  )
}
