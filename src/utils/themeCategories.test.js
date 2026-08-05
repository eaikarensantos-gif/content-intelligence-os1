import { describe, it, expect } from 'vitest'
import {
  WORK_CATEGORIES,
  PERSONAL_CATEGORIES,
  migrateWorkCategory,
  categorizeWorkTheme,
  categorizePersonalTheme,
  categorizeTheme,
  WORK_NICHE,
} from './themeCategories'

describe('categorias de trabalho seguem os pilares do teste', () => {
  it('são exatamente os quatro pilares', () => {
    expect(WORK_CATEGORIES).toEqual([
      'Negócio & estrutura', 'IA crítica', 'Celular & operação', 'Identidade',
    ])
  })

  it('não sobrou nenhuma categoria do posicionamento antigo', () => {
    const antigas = ['Carreira', 'Maturidade Profissional', 'Tomada de Decisão', 'Dinâmicas Corporativas', 'IA e Futuro do Trabalho']
    antigas.forEach((c) => expect(WORK_CATEGORIES).not.toContain(c))
  })

  it('trabalho e vida não compartilham categoria', () => {
    WORK_CATEGORIES.forEach((c) => expect(PERSONAL_CATEGORIES).not.toContain(c))
  })
})

describe('migração dos temas já salvos', () => {
  it('as categorias antigas viram pilares, nenhum tema fica órfão', () => {
    expect(migrateWorkCategory('Carreira')).toBe('Negócio & estrutura')
    expect(migrateWorkCategory('Maturidade Profissional')).toBe('Negócio & estrutura')
    expect(migrateWorkCategory('Tomada de Decisão')).toBe('Negócio & estrutura')
    expect(migrateWorkCategory('Dinâmicas Corporativas')).toBe('Negócio & estrutura')
    expect(migrateWorkCategory('IA e Futuro do Trabalho')).toBe('IA crítica')
  })

  it('toda categoria migrada existe na lista nova', () => {
    ;['Carreira', 'Maturidade Profissional', 'Tomada de Decisão', 'Dinâmicas Corporativas', 'IA e Futuro do Trabalho']
      .forEach((c) => expect(WORK_CATEGORIES).toContain(migrateWorkCategory(c)))
  })

  it('categoria já nova passa intacta', () => {
    WORK_CATEGORIES.forEach((c) => expect(migrateWorkCategory(c)).toBe(c))
  })
})

describe('classificação de tema de trabalho', () => {
  it('manda os ângulos da grade para o pilar certo', () => {
    const casos = [
      ['O que dá pra resolver do negócio pelo celular antes das 9h', 'Celular & operação'],
      ['Um fluxo de IA no celular do início ao fim, com print de cada passo', 'Celular & operação'],
      ['Qual promessa de ferramenta de IA não se paga em negócio pequeno', 'IA crítica'],
      ['Checklist de decisão antes de contratar qualquer ferramenta de IA', 'IA crítica'],
      ['Ser a única pessoa negra na sala e ter a ideia repetida', 'Identidade'],
      ['Por que parei de vender hora e passei a vender escopo fixo', 'Negócio & estrutura'],
      ['O cliente que pede "só um ajustinho" na sexta 18h', 'Negócio & estrutura'],
    ]
    casos.forEach(([tema, esperado]) => {
      expect(categorizeWorkTheme(tema), tema).toBe(esperado)
    })
  })

  it('IA dentro do celular é operação, não crítica de ferramenta', () => {
    expect(categorizeWorkTheme('usar IA no celular pra fechar proposta')).toBe('Celular & operação')
    expect(categorizeWorkTheme('a assinatura de IA que não se paga')).toBe('IA crítica')
  })

  it('celular como cena do dia não é celular como ferramenta de operação', () => {
    // Estes cinco tinham caído em "Celular & operação" e falam do aparelho no
    // cotidiano — nenhum ensina a operar um negócio com ele.
    const cenas = [
      'Reunião começou e celular no silencioso',
      'Notificação do trabalho às 23h no pessoal',
      'Dois chips: um pro trampo, um pra mim',
      'Print de conversa enviado para o grupo errado',
      'Bateria acabando em plena ligação com cliente',
    ]
    cenas.forEach((t) => {
      expect(categorizeWorkTheme(t), t).not.toBe('Celular & operação')
    })
  })

  it('aparelho só entra na categoria quando vem com operação do negócio', () => {
    const operacao = [
      'Fechar proposta inteira do celular',
      'Cobrar e acompanhar recebimento sem abrir o notebook',
      'Gestão do estoque pelo celular',
      'Governança de acesso e senha do negócio no aplicativo',
      'Rodar a produtividade da semana pelo celular',
      'Emitir nota fiscal pelo app',
    ]
    operacao.forEach((t) => {
      expect(categorizeWorkTheme(t), t).toBe('Celular & operação')
    })
  })

  it('identidade tem prioridade sobre negócio e ferramenta', () => {
    expect(categorizeWorkTheme('cobrar preço certo sendo a única mulher negra na concorrência')).toBe('Identidade')
    expect(categorizeWorkTheme('ancestralidade como método de trabalho')).toBe('Identidade')
  })

  it('o padrão é negócio & estrutura, não carreira', () => {
    expect(categorizeWorkTheme('qualquer coisa sem palavra-chave')).toBe('Negócio & estrutura')
    expect(categorizeWorkTheme('')).toBe('Negócio & estrutura')
    expect(categorizeWorkTheme(null)).toBe('Negócio & estrutura')
  })

  it('sempre devolve uma categoria que existe', () => {
    ;['preço', 'ia', 'celular', 'negra', 'nada disso'].forEach((t) => {
      expect(WORK_CATEGORIES).toContain(categorizeWorkTheme(t))
    })
  })
})

describe('classificação de tema pessoal continua intacta', () => {
  it('mantém as gavetas da vida', () => {
    expect(categorizePersonalTheme('a Naomi decide o dia dela antes de mim')).toBe('Naomi')
    expect(categorizePersonalTheme('jogo de búzios')).toBe('Fé')
    expect(categorizePersonalTheme('achados da shopee')).toBe('Comprinhas & Achados')
    expect(categorizePersonalTheme('qualquer outra coisa')).toBe('Vida')
  })

  it('sempre devolve categoria pessoal válida', () => {
    ;['naomi', 'terreiro', 'faxina', 'livro', 'saudade'].forEach((t) => {
      expect(PERSONAL_CATEGORIES).toContain(categorizePersonalTheme(t))
    })
  })
})

describe('categorizeTheme escolhe o banco pela persona', () => {
  it('ancestralidade é Fé na vida e Identidade no trabalho', () => {
    expect(categorizeTheme('ancestralidade', true)).toBe('Fé')
    expect(categorizeTheme('ancestralidade', false)).toBe('Identidade')
  })
})

describe('nicho declarado para o modelo', () => {
  it('descreve o público novo e nega o antigo', () => {
    expect(WORK_NICHE).toMatch(/negócio pequeno/)
    expect(WORK_NICHE).toMatch(/PJ e autônomo/)
    expect(WORK_NICHE).toMatch(/celular/)
    expect(WORK_NICHE).toMatch(/não é audiência corporativa/)
  })

  it('não declara mais o nicho antigo', () => {
    expect(WORK_NICHE).not.toMatch(/Maturidade Profissional/)
    expect(WORK_NICHE).not.toMatch(/corporativa sênior/)
  })
})
