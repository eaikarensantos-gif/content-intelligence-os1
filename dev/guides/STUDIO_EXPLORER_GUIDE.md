# Studio de Criação - Explorador Universal de Referências

## 🎯 O que foi implementado?

Um sistema completo de **busca, transcrição e remix de referências** integrado ao Studio de Criação. Agora você pode encontrar conteúdo viral de qualquer plataforma, transcrever e usá-lo como inspiração para criar roteiros que falam sobre esse conteúdo.

---

## 🚀 Como usar

### 1️⃣ Abrir o Explorador
Na página de **Criar Conteúdo**, você verá um **botão flutuante laranja com um raio** (⚡) no canto inferior direito.

Clique nele para abrir o painel lateral de busca.

### 2️⃣ Buscar Referências

O explorador traz **8 referências mock** de diferentes plataformas (TikTok, Instagram, YouTube, LinkedIn, X) e arquétipos.

Você pode:
- **Digitar** no campo de busca (busca por título ou autor)
- **Filtrar por Arquétipo:** Authority Speech, Corporate Absurd, Metaphorical Humor, Tech Edge
- **Filtrar por Plataforma:** TikTok, Instagram, YouTube, LinkedIn, X

### 3️⃣ Selecionar uma Referência

Clique em qualquer referência para selecioná-la. A referência aparecerá na seção **SELECIONADAS** no topo.

Você pode selecionar múltiplas referências de uma vez.

### 4️⃣ Transcrever e Remixar

Quando uma referência está selecionada, você pode:
- **Clicar no ícone de volume** para transcrever o áudio original
- **Copiar o crédito** automaticamente (vem com @autor)
- **Remover** a referência se mudar de ideia

### 5️⃣ Motor de Remix

Após transcrever, o sistema:
- ✅ Extrai o **transcript** do vídeo original
- ✅ Sugere **hooks** baseados no DNA da Karen (anti-coach, direto, crítico)
- ✅ Gera um **roteiro de reação** pronto para usar

**O roteiro inclui:**
- Hook de abertura
- Embed do vídeo original
- Reação técnica/analítica
- CTA
- Crédito automático do autor original

### 6️⃣ Usar o Roteiro Gerado

O roteiro é automaticamente inserido no campo de entrada principal do Studio.

Você pode:
- Editar/refinar antes de gerar
- Usar como base para gerar múltiplas versões
- Combinar com briefing da marca

---

## 📊 Arquétipos Suportados

### 👩‍💼 **Authority Speech**
Cortes de mulheres poderosas, atrizes, figuras públicas com tom reflexivo e mentor.
- Exemplo: "A mulher que questionou todo o processo seletivo"

### 🤖 **Corporate Absurd**
Processos seletivos, gírias de RH, dinâmicas excludentes com tom engraçado.
- Exemplo: "RH pedindo fit cultural para trabalho remoto"

### 🐕 **Metaphorical Humor**
Animais/contextos absurdos em situações profissionais.
- Exemplo: "Cachorro em reunião de 1:1 com seu gestor"

### ⚡ **Tech Edge**
Demos de IA, automações, inovações que geram impacto visual.
- Exemplo: "Claude 3 Opus rodando task de 5 horas em 30 segundos"

---

## 🎬 Fluxo Completo de Uso

```
1. Abrir Explorador (botão ⚡)
   ↓
2. Buscar/Filtrar referências
   ↓
3. Selecionar uma (clicar no card)
   ↓
4. Transcrever (ícone de volume)
   ↓
5. Ver hooks sugeridos + transcript
   ↓
6. Gerar roteiro de reação
   ↓
7. Roteiro aparece no input principal
   ↓
8. Refinar e gerar com a IA (Ctrl+Enter)
```

---

## 💡 DNA Translation

Todos os hooks sugeridos seguem o **padrão DNA da Karen**:

✅ **O que fazemos:**
- Abertura provocadora
- Crítica ao senso comum
- Reframing prático
- Ação/recomendação
- Validação (você não é o único)
- CTA engajador

❌ **O que NÃO fazemos:**
- Motivação baça
- Corporativismo vazio
- Superficialidade
- Julgamento moral
- Soluções simplistas
- Hype sem fundamento

---

## 📱 Plataformas Suportadas (Mock)

| Plataforma | Emoji | Engajamento | Uso Comum |
|-----------|-------|-------------|----------|
| **TikTok** | 📱 | 15-45% | Reels virais, trends |
| **Instagram** | 📷 | 8-12% | Carrosseis, Reels |
| **YouTube** | 📺 | 12-20% | Vídeos longos |
| **LinkedIn** | 💼 | 22%+ | Conteúdo profissional |
| **X/Twitter** | 𝕏 | 45%+ | Threads, takes rápidos |

> **Nota:** Atualmente usa dados mock. Para integração real, conectar com APIs de cada plataforma.

---

## 🔄 Drag-and-Drop (Futuro)

Você pode **arrastar referências** diretamente do painel para campos específicos de "Inspiração" (quando implementado).

---

## ⚙️ Arquitetura Técnica

### Componentes Criados

```
src/components/explorer/
├── ReferenceExplorer.jsx      (Componente principal - sidebar)
├── ReferenceSearch.jsx        (Busca + filtros)
├── ReferenceCard.jsx          (Card individual)
└── RemixEngine.jsx            (Motor de transcrição + remix)
```

### Integração

- Importado em `UnifiedCreator.jsx`
- Botão flutuante (fixed) no canto inferior direito
- Estado de inspiração sincronizado com input principal
- Badge visual quando inspiração está ativa

### Data Flow

```
ReferenceExplorer (pai)
├── ReferenceSearch (busca + filtros)
│   └── onSelect → ReferenceExplorer state
├── ReferenceCard (cards selecionadas)
│   └── onTranscribe → RemixEngine
└── RemixEngine (transcrição + hooks)
    └── onGenerateScript → UnifiedCreator.handleGenerateScriptFromReference
```

---

## 🎯 Próximos Passos (Implementação Real)

### 1. Integrar APIs Reais
- [ ] TikTok API (web scraping ou SDK)
- [ ] Instagram API (Graph API)
- [ ] YouTube API (Data API v3)
- [ ] LinkedIn API
- [ ] Twitter/X API (v2)

### 2. Implementar Transcrição Real
- [ ] Integrar Whisper API (OpenAI)
- [ ] Ou Google Cloud Speech-to-Text
- [ ] Ou AssemblyAI

### 3. Melhorar Detecção de Arquétipo
- [ ] Classifier baseado em embeddings (vector search)
- [ ] Training com exemplos da Karen
- [ ] Feedback loop para melhorar

### 4. Features Avançadas
- [ ] Salvar referências favoritas
- [ ] Histórico de referências consultadas
- [ ] Análise de performance de referências
- [ ] Sugestão automática baseada em DNAAnalytics

---

## 🧪 Dados Mock Inclusos

8 referências pré-carregadas com:
- Thumbnail (imagem placeholder)
- Autor (@username)
- Arquétipo classificado
- Engagement rate simulado
- Transcrição/resposta sugerida

Todos os dados estão em `ReferenceSearch.jsx` (MOCK_REFERENCES).

---

## 📌 Notas Importantes

1. **Crédito Automático:** Todos os roteiros incluem crédito do autor original com @user
2. **Anti-Clichê:** O sistema filtra automaticamente criadores "coach" (futuro: via ML)
3. **Tone Guard:** O "Anti-Generic Style Linter" valida hooks contra o padrão Karen
4. **Smart Selection:** Pode selecionar múltiplas referências, mas remix funciona com uma de cada vez

---

## 🎨 UX Details

### Visual Feedback
- ⚡ Botão laranja flutuante (fácil de encontrar)
- 🟠 Sidebar animada (slide in/out)
- ✨ Cards com hover effects
- 📍 Badge "Inspirado em referência" no header

### Accessibility
- Inputs acessíveis (focus states)
- Tooltips em hover
- Teclado navegável (tabs, Enter)
- Textos descritivos em tudo

### Performance
- Search é instant (client-side)
- Transcrição é simulada (1.5s)
- Geração de roteiro é simulada (2s)
- Sidebar é modal (não resizable)

---

## 📖 Como Estender

### Adicionar Novo Arquétipo

1. Editar `ARCHETYPES` em `ReferenceSearch.jsx`
2. Adicionar cores em `ReferenceCard.jsx` (archetypeColors)
3. Adicionar transcript template em `RemixEngine.jsx` (TRANSCRIPT_TEMPLATES)
4. Adicionar hooks em `RemixEngine.jsx` (HOOK_SUGGESTIONS)

### Adicionar Mais Referências

Editar `MOCK_REFERENCES` em `ReferenceSearch.jsx`:

```javascript
{
  id: 'ref-9',
  platform: 'instagram',
  archetype: 'authority-speech',
  title: 'Seu título aqui',
  author: 'seu_usuario',
  thumbnail: 'url_da_imagem',
  likes: 123,
  comments: 45,
  engagementRate: 12.3,
}
```

---

## 🐛 Troubleshooting

### Explorador não aparece?
- Verifique se está na rota `/create`
- Limpe cache do navegador
- Verifique console para erros

### Roteiro não aparece no input?
- Clique em "Gerar Roteiro de Reação" no RemixEngine
- Verifique se selecionou um hook
- Check console para erros

### Transcrição não funciona?
- É simulada (1.5s de delay)
- Clique em "Transcrever áudio original"
- Aguarde completar antes de gerar roteiro

---

## 📞 Suporte

Esta é uma feature **MVP (Minimum Viable Product)** com dados mock.

Para feedback ou problemas, checke os componentes em `src/components/explorer/`.
