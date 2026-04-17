# 🧪 GUIA DE TESTE - Relatório Dinâmico

## ⚡ Quick Start (3 passos)

### **Passo 1: Inicie o servidor**
```bash
cd /home/user/content-intelligence-os1
npm run dev
```
Você verá:
```
  ➜  Local:   http://localhost:5173/
```

### **Passo 2: Abra o arquivo de teste no Chrome**
Abra este arquivo no navegador:
```
add-test-data.html
```

Ou clique aqui se o arquivo estiver na raiz do projeto.

### **Passo 3: Carregue os dados e acesse o relatório**

1. Clique no botão **"✅ Carregar Dados Agora"**
2. Você verá a mensagem: **"Dados carregados com sucesso!"**
3. Clique no botão **"🎯 Abrir Relatórios"**
4. A página de relatórios vai abrir com todos os gráficos e dados

---

## 📊 O que você vai ver

### Quando carregar a página `/reports`:

#### **1. Customização de Identidade Visual** 
- Expanda "Identidade Visual"
- Mude a cor primária com o color picker
- Veja as mudanças em tempo real em todos os gráficos

#### **2. KPIs Principais** (4 cards)
```
📊 Total de Impressões: 44,450
📈 Engajamento Médio: 15.7%
❤️ Total de Curtidas: 4,705
💾 Total de Salvamentos: 1,455
```

#### **3. Seletor de Plataforma**
- Clique em "Todos" (padrão)
- Selecione "Instagram" para filtrar

#### **4. Filtro de Tipo**
- **Todos**: mostra Posts + Stories
- **Posts**: apenas posts estáticos e carrosséis
- **Stories**: apenas stories

#### **5. Gráficos Interativos**
- **Timeline**: Passe o mouse sobre a linha para ver detalhes
- **Gênero**: Gráfico de pizza (mulher 65%, homem 35%)
- **Cidades**: São Paulo (28%), Rio (18%), etc
- **Faixa Etária**: Gráfico de barras por idade
- **Horários**: Top 5 horários de maior engajamento

#### **6. Top 10 Posts**
```
1. Trending Sound - 1,505 engajamentos (16.9%)
   → Clique no link externo para ir ao Instagram
2. Conteúdo de Valor - 1,230 engajamentos (17.3%)
3. Tutorial Rápido - 1,080 engajamentos (17.4%)
...
```

#### **7. Bottom 5 Posts**
Os 5 posts com menor engajamento

#### **8. Mais Convertidos**
Posts ordenados por cliques em links

#### **9. Insights Estratégicos** (Seção com cards coloridos)
```
📊 Formato Dominante
   "O formato 'Reel' é seu melhor desempenho..."
   Ação: "Aumente produção de Reels para 60%"

🎯 Hook com Maior Impacto
   "Posts com hook de educação geram mais..."
   
⚠️ Engajamento (caso houvesse baixo)
   Ou ✨ Alto Engajamento (status atual)
   "15.7% está acima do benchmark de 3%"

💾 Conteúdo Salvável
   "2.4% do alcance está salvando posts"
   
🔗 Taxa de Cliques
   "0.88% do alcance clicou em links"
```

#### **10. Plano de Ação - Próximo Mês**
```
1️⃣ Aumente Reels para 60% do mix
   Semana 1-2

2️⃣ Teste novos horários de posting
   Semana 1-4

3️⃣ Intensifique CTAs nos próximos posts
   Semana 2-3

4️⃣ Analise e replique top 3 conteúdo
   Semana 3-4

5️⃣ Agendar reunião de planejamento
   Semana 4
```

---

## 🎮 Elementos Interativos

### Hover nos Gráficos
- Passe o mouse sobre as linhas/barras para ver valores exatos
- Cards pop-up com detalhes aparecem automaticamente

### Botões de Filtro
- Clique para alternar entre Posts/Stories
- Relatório atualiza instantaneamente

### Customização de Marca
- Clique em "Identidade Visual" para expandir
- Mude cor, font, logo, empresa
- As mudanças são refletidas no PDF simulado

### Links para Instagram
- Cada post tem um ícone de link externo
- Clica e abre o post no Instagram (simulado com IDs)

---

## 📈 Dados de Teste Inclusos

### 10 Posts Variados:
1. **5 Dicas de Instagram** (Reel) - Hook: Problem
2. **Like se você ama** (Static) - Hook: Engagement
3. **Trending Sound** (Reel) - Hook: Curiosity ⭐ TOP
4. **Carrossel Educativo** (Carousel) - Hook: Education
5. **Story com Enquete** (Story) - Hook: Engagement
6. **Conteúdo de Valor** (Reel) - Hook: Solution ⭐ TOP
7. **Meme Viral** (Static) - Hook: Humor
8. **Tutorial Rápido** (Reel) - Hook: Education ⭐ TOP
9. **Depoimento** (Static) - Hook: Social Proof
10. **Call to Action** (Carousel) - Hook: CTA

### Métricas Totais:
- **Impressões**: 44,450
- **Alcance**: 34,300
- **Curtidas**: 4,705
- **Comentários**: 869
- **Shares**: 381
- **Saves**: 1,455
- **Link Clicks**: 2,460
- **Engajamento Médio**: 15.7%

---

## ✅ Checklist de Teste

### Visual
- [ ] Página carrega sem erros
- [ ] Identidade visual se customiza
- [ ] Gráficos aparecem com dados
- [ ] Cores correspondem à marca customizada

### Funcionalidades
- [ ] Seletor de plataforma funciona
- [ ] Filtro Posts/Stories funciona
- [ ] Hover nos gráficos mostra detalhes
- [ ] Links externos funcionam

### Conteúdo
- [ ] Top 10 está correto (maior engajamento)
- [ ] Bottom 5 está correto (menor engajamento)
- [ ] Insights aparecem
- [ ] Recomendações aparecem
- [ ] Demografia mostra 5 cidades

### Responsividade
- [ ] Desktop: Tudo visível
- [ ] Tablet: Layout adapta
- [ ] Mobile: Scrollable, sem quebras

---

## 🐛 Se der erro

### Erro: "Nenhuma métrica registrada ainda"
→ Clique em "✅ Carregar Dados Agora" no arquivo HTML

### Erro: "Nenhuma métrica encontrada para esta plataforma"
→ Clique em "Todas as Plataformas"

### Gráficos em branco
→ Atualizar a página (F5)

### localStorage limpo
→ Executar novamente o arquivo de teste

---

## 📱 URLs Rápidas

- **Dashboard**: http://localhost:5173/
- **Relatórios**: http://localhost:5173/reports
- **Analytics**: http://localhost:5173/analytics
- **Arquivo Teste**: file:///home/user/content-intelligence-os1/add-test-data.html

---

## 🎯 Resumo

✅ **Teste Completo**: Clique → Carregue → Abra → Explore
✅ **10 Posts com Dados Reais**
✅ **Gráficos Interativos**
✅ **Insights Automáticos**
✅ **Plano de Ação Gerado**
✅ **Customização de Marca**

**Tempo Total**: ~5 minutos
