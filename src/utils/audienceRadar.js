// Radar de Audiência — score, tiers e merge de perfis (Instagram/LinkedIn).
// Espelha o contrato de dados da skill .claude/skills/radar-de-audiencia/
// (mesmos campos, mesma normalização de URL) para que um perfis.json
// coletado pelo Claude Code carregue direto aqui, e vice-versa.

export const DEFAULT_WEIGHTS = { decisor: 35, fit: 30, eng: 20, alcance: 15 }
export const DEFAULT_CUTS = { A: 75, B: 55, C: 35 }

export const AXIS_LABELS = {
  decisor: { label: 'Poder de decisão', hint: 'Cargo e senioridade. Decide compra de consultoria/mentoria?' },
  fit: { label: 'Fit de nicho', hint: 'O setor e o tipo de negócio batem com o que você resolve.' },
  eng: { label: 'Engajamento com você', hint: 'Curte, comenta, responde story, já mandou DM. Preenchido por você.' },
  alcance: { label: 'Alcance da pessoa', hint: 'Audiência e potencial de indicação, mesmo sem comprar.' },
}

export const ENG_MAP = { 0: 0, 1: 3, 2: 6.5, 3: 10 }
export const ENG_LABELS = { 0: '0 · nunca', 1: '1 · passivo', 2: '2 · curte', 3: '3 · comenta/DM' }

export const TIPOS = ['Cliente potencial', 'Parceiro', 'Amplificador', 'Par sênior', 'Audiência', 'Fora do perfil']

export const TIER_META = {
  A: { label: 'Contatar agora', color: 'emerald' },
  B: { label: 'Aquecer antes', color: 'amber' },
  C: { label: 'Observar', color: 'gray' },
  D: { label: 'Arquivo', color: 'gray' },
}

// ── Score e tier ─────────────────────────────────────────────────────────
export function scoreOf(row, weights = DEFAULT_WEIGHTS) {
  const total = weights.decisor + weights.fit + weights.eng + weights.alcance
  if (!total) return 0
  const e = ENG_MAP[row.eng] != null ? ENG_MAP[row.eng] : 3
  const raw =
    (row.decisor * weights.decisor + row.fit * weights.fit + e * weights.eng + row.alcance * weights.alcance) / total
  return Math.round(raw * 10)
}

export function tierOf(score, cuts = DEFAULT_CUTS) {
  if (score >= cuts.A) return 'A'
  if (score >= cuts.B) return 'B'
  if (score >= cuts.C) return 'C'
  return 'D'
}

// ── Normalização de link ────────────────────────────────────────────────
// Mesma regra da skill (scripts/merge_perfis.py: norm_url) — slug em
// minúsculo, barra final única. É o que garante que um perfis.json vindo
// da coleta bata com o que se classifica aqui na mão.
export function normalizeUrl(raw) {
  let s = String(raw || '').trim().replace(/[<>"']/g, '')
  if (!s) return null
  if (/^@[\w.]+$/.test(s)) return { url: `https://www.instagram.com/${s.slice(1).toLowerCase()}/`, origem: 'IG' }
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`
  let m = s.match(/linkedin\.com\/(in|company)\/([^/?#]+)/i)
  if (m) return { url: `https://www.linkedin.com/${m[1].toLowerCase()}/${m[2].toLowerCase()}/`, origem: 'LI' }
  m = s.match(/instagram\.com\/([^/?#]+)/i)
  if (m) {
    if (/^(p|reel|reels|explore|stories)$/i.test(m[1])) return null
    return { url: `https://www.instagram.com/${m[1].toLowerCase()}/`, origem: 'IG' }
  }
  return null
}

function clampAxis(v, dflt) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (Number.isNaN(n)) return dflt
  return Math.max(0, Math.min(10, n))
}

export function audienceProfileKey(row) {
  const k = row.url || (row.raw || row.nome ? `txt::${row.raw || row.nome}` : '')
  return k.toLowerCase().replace(/\/+$/, '')
}

// ── Normaliza um objeto cru (de perfis.json, IA, ou classificador local) ────
export function normalizeAudienceRow(o) {
  const u = o.url ? normalizeUrl(o.url) : null
  return {
    url: u ? u.url : o.url || '',
    raw: o.raw || '',
    nome: String(o.nome || '(sem nome)').slice(0, 80),
    handle: String(o.handle || '').slice(0, 50),
    cargo: String(o.cargo || '').slice(0, 80),
    empresa: String(o.empresa || '').slice(0, 80),
    setor: String(o.setor || '').slice(0, 50),
    seguidores: typeof o.seguidores === 'number' && !Number.isNaN(o.seguidores) ? o.seguidores : null,
    origem: o.origem || (u ? u.origem : '') || '—',
    decisor: clampAxis(o.decisor, 3),
    fit: clampAxis(o.fit, 3),
    alcance: clampAxis(o.alcance, 3),
    eng: o.eng >= 0 && o.eng <= 3 ? Math.round(o.eng) : 1,
    tipo: String(o.tipo || 'Audiência'),
    porque: String(o.porque || ''),
    evidencia: String(o.evidencia || ''),
    abordagem: String(o.abordagem || ''),
    coletado_em: String(o.coletado_em || ''),
    status_coleta: String(o.status_coleta || 'ok'),
  }
}

// ── Merge por URL, preservando o eng editado pela Karen ──────────────────
// Espelha scripts/merge_perfis.py: o eng que já existe na base sempre
// vence, a menos que o registro novo traga um eng explícito e válido
// (0-3) — só a coleta manual/edição na tabela faz isso.
export function mergeAudienceProfiles(existingRows, incomingRawRows) {
  const list = existingRows.map((r) => ({ ...r }))
  const idx = {}
  list.forEach((r, i) => {
    idx[audienceProfileKey(r)] = i
  })

  let novos = 0
  let atualizados = 0
  let engMantido = 0

  incomingRawRows.forEach((raw) => {
    const r = normalizeAudienceRow(raw)
    const k = audienceProfileKey(r)
    if (!k) return
    if (idx[k] != null) {
      const old = list[idx[k]]
      const engExplicito = raw.eng >= 0 && raw.eng <= 3
      if (!engExplicito) {
        if (old.eng !== r.eng) engMantido++
        r.eng = old.eng
      }
      list[idx[k]] = r
      atualizados++
    } else {
      list.push(r)
      idx[k] = list.length - 1
      novos++
    }
  })

  return { rows: list, novos, atualizados, engMantido }
}

// ── Classificador local (sem IA) — fallback pra base pequena e curada ─────
const SENIOR = [
  [/\b(founder|fundador[ae]?s?|ceo|s[óo]ci[oa]s?|don[oa]s?|propriet[áa]ri[oa]s?)\b/i, 10],
  [/\b(cto|cfo|coo|cmo|cpo|cio|chief|diretor[ae]?s?|vp|head)\b/i, 9],
  [/\b(gerente|manager|coordenador[ae]?s?|l[íi]der|tech lead|team lead)\b/i, 6.5],
  [/\b(consultor[ae]?s?|especialista|mentor[ae]?s?)\b/i, 6],
  [/\b(analista|assistente|est[áa]gi\w*|j[úu]nior|junior|freelanc\w*)\b/i, 3],
]
const FIT = [
  [
    /\b(ia|a\.?i\.?|intelig[êe]ncia artificial|automa[çc]\w*|dados|produto|opera[çc][õo]es|processos?|tecnologia|saas|fintech|startups?|ag[êe]ncia|consultoria|neg[óo]cios?|ind[úu]stria|log[íi]stica|b2b)\b/i,
    8,
  ],
  [/\b(marketing|design|ux|social media|conte[úu]do|e-?commerce|varejo|educa[çc][ãa]o|cx|vendas|rh)\b/i, 6],
  [/\b(estudante|curios[oa]|apaixonad\w*|aspirante)\b/i, 2],
]

function sniffLine(line) {
  const m = line.match(/\beng\s*:\s*([0-3])\b/i)
  let origem = ''
  if (/(^|[\s|—-])LI([\s|—-]|$)/i.test(line) || /linkedin/i.test(line)) origem = 'LI'
  if (/(^|[\s|—-])IG([\s|—-]|$)/i.test(line) || /instagram/i.test(line) || /@[a-z0-9._]+/i.test(line)) origem = origem || 'IG'
  return { eng: m ? parseInt(m[1], 10) : 1, origem: origem || '—' }
}

export function localClassifyLine(line) {
  let decisor = 4
  let fit = 4
  let alcance = 3
  let seguidores = null
  for (const [re, v] of SENIOR) {
    if (re.test(line)) {
      decisor = v
      break
    }
  }
  for (const [re, v] of FIT) {
    if (re.test(line)) {
      fit = v
      break
    }
  }
  const n = line.match(/([\d.,]+)\s*(k|mil|m)\b/i)
  if (n) {
    const v = parseFloat(n[1].replace(',', '.'))
    seguidores = n[2].toLowerCase() === 'm' ? v * 1e6 : v * 1e3
  } else {
    const p = line.match(/([\d.]+)\s*(seguidores|seg\b|conex)/i)
    if (p) seguidores = parseFloat(p[1].replace(/\./g, ''))
  }
  if (seguidores != null && !Number.isNaN(seguidores)) {
    alcance = seguidores >= 50000 ? 10 : seguidores >= 10000 ? 8 : seguidores >= 3000 ? 6 : seguidores >= 800 ? 4 : 2
  }
  const sn = sniffLine(line)
  return {
    raw: line,
    nome: line.split(/[|—\t]/)[0].trim().replace(/^@/, '') || '(sem nome)',
    handle: (line.match(/@[a-zA-Z0-9._]+/) || [''])[0],
    origem: sn.origem,
    eng: sn.eng,
    decisor,
    fit,
    alcance,
    seguidores,
    tipo: decisor >= 9 ? 'Cliente potencial' : alcance >= 8 ? 'Amplificador' : decisor >= 6 ? 'Par sênior' : 'Audiência',
    porque: 'Leitura local por palavra-chave, sem IA. Confira antes de agir.',
    status_coleta: 'manual',
  }
}

export function formatFollowers(n) {
  if (n == null) return ''
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace('.0', '')}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`
  return String(n)
}
