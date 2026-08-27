import { describe, it, expect } from 'vitest'
import {
  WORK_CATEGORIES,
  PERSONAL_CATEGORIES,
  migrateWorkCategory,
  migratePersonalCategory,
  categorizeWorkTheme,
  categorizePersonalTheme,
  categorizeTheme,
  tokenize,
  isCltFramed,
  WORK_CATEGORY_BRIEF,
  WORK_NICHE,
} from './themeCategories'

describe('categorias de trabalho seguem o posicionamento atual', () => {
  it('são exatamente os quatro pilares do módulo de Posicionamento', () => {
    expect(WORK_CATEGORIES).toEqual([
      'Critério de decisão', 'Desmonte de hype', 'Bastidor de estrategista', 'Camada humana',
    ])
  })

  it('não sobrou nenhuma categoria de posicionamento anterior', () => {
    const antigas = [
      'Carreira', 'Maturidade Profissional', 'Tomada de Decisão', 'Dinâmicas Corporativas', 'IA e Futuro do Trabalho',
      'Negócio & estrutura', 'IA crítica', 'Celular & operação', 'Identidade',
    ]
    antigas.forEach((c) => expect(WORK_CATEGORIES).not.toContain(c))
  })

  it('trabalho e vida não compartilham categoria', () => {
    WORK_CATEGORIES.forEach((c) => expect(PERSONAL_CATEGORIES).not.toContain(c))
  })
})

describe('migração dos temas já salvos', () => {
  it('categorias do posicionamento original viram pilares atuais', () => {
    expect(migrateWorkCategory('Carreira')).toBe('Critério de decisão')
    expect(migrateWorkCategory('Maturidade Profissional')).toBe('Critério de decisão')
    expect(migrateWorkCategory('Tomada de Decisão')).toBe('Critério de decisão')
    expect(migrateWorkCategory('Dinâmicas Corporativas')).toBe('Critério de decisão')
    expect(migrateWorkCategory('IA e Futuro do Trabalho')).toBe('Desmonte de hype')
  })

  it('categorias do teste de 6 semanas viram pilares atuais', () => {
    expect(migrateWorkCategory('Negócio & estrutura')).toBe('Critério de decisão')
    expect(migrateWorkCategory('IA crítica')).toBe('Desmonte de hype')
    expect(migrateWorkCategory('Celular & operação')).toBe('Critério de decisão')
    expect(migrateWorkCategory('Identidade')).toBe('Camada humana')
  })

  it('toda categoria migrada existe na lista nova', () => {
    ;[
      'Carreira', 'Maturidade Profissional', 'Tomada de Decisão', 'Dinâmicas Corporativas', 'IA e Futuro do Trabalho',
      'Negócio & estrutura', 'IA crítica', 'Celular & operação', 'Identidade',
    ].forEach((c) => expect(WORK_CATEGORIES).toContain(migrateWorkCategory(c)))
  })

  it('categoria já nova passa intacta', () => {
    WORK_CATEGORIES.forEach((c) => expect(migrateWorkCategory(c)).toBe(c))
  })

  it('categorias pessoais antigas recebem os nomes editoriais novos', () => {
    expect(migratePersonalCategory('Naomi')).toBe('Vida com Naomi')
    expect(migratePersonalCategory('Casa & Rotina')).toBe('A vida dentro de casa')
    expect(migratePersonalCategory('Fé')).toBe('Fé na vida real')
    expect(migratePersonalCategory('Comprinhas & Achados')).toBe('Achados que valem a pena')
    expect(migratePersonalCategory('Hobbies & Gostos')).toBe('Meu repertório particular')
    expect(migratePersonalCategory('Vida')).toBe('Ser adulta é isso?')
  })
})

describe('classificação de tema de trabalho', () => {
  it('manda os ângulos pro pilar certo', () => {
    const casos = [
      ['O que pesa mais numa decisão: dado, instinto ou precedente', 'Critério de decisão'],
      ['Checklist de decisão antes de contratar qualquer ferramenta de IA', 'Desmonte de hype'],
      ['Qual promessa de ferramenta de IA não se paga', 'Desmonte de hype'],
      ['A reunião onde a decisão foi tomada', 'Bastidor de estrategista'],
      ['O rascunho antes do slide bonito', 'Bastidor de estrategista'],
      ['Ser a única pessoa negra na sala e ter a ideia repetida', 'Camada humana'],
      ['Autoridade construída sem performar o que não é seu', 'Camada humana'],
    ]
    casos.forEach(([tema, esperado]) => {
      expect(categorizeWorkTheme(tema), tema).toBe(esperado)
    })
  })

  it('identidade e camada humana têm prioridade sobre os outros pilares', () => {
    expect(categorizeWorkTheme('cobrar preço certo sendo a única mulher negra na concorrência')).toBe('Camada humana')
    expect(categorizeWorkTheme('ancestralidade como método de decisão')).toBe('Camada humana')
  })

  it('o padrão é critério de decisão', () => {
    expect(categorizeWorkTheme('qualquer coisa sem palavra-chave')).toBe('Critério de decisão')
    expect(categorizeWorkTheme('')).toBe('Critério de decisão')
    expect(categorizeWorkTheme(null)).toBe('Critério de decisão')
  })

  it('sempre devolve uma categoria que existe', () => {
    ;['preço', 'ia', 'bastidor', 'negra', 'hype', 'nada disso'].forEach((t) => {
      expect(WORK_CATEGORIES).toContain(categorizeWorkTheme(t))
    })
  })
})

describe('palavra inteira, não pedaço de palavra', () => {
  it('não confunde pedaço de palavra no banco de trabalho', () => {
    const casos = [
      // "racia" casava dentro de burocracia, meritocracia, democracia
      ['A burocracia de abrir CNPJ sozinho', 'Critério de decisão'],
      ['O mito da meritocracia no mercado', 'Critério de decisão'],
      ['Democracia na decisão com sócio', 'Critério de decisão'],
      // "assinatura" e "ferramenta" sozinhas não são desmonte de hype
      ['Assinatura de contrato com cliente novo', 'Critério de decisão'],
      ['Que ferramenta uso pra emitir nota fiscal', 'Critério de decisão'],
    ]
    casos.forEach(([tema, esperado]) => expect(categorizeWorkTheme(tema), tema).toBe(esperado))
  })

  it('"ia" verbo não é a sigla IA', () => {
    expect(categorizeWorkTheme('O cliente que ia fechar e sumiu')).toBe('Critério de decisão')
    expect(categorizeWorkTheme('Eu ia mandar a proposta na sexta')).toBe('Critério de decisão')
    // com contexto de ferramenta, aí sim vira desmonte de hype
    expect(categorizeWorkTheme('Usar IA pra responder cliente')).toBe('Desmonte de hype')
    expect(categorizeWorkTheme('O que eu gero com IA hoje')).toBe('Desmonte de hype')
  })

  it('assinatura e ferramenta contam quando o contexto é de ferramenta', () => {
    expect(categorizeWorkTheme('A assinatura mensal que eu cancelei')).toBe('Desmonte de hype')
    expect(categorizeWorkTheme('Vale a pena contratar essa ferramenta')).toBe('Desmonte de hype')
  })

  it('não confunde pedaço de palavra no banco de vida', () => {
    const casos = [
      ['Ninguém me compreende quando falo disso', 'Ser adulta é isso?'],
      ['Competência não é tudo', 'Ser adulta é isso?'],
      ['Casaco novo que comprei', 'Achados que valem a pena'],
      ['Petiscos no fim de semana', 'Meu repertório particular'],
    ]
    casos.forEach(([tema, esperado]) => expect(categorizePersonalTheme(tema), tema).toBe(esperado))
  })

  it('"fé" com acento é reconhecida — \\b do JS não enxerga letra acentuada', () => {
    expect(categorizePersonalTheme('fé em dia difícil')).toBe('Fé na vida real')
    expect(categorizePersonalTheme('minha fé')).toBe('Fé na vida real')
    // e café não vira fé por causa da terminação
    expect(categorizePersonalTheme('Tomar café na padaria')).toBe('Meu repertório particular')
  })

  it('tokenize quebra por letra, respeitando acento', () => {
    expect(tokenize('Fé, ancestralidade — e negócio!')).toEqual(['fé', 'ancestralidade', 'e', 'negócio'])
    expect(tokenize('')).toEqual([])
    expect(tokenize(null)).toEqual([])
  })
})

describe('classificação de tema pessoal continua intacta', () => {
  it('classifica cenas humanizadas de home office na categoria própria', () => {
    expect(categorizePersonalTheme('A culpa por descansar estando perto do notebook')).toBe('Home Office')
    expect(categorizePersonalTheme('Rituais para separar a casa do trabalho remoto')).toBe('Home Office')
    expect(categorizePersonalTheme('Uma reunião que vai ser rápida adiou meu almoço')).toBe('Home Office')
  })

  it('mantém as gavetas da vida', () => {
    expect(categorizePersonalTheme('a Naomi decide o dia dela antes de mim')).toBe('Vida com Naomi')
    expect(categorizePersonalTheme('jogo de búzios')).toBe('Fé na vida real')
    expect(categorizePersonalTheme('achados da shopee')).toBe('Achados que valem a pena')
    expect(categorizePersonalTheme('qualquer outra coisa')).toBe('Ser adulta é isso?')
  })

  it('sempre devolve categoria pessoal válida', () => {
    ;['naomi', 'terreiro', 'faxina', 'livro', 'saudade'].forEach((t) => {
      expect(PERSONAL_CATEGORIES).toContain(categorizePersonalTheme(t))
    })
  })
})

describe('categorizeTheme escolhe o banco pela persona', () => {
  it('ancestralidade é Fé na vida real e Camada humana no trabalho', () => {
    expect(categorizeTheme('ancestralidade', true)).toBe('Fé na vida real')
    expect(categorizeTheme('ancestralidade', false)).toBe('Camada humana')
  })
})

describe('tema de rotina CLT — o que sobrou de posicionamento anterior', () => {
  it('reconhece tema escrito do lugar de empregado', () => {
    const clt = [
      'Pedir aumento e ter medo da resposta',
      'Ser promovido e não se sentir pronto',
      'Medo de ser demitido sem avisar',
      'Feedback que não muda nada mas precisa ser dado',
      'Gestor que pede autonomia mas controla tudo',
      'Síndrome do impostor em cargo de liderança',
      'Política de escritório que ninguém admite jogar',
      'Sentir que o mercado de trabalho passou por você',
    ]
    clt.forEach((t) => expect(isCltFramed(t), t).toBe(true))
  })

  it('não confunde tema de quem decide com tema de empregado', () => {
    const decide = [
      'Reajustar preço com cliente antigo',
      'O critério antes de fechar qualquer proposta',
      'A burocracia de abrir CNPJ sozinho',
      'A reunião onde a decisão foi tomada',
      'Ser a única pessoa negra na sala',
    ]
    decide.forEach((t) => expect(isCltFramed(t), t).toBe(false))
  })

  it('trata entrada vazia', () => {
    expect(isCltFramed('')).toBe(false)
    expect(isCltFramed(null)).toBe(false)
  })

  it('não casa pedaço de palavra', () => {
    // "vaga" é CLT, mas "divagar" e "vagarosa" não são
    expect(isCltFramed('Divagar sobre o preço certo')).toBe(false)
    expect(isCltFramed('Uma vaga aberta no time')).toBe(true)
  })
})

describe('descrição dos pilares para o modelo', () => {
  it('todo pilar tem descrição', () => {
    WORK_CATEGORIES.forEach((c) => {
      expect(WORK_CATEGORY_BRIEF[c], c).toBeTruthy()
    })
  })

  it('a descrição de critério de decisão fala do lugar de quem decide, não de empregado', () => {
    const brief = WORK_CATEGORY_BRIEF['Critério de decisão']
    expect(brief).toMatch(/quem decide/)
    expect(brief).not.toMatch(/promoção|plano de carreira/)
  })
})

describe('nicho declarado para o modelo', () => {
  it('descreve o público atual (founder + profissional) e nega o anterior', () => {
    expect(WORK_NICHE).toMatch(/founder/)
    expect(WORK_NICHE).toMatch(/topo de funil/)
    expect(WORK_NICHE).toMatch(/lógica de decisão/)
    expect(WORK_NICHE).toMatch(/não é criador de hype/)
  })

  it('não declara mais o nicho de posicionamento anterior', () => {
    expect(WORK_NICHE).not.toMatch(/negócio pequeno, PJ e autônomo/)
    expect(WORK_NICHE).not.toMatch(/Maturidade Profissional/)
  })
})
