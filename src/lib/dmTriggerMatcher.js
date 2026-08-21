// Decide se um evento normalizado (dmWebhookEvents.js) bate com uma regra de
// gatilho (tabela ig_trigger_rules). Função pura, sem I/O — testável isolada,
// como pede o masterprompt (seção 6, regra 5).
//
// 'first_message' é resolvido só parcialmente aqui: esta função confirma que
// o evento é do tipo certo, mas "é a primeira mensagem do contato" depende
// do banco (ver checagem extra em api/instagramWebhook.js).
export function matchTrigger(rule, event) {
  if (!rule.active) return false
  if (rule.event_type !== event.type) return false

  switch (rule.match_mode) {
    case 'any_comment_on_post':
      return event.type === 'comment' && !!rule.post_id && event.mediaId === rule.post_id

    case 'keyword_exact': {
      const text = (event.text || '').trim().toLowerCase()
      return text === (rule.match_value || '').trim().toLowerCase()
    }

    case 'keyword_partial': {
      const text = (event.text || '').toLowerCase()
      const keyword = (rule.match_value || '').toLowerCase()
      return !!keyword && text.includes(keyword)
    }

    case 'first_message':
      return event.type === 'message'

    default:
      return false
  }
}

export function findMatchingRule(rules, event) {
  return rules.find((rule) => matchTrigger(rule, event)) || null
}
