#!/bin/bash
# Script para adicionar dados de teste ao localStorage e abrir a página

# Criar dados de teste em JSON
cat > /tmp/seed-data.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Adicionar Dados de Teste - Relatórios</title>
    <script>
        // Dados de teste
        const testMetrics = [
            { id: 'm1', post_id: 'p1', platform: 'instagram', date: '2024-04-10', impressions: 5200, reach: 3500, likes: 450, comments: 85, shares: 25, saves: 120, link_clicks: 340 },
            { id: 'm2', post_id: 'p2', platform: 'instagram', date: '2024-04-11', impressions: 2100, reach: 1800, likes: 280, comments: 35, shares: 8, saves: 45, link_clicks: 85 },
            { id: 'm3', post_id: 'p3', platform: 'instagram', date: '2024-04-12', impressions: 8900, reach: 7200, likes: 920, comments: 180, shares: 95, saves: 310, link_clicks: 520 },
            { id: 'm4', post_id: 'p4', platform: 'instagram', date: '2024-04-13', impressions: 4500, reach: 3800, likes: 520, comments: 110, shares: 45, saves: 180, link_clicks: 250 },
            { id: 'm5', post_id: 'p5', platform: 'instagram', date: '2024-04-14', impressions: 3200, reach: 2900, likes: 320, comments: 60, shares: 15, saves: 90, link_clicks: 120 },
            { id: 'm6', post_id: 'p6', platform: 'instagram', date: '2024-04-15', impressions: 7100, reach: 5900, likes: 750, comments: 145, shares: 85, saves: 250, link_clicks: 420 },
            { id: 'm7', post_id: 'p7', platform: 'instagram', date: '2024-04-16', impressions: 950, reach: 820, likes: 85, comments: 12, shares: 3, saves: 15, link_clicks: 45 },
            { id: 'm8', post_id: 'p8', platform: 'instagram', date: '2024-04-16', impressions: 6200, reach: 5100, likes: 680, comments: 125, shares: 55, saves: 220, link_clicks: 380 },
            { id: 'm9', post_id: 'p9', platform: 'instagram', date: '2024-04-16', impressions: 3800, reach: 3200, likes: 420, comments: 75, shares: 35, saves: 140, link_clicks: 190 },
            { id: 'm10', post_id: 'p10', platform: 'instagram', date: '2024-04-16', impressions: 2500, reach: 2100, likes: 280, comments: 50, shares: 20, saves: 85, link_clicks: 110 }
        ]

        const testPosts = [
            { id: 'p1', title: '5 Dicas de Instagram', format: 'Reel', hook_type: 'problem', platform: 'instagram' },
            { id: 'p2', title: 'Like se você ama', format: 'Static', hook_type: 'engagement', platform: 'instagram' },
            { id: 'p3', title: 'Trending Sound', format: 'Reel', hook_type: 'curiosity', platform: 'instagram' },
            { id: 'p4', title: 'Carrossel Educativo', format: 'Carousel', hook_type: 'education', platform: 'instagram' },
            { id: 'p5', title: 'Story com Enquete', format: 'Story', hook_type: 'engagement', platform: 'instagram' },
            { id: 'p6', title: 'Conteúdo de Valor', format: 'Reel', hook_type: 'solution', platform: 'instagram' },
            { id: 'p7', title: 'Meme Viral', format: 'Static', hook_type: 'humor', platform: 'instagram' },
            { id: 'p8', title: 'Tutorial Rápido', format: 'Reel', hook_type: 'education', platform: 'instagram' },
            { id: 'p9', title: 'Depoimento', format: 'Static', hook_type: 'social-proof', platform: 'instagram' },
            { id: 'p10', title: 'Call to Action', format: 'Carousel', hook_type: 'cta', platform: 'instagram' }
        ]

        function seedData() {
            // Salvar no localStorage (simular o Zustand store)
            localStorage.setItem('metrics', JSON.stringify(testMetrics))
            localStorage.setItem('posts', JSON.stringify(testPosts))
            
            document.querySelector('.status').innerHTML = `
                <div style="background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin: 10px 0;">
                    <strong style="color: #059669;">✅ Dados adicionados com sucesso!</strong><br>
                    <span style="color: #047857;">
                        • 10 posts<br>
                        • 10 métricas do Instagram<br>
                        • Engajamento médio: 15%<br>
                        • Total de impressões: 44,450<br>
                    </span>
                </div>
            `
            
            document.querySelector('.action').innerHTML = `
                <a href="http://localhost:5173/reports" style="display: inline-block; background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    → Abrir Relatórios (http://localhost:5173/reports)
                </a>
            `
        }
    </script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; }
        h1 { color: #1f2937; }
        .status { min-height: 60px; }
        .action { margin-top: 20px; }
        button { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
        button:hover { background: #2563eb; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🧪 Adicionar Dados de Teste</h1>
    <p>Clique no botão abaixo para carregar 10 posts com métricas de Instagram no app:</p>
    
    <button onclick="seedData()" style="font-size: 18px; padding: 15px 30px;">
        ✅ Carregar Dados de Teste
    </button>
    
    <div class="status"></div>
    <div class="action"></div>

    <hr style="margin: 30px 0;">
    
    <h3>📋 O que será carregado:</h3>
    <ul>
        <li><strong>10 Posts</strong> variados (Reels, Static, Stories, Carousels)</li>
        <li><strong>10 Métricas</strong> do Instagram com engajamento real</li>
        <li><strong>Engajamento Total:</strong> 7,423 interações</li>
        <li><strong>Alcance Total:</strong> 44,450 impressões</li>
        <li><strong>Taxa Média:</strong> 15% (acima do benchmark 3%)</li>
    </ul>

    <h3>📱 Próximos passos:</h3>
    <ol>
        <li>Clique em "Carregar Dados de Teste"</li>
        <li>Abra <code>http://localhost:5173/reports</code> ou clique no botão</li>
        <li>Explore os gráficos e insights interativos</li>
        <li>Teste os filtros (Posts vs Stories)</li>
        <li>Customize a identidade visual</li>
    </ol>

    <h3>🎯 O que ver no relatório:</h3>
    <ul>
        <li>✓ Top 10 posts por engajamento</li>
        <li>✓ Bottom 5 posts</li>
        <li>✓ Conteúdos que mais converteram</li>
        <li>✓ Horários mais ativos</li>
        <li>✓ Gráficos interativos (hover para mais info)</li>
        <li>✓ Insights estratégicos com recomendações</li>
        <li>✓ Plano de ação para próximo mês</li>
        <li>✓ Demografia da audiência</li>
    </ul>
</body>
</html>
EOF

echo "📄 Arquivo criado: /tmp/seed-data.html"
echo ""
echo "Instruções para testar:"
echo "1. Abra este arquivo em seu navegador:"
echo "   file:///tmp/seed-data.html"
echo ""
echo "2. Clique em 'Carregar Dados de Teste'"
echo ""
echo "3. Abra o app em outro aba:"
echo "   http://localhost:5173"
echo ""
echo "4. Clique em 'Relatórios' no menu ou vá para:"
echo "   http://localhost:5173/reports"
