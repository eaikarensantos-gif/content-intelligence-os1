# 🧪 Plugin Chrome - Teste Relatório

Plugin simples para adicionar dados de teste ao relatório de métricas com um clique!

## 📦 Instalação

### Passo 1: Abra o Chrome
Acesse: `chrome://extensions/`

### Passo 2: Ative Modo de Desenvolvedor
No canto superior direito, ative **"Modo de desenvolvedor"**

### Passo 3: Carregue o Plugin
- Clique em **"Carregar extensão sem empacotamento"**
- Navegue até: `/home/user/content-intelligence-os1/chrome-plugin`
- Clique em **"Selecionar Pasta"**

### Passo 4: Pronto!
O plugin aparecerá na barra de ferramentas do Chrome

## 🎯 Como Usar

### Opção 1: Carregar + Abrir Relatórios (Recomendado)
1. Clique no ícone do plugin
2. Clique em **"✅ Carregar Dados + Abrir Relatórios"**
3. Aguarde carregar automaticamente
4. A aba se abre na página de relatórios

### Opção 2: Apenas Carregar Dados
1. Clique no plugin
2. Clique em **"📥 Apenas Carregar Dados"**
3. Recarregue a página manualmente

## 📊 Dados que Serão Carregados

```
✓ 10 Posts Instagram
✓ 44,450 Impressões
✓ 7,423 Interações
✓ 15% Engajamento
✓ Todos os formatos (Reels, Stories, Posts)
```

## 🔧 Estrutura do Plugin

```
chrome-plugin/
├── manifest.json     (Configuração do plugin)
├── popup.html        (Interface visual)
├── popup.js          (Lógica)
└── README.md         (Este arquivo)
```

## ⚠️ Requisitos

- Chrome 88+
- App rodando em `http://localhost:5173`
- Modo de Desenvolvedor ativado

## 🐛 Troubleshooting

### "App não está aberto em localhost:5173"
→ Certifique-se de que o servidor está rodando:
```bash
npm run dev
```

### Plugin não aparece na barra
→ Clique com botão direito na barra e selecione "Fixar"

### Dados não carregam
→ Abra o Console (F12) e verifique se há erros

## 📝 Notas

- O plugin salva dados em `localStorage`
- Para remover dados, limpe o cache do navegador
- O plugin é seguro (apenas lê/escreve localStorage)
