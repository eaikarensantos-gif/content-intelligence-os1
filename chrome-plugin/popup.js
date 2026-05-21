var pageData = null;
var clipType = 'article';

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('t-article').addEventListener('click', function() { setType('article'); });
  document.getElementById('t-full_page').addEventListener('click', function() { setType('full_page'); });
  document.getElementById('t-selection').addEventListener('click', function() { setType('selection'); });
  document.getElementById('save-btn').addEventListener('click', saveClip);
});

function setType(t) {
  clipType = t;
  ['article', 'full_page', 'selection'].forEach(function(id) {
    var el = document.getElementById('t-' + id);
    if (el) el.className = 'type-btn' + (id === t ? ' active' : '');
  });
  var prev = document.getElementById('selection-preview');
  if (t === 'selection' && pageData && pageData.selectedText) {
    prev.textContent = '"' + pageData.selectedText.slice(0, 200) + (pageData.selectedText.length > 200 ? '...' : '') + '"';
    prev.style.display = 'block';
  } else {
    prev.style.display = 'none';
  }
}

function showMsg(txt, tipo) {
  var el = document.getElementById('msg');
  el.textContent = txt;
  el.className = 'msg ' + tipo;
}

function saveClip() {
  if (!pageData) return;

  var tagsRaw = document.getElementById('tags').value.trim();
  var tags = tagsRaw
    ? tagsRaw.split(',').map(function(t) { return t.trim(); }).filter(Boolean)
    : [];

  var notes = document.getElementById('notes').value.trim();

  var content = '';
  if (clipType === 'selection') {
    content = pageData.selectedText || '';
  } else if (clipType === 'full_page') {
    content = pageData.articleText || '';
  } else {
    content = pageData.description || (pageData.articleText || '').slice(0, 1000);
  }

  var clip = {
    id: 'clip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    url: pageData.url,
    title: pageData.title || '',
    description: pageData.description || '',
    image: pageData.image || '',
    favicon: pageData.favicon || '',
    hostname: pageData.hostname || '',
    type: clipType,
    content: content,
    tags: tags,
    notes: notes,
    status: 'inbox',
    clippedAt: new Date().toISOString(),
    savedAt: new Date().toISOString(),
  };

  var btn = document.getElementById('save-btn');
  btn.disabled = true;

  var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(clip))));
  var url = 'https://content-intelligence-os1.vercel.app/clipper?clip=' + encoded;

  chrome.tabs.query({ url: 'https://content-intelligence-os1.vercel.app/*' }, function(tabs) {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true, url: url });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: url });
    }
    showMsg('Salvo! Abrindo no app...', 'ok');
    setTimeout(function() { window.close(); }, 1500);
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (!tabs || !tabs[0]) {
    document.getElementById('loading').textContent = 'Nenhuma aba ativa.';
    return;
  }

  var tab = tabs[0];

  chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_DATA' }, function(response) {
    if (chrome.runtime.lastError || !response) {
      response = {
        url: tab.url || '',
        title: tab.title || '',
        description: '',
        image: '',
        favicon: tab.favIconUrl || '',
        hostname: tab.url ? new URL(tab.url).hostname : '',
        selectedText: '',
        articleText: '',
        clippedAt: new Date().toISOString(),
      };
    }

    pageData = response;

    document.getElementById('hdr-sub').textContent = pageData.hostname || pageData.url;

    var favEl = document.getElementById('fav');
    var favPh = document.getElementById('fav-ph');
    if (pageData.favicon) {
      favEl.src = pageData.favicon;
      favEl.addEventListener('error', function() {
        favEl.style.display = 'none';
        favPh.style.display = 'block';
      });
    } else {
      favEl.style.display = 'none';
      favPh.style.display = 'block';
    }
    document.getElementById('pg-title').textContent = pageData.title || '(sem titulo)';
    document.getElementById('pg-host').textContent = pageData.hostname || pageData.url;

    if (pageData.selectedText) {
      setType('selection');
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('main').style.display = 'block';
  });
});
