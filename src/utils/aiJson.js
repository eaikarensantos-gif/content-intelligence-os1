// Centralized parsing of JSON embedded in AI (Anthropic) text responses.
//
// AI models often wrap JSON in prose or markdown fences and occasionally emit
// trailing commas. These helpers extract the first JSON object/array from the
// raw text, repair the most common issues, and parse it — surfacing a friendly,
// user-facing error instead of a raw `SyntaxError` when the response is broken.

const INVALID_MSG = 'Resposta inválida da IA'

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
