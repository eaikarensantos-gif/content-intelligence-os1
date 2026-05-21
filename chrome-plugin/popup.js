document.getElementById('titulo').textContent    = '\uD83E\uDDEA Teste Relat\u00F3rio';
document.getElementById('subtitulo').textContent = 'Clique para adicionar dados de teste e abrir os relat\u00F3rios.';
document.getElementById('b1').textContent        = '\u2705 Carregar Dados + Abrir Relat\u00F3rios';
document.getElementById('b2').textContent        = '\uD83D\uDCE5 Apenas Carregar Dados';
document.getElementById('l1').textContent        = 'Impress\u00F5es';
document.getElementById('l2').textContent        = 'Intera\u00E7\u00F5es';
document.getElementById('a1').textContent        = '\uD83D\uDCCA Dashboard';
document.getElementById('a2').textContent        = '\uD83D\uDCC8 Relat\u00F3rios';

var APP = 'http://localhost:5173';
var KEY = 'content-intelligence-os-v3';

var POSTS = [
  {id:'p1',title:'5 Dicas de Instagram',format:'Reel',platform:'instagram'},
  {id:'p2',title:'Like se voce ama',format:'Static',platform:'instagram'},
  {id:'p3',title:'Trending Sound',format:'Reel',platform:'instagram'},
  {id:'p4',title:'Carrossel Educativo',format:'Carousel',platform:'instagram'},
  {id:'p5',title:'Story com Enquete',format:'Story',platform:'instagram'},
  {id:'p6',title:'Conteudo de Valor',format:'Reel',platform:'instagram'},
  {id:'p7',title:'Meme Viral',format:'Static',platform:'instagram'},
  {id:'p8',title:'Tutorial Rapido',format:'Reel',platform:'instagram'},
  {id:'p9',title:'Depoimento',format:'Static',platform:'instagram'},
  {id:'p10',title:'Call to Action',format:'Carousel',platform:'instagram'}
];

var METRICS = [
  {id:'m1',post_id:'p1',platform:'instagram',date:'2024-04-10',impressions:5200,reach:3500,likes:450,comments:85,shares:25,saves:120,link_clicks:340},
  {id:'m2',post_id:'p2',platform:'instagram',date:'2024-04-11',impressions:2100,reach:1800,likes:280,comments:35,shares:8,saves:45,link_clicks:85},
  {id:'m3',post_id:'p3',platform:'instagram',date:'2024-04-12',impressions:8900,reach:7200,likes:920,comments:180,shares:95,saves:310,link_clicks:520},
  {id:'m4',post_id:'p4',platform:'instagram',date:'2024-04-13',impressions:4500,reach:3800,likes:520,comments:110,shares:45,saves:180,link_clicks:250},
  {id:'m5',post_id:'p5',platform:'instagram',date:'2024-04-14',impressions:3200,reach:2900,likes:320,comments:60,shares:15,saves:90,link_clicks:120},
  {id:'m6',post_id:'p6',platform:'instagram',date:'2024-04-15',impressions:7100,reach:5900,likes:750,comments:145,shares:85,saves:250,link_clicks:420},
  {id:'m7',post_id:'p7',platform:'instagram',date:'2024-04-16',impressions:950,reach:820,likes:85,comments:12,shares:3,saves:15,link_clicks:45},
  {id:'m8',post_id:'p8',platform:'instagram',date:'2024-04-17',impressions:6200,reach:5100,likes:680,comments:125,shares:55,saves:220,link_clicks:380},
  {id:'m9',post_id:'p9',platform:'instagram',date:'2024-04-18',impressions:3800,reach:3200,likes:420,comments:75,shares:35,saves:140,link_clicks:190},
  {id:'m10',post_id:'p10',platform:'instagram',date:'2024-04-19',impressions:2500,reach:2100,likes:280,comments:50,shares:20,saves:85,link_clicks:110}
];

function injetar(tab) {
  return chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: function(key, posts, metrics) {
      var ex = JSON.parse(localStorage.getItem(key) || '{}');
      var st = ex.state || {};
      st.posts   = (st.posts   || []).concat(posts);
      st.metrics = (st.metrics || []).concat(metrics);
      localStorage.setItem(key, JSON.stringify(Object.assign({}, ex, {state: st})));
    },
    args: [KEY, POSTS, METRICS]
  });
}

function showMsg(txt, tipo) {
  var el = document.getElementById('msg');
  el.textContent = txt;
  el.className = 'msg ' + tipo;
}

document.getElementById('b1').addEventListener('click', function() {
  var btn = document.getElementById('b1');
  btn.disabled = true;
  chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
    injetar(tabs[0]).then(function() {
      chrome.tabs.create({url: APP + '/reports'});
      showMsg('OK! Dados carregados.', 'ok');
      btn.disabled = false;
    }).catch(function(e) {
      showMsg('Erro: ' + e.message, 'err');
      btn.disabled = false;
    });
  });
});

document.getElementById('b2').addEventListener('click', function() {
  var btn = document.getElementById('b2');
  btn.disabled = true;
  chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
    injetar(tabs[0]).then(function() {
      showMsg('OK! Recarregue a pagina.', 'ok');
      btn.disabled = false;
    }).catch(function(e) {
      showMsg('Erro: ' + e.message, 'err');
      btn.disabled = false;
    });
  });
});
