import { describe, it, expect } from 'vitest'
import {
  WORK_CATEGORIES,
  PERSONAL_CATEGORIES,
  migrateWorkCategory,
  categorizeWorkTheme,
  categorizePersonalTheme,
  categorizeTheme,
  tokenize,
  isCltFramed,
  WORK_CATEGORY_BRIEF,
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

describe('palavra inteira, não pedaço de palavra', () => {
  it('não confunde pedaço de palavra no banco de trabalho', () => {
    const casos = [
      // "racia" casava dentro de burocracia, meritocracia, democracia
      ['A burocracia de abrir CNPJ sozinho', 'Negócio & estrutura'],
      ['O mito da meritocracia no mercado', 'Negócio & estrutura'],
      ['Democracia na decisão com sócio', 'Negócio & estrutura'],
      // "assinatura" e "ferramenta" sozinhas não são crítica de IA
      ['Assinatura de contrato com cliente novo', 'Negócio & estrutura'],
      ['Que ferramenta uso pra emitir nota fiscal', 'Negócio & estrutura'],
    ]
    casos.forEach(([tema, esperado]) => expect(categorizeWorkTheme(tema), tema).toBe(esperado))
  })

  it('"ia" verbo não é a sigla IA', () => {
    expect(categorizeWorkTheme('O cliente que ia fechar e sumiu')).toBe('Negócio & estrutura')
    expect(categorizeWorkTheme('Eu ia mandar a proposta na sexta')).toBe('Negócio & estrutura')
    // com contexto de ferramenta, aí sim
    expect(categorizeWorkTheme('Usar IA pra responder cliente')).toBe('IA crítica')
    expect(categorizeWorkTheme('O que eu gero com IA hoje')).toBe('IA crítica')
  })

  it('assinatura e ferramenta contam quando o contexto é de ferramenta', () => {
    expect(categorizeWorkTheme('A assinatura mensal que eu cancelei')).toBe('IA crítica')
    expect(categorizeWorkTheme('Vale a pena contratar essa ferramenta')).toBe('IA crítica')
  })

  it('não confunde pedaço de palavra no banco de vida', () => {
    const casos = [
      ['Ninguém me compreende quando falo disso', 'Vida'],   // "compr" em compreende
      ['Competência não é tudo', 'Vida'],                     // "pet" em competência
      ['Casaco novo que comprei', 'Comprinhas & Achados'],    // "casa" em casaco
      ['Petiscos no fim de semana', 'Hobbies & Gostos'],      // "pet" em petisco não é a Naomi
    ]
    casos.forEach(([tema, esperado]) => expect(categorizePersonalTheme(tema), tema).toBe(esperado))
  })

  it('"fé" com acento é reconhecida — \\b do JS não enxerga letra acentuada', () => {
    expect(categorizePersonalTheme('fé em dia difícil')).toBe('Fé')
    expect(categorizePersonalTheme('minha fé')).toBe('Fé')
    // e café não vira fé por causa da terminação
    expect(categorizePersonalTheme('Tomar café na padaria')).toBe('Hobbies & Gostos')
  })

  it('tokenize quebra por letra, respeitando acento', () => {
    expect(tokenize('Fé, ancestralidade — e negócio!')).toEqual(['fé', 'ancestralidade', 'e', 'negócio'])
    expect(tokenize('')).toEqual([])
    expect(tokenize(null)).toEqual([])
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

describe('tema de rotina CLT — o que sobrou do posicionamento antigo', () => {
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

  it('não confunde tema de dono de negócio com tema de empregado', () => {
    const dono = [
      'Reajustar preço com cliente antigo',
      'O cliente que pede "só um ajustinho" na sexta 18h',
      'Parar de vender hora e passar a vender escopo fixo',
      'Cliente âncora que é metade do faturamento',
      'A burocracia de abrir CNPJ sozinho',
      'Fechar proposta inteira do celular',
      'Ser a única pessoa negra na sala',
    ]
    dono.forEach((t) => expect(isCltFramed(t), t).toBe(false))
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

  it('a descrição de negócio & estrutura fala do lugar de dono, não de empregado', () => {
    const brief = WORK_CATEGORY_BRIEF['Negócio & estrutura']
    expect(brief).toMatch(/dono/)
    expect(brief).toMatch(/nunca de quem é empregado/)
    expect(brief).toMatch(/quem não tem chefe/)          // define por contraste, não convida a falar de chefe
    expect(brief).not.toMatch(/promoção|plano de carreira/)
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
