// Fase 3 — busca/segmentação de contatos + exportação CSV. Sem UI ainda
// (mesmo padrão das fases anteriores) — chame direto via GET com query
// params.
//
// GET /api/contacts?tag=lead&field=plano&value=pro&activeOnly=true&format=csv
//   tag         — filtra contatos que têm essa tag
//   field/value — filtra por um campo customizado (ig_contacts.fields)
//   activeOnly  — true → só contatos com interação desde o início do mês
//                 corrente (definição de "ativo no mês", seção 3/8 do escopo)
//   format      — csv | json (padrão json)

import { getSupabaseServer } from '../src/lib/dmServer.js'
import { monthStartISO, contactsToCsv } from '../src/lib/dmContacts.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  let db
  try {
    db = getSupabaseServer()
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  const { tag, field, value, activeOnly, format } = req.query

  let query = db.from('ig_contacts').select('*').order('last_interaction_at', { ascending: false })
  if (tag) query = query.contains('tags', [tag])
  if (field && value !== undefined) query = query.eq(`fields->>${field}`, value)
  if (activeOnly === 'true') query = query.gte('last_interaction_at', monthStartISO())

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="contatos.csv"')
    return res.status(200).send(contactsToCsv(data))
  }

  return res.status(200).json({ contacts: data, count: data.length })
}
