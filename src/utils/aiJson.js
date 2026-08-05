// Centralized parsing of JSON embedded in AI (Anthropic) text responses.
//
// AI models often wrap JSON in prose or markdown fences and occasionally emit
// trailing commas. These helpers extract the first JSON object/array from the
// raw text, repair the most common issues, and parse it — surfacing a friendly,
// user-facing error instead of a raw `SyntaxError` when the response is broken.

const INVALID_MSG = 'Resposta inválida da IA'
const TRUNCATED_MSG = 'A resposta da IA ficou grande demais e foi cortada antes de terminar. Tente novamente — se persistir, use um texto de entrada mais curto.'

// Repairs trailing commas, e.g. `[1, 2, ]` or `{ "a": 1, }`.
function repairTrailingCommas(json) {
  return json.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}')
}

function parseOrThrow(candidate, message) {
  try {
    return JSON.parse(repairTrailingCommas(candidate))
  } catch {
    throw new Error(message)
  }
}

// Extracts and parses the first JSON object (`{ ... }`) found in `text`.
export function extractJsonObject(text, message = INVALID_MSG) {
  const match = (text || '').match(/\{[\s\S]*\}/)
  if (!match) throw new Error(message)
  return parseOrThrow(match[0], message)
}

// Extracts and parses the first JSON array (`[ ... ]`) found in `text`.
export function extractJsonArray(text, message = INVALID_MSG) {
  const match = (text || '').match(/\[[\s\S]*\]/)
  if (!match) throw new Error(message)
  return parseOrThrow(match[0], message)
}

// The #1 cause of "Expected ',' or ']' after array element" and similar
// JSON.parse failures on AI output is silent truncation: the model hit
// max_tokens mid-response, so the text looks complete up to wherever
// generation stopped — a regex `\{[\s\S]*\}` still finds a closing brace
// (the last one the model managed to emit, belonging to some inner object)
// and hands JSON.parse a string whose outer array/object was never closed.
// The resulting SyntaxError is technically accurate but meaningless to a
// user. Checking `stop_reason` catches this before the confusing error even
// happens, so it can be reported for what it is.
export function assertNotTruncated(data, message = TRUNCATED_MSG) {
  if (data?.stop_reason === 'max_tokens') throw new Error(message)
}
