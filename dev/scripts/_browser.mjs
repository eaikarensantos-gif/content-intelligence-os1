// Caminho do Chromium dos smoke tests. CHROMIUM_PATH tem prioridade; depois /usr/bin/chromium
// (ambiente de desenvolvimento); sem nenhum dos dois, o Playwright usa o navegador que ele mesmo instalou
// (`npx playwright install chromium`, como na CI).
import { existsSync } from 'node:fs'

export const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
