const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Test data for Instagram
const instagramData = [
  {
    'Data': '2026-04-01',
    'Título': 'Primeiro post sobre conteúdo criativo',
    'Curtidas': 150,
    'Comentários': 25,
    'Compartilhamentos': 12,
    'Salvamentos': 45,
    'Alcance': 3200,
    'Impressões': 3500,
    'URL do Post': 'https://instagram.com/p/abc123'
  },
  {
    'Data': '2026-04-02',
    'Título': 'Dicas para melhorar engagement nas redes sociais',
    'Curtidas': 280,
    'Comentários': 52,
    'Compartilhamentos': 35,
    'Salvamentos': 120,
    'Alcance': 5100,
    'Impressões': 6200,
    'URL do Post': 'https://instagram.com/p/def456'
  },
  {
    'Data': '2026-04-03',
    'Título': 'Análise de tendências de mercado Q2 2026',
    'Curtidas': 195,
    'Comentários': 38,
    'Compartilhamentos': 22,
    'Salvamentos': 85,
    'Alcance': 4200,
    'Impressões': 4800,
    'URL do Post': 'https://instagram.com/p/ghi789'
  },
  {
    'Data': '2026-04-05',
    'Título': 'Ferramentas essenciais para criadores de conteúdo',
    'Curtidas': 420,
    'Comentários': 95,
    'Compartilhamentos': 68,
    'Salvamentos': 245,
    'Alcance': 8900,
    'Impressões': 10200,
    'URL do Post': 'https://instagram.com/p/jkl012'
  },
  {
    'Data': '2026-04-07',
    'Título': 'Webinar: Estratégia de conteúdo para 2026',
    'Curtidas': 320,
    'Comentários': 72,
    'Compartilhamentos': 48,
    'Salvamentos': 180,
    'Alcance': 6800,
    'Impressões': 7900,
    'URL do Post': 'https://instagram.com/p/mno345'
  }
];

// Test data for LinkedIn (individual post format)
const linkedinData = {
  'A1': 'URL do Post',
  'B1': 'https://www.linkedin.com/feed/update/urn:li:ugcPost:7437190013035077632',
  'A2': 'Data',
  'B2': '10 de abr de 2026',
  'A6': 'Impressões',
  'B6': 2184,
  'A7': 'Alcance',
  'B7': 1681,
  'A10': 'Reações',
  'B10': 45,
  'A11': 'Comentários',
  'B11': 2,
  'A12': 'Compartilhamentos',
  'B12': 1,
  'A13': 'Salvamentos',
  'B13': 1
};

// Create Instagram workbook
const wbInstagram = XLSX.utils.book_new();
const wsInstagram = XLSX.utils.json_to_sheet(instagramData);
XLSX.utils.book_append_sheet(wbInstagram, wsInstagram, 'Posts');
XLSX.writeFile(wbInstagram, 'test_instagram_2026_04.xlsx');
console.log('✅ Created test_instagram_2026_04.xlsx');

// Create LinkedIn workbook
const wbLinkedIn = XLSX.utils.book_new();
const wsLinkedIn = XLSX.utils.aoa_to_sheet([]);
Object.keys(linkedinData).forEach(cell => {
  wsLinkedIn[cell] = { v: linkedinData[cell] };
});
XLSX.utils.book_append_sheet(wbLinkedIn, wsLinkedIn, 'Post');
XLSX.writeFile(wbLinkedIn, 'test_linkedin_2026_04.xlsx');
console.log('✅ Created test_linkedin_2026_04.xlsx');

console.log('\n✅ Test files created successfully!');
