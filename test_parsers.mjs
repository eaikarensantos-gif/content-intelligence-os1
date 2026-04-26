import XLSX from 'xlsx';

// Read the test files
const instagramFile = XLSX.readFile('test_instagram_2026_04.xlsx');
const linkedinFile = XLSX.readFile('test_linkedin_2026_04.xlsx');

console.log('📊 Testing Instagram Parser\n');
console.log('================================\n');

// Test Instagram Parser
const instagramSheet = instagramFile.Sheets[instagramFile.SheetNames[0]];
const instagramData = XLSX.utils.sheet_to_json(instagramSheet);

console.log('Raw data rows:', instagramData.length);
instagramData.forEach((row, idx) => {
  const interacoes = (parseInt(row['Curtidas'] || 0) || 0) +
                    (parseInt(row['Comentários'] || 0) || 0) +
                    (parseInt(row['Compartilhamentos'] || 0) || 0) +
                    (parseInt(row['Salvamentos'] || 0) || 0);
  
  const alcance = parseInt(row['Alcance'] || 0) || 0;
  const impressoes = parseInt(row['Impressões'] || 0) || 0;
  const base = alcance > 0 ? alcance : impressoes;
  const er = base > 0 ? ((interacoes / base) * 100).toFixed(2) : 0;

  console.log(`\nPost ${idx + 1}:`);
  console.log(`  Data: ${row['Data']}`);
  console.log(`  Título: ${row['Título'].substring(0, 40)}...`);
  console.log(`  Alcance: ${alcance}`);
  console.log(`  Interações: ${interacoes}`);
  console.log(`  ER: ${er}%`);
});

console.log('\n\n🔗 Testing LinkedIn Parser\n');
console.log('================================\n');

// Test LinkedIn Parser
const linkedinSheet = linkedinFile.Sheets[linkedinFile.SheetNames[0]];

const getCell = (addr) => {
  const cell = linkedinSheet[addr];
  return cell ? cell.v : null;
};

const url = getCell('B1') || 'Link não disponível';
const dataText = getCell('B2');
const impressoes = parseInt(getCell('B6')) || 0;
const alcance = parseInt(getCell('B7')) || 0;
const reacoes = parseInt(getCell('B10')) || 0;
const comentarios = parseInt(getCell('B11')) || 0;
const compartilhamentos = parseInt(getCell('B12')) || 0;
const salvamentos = parseInt(getCell('B13')) || 0;

const engajamento = reacoes + comentarios + compartilhamentos + salvamentos;
const base = alcance > 0 ? alcance : impressoes;
const er = base > 0 ? ((engajamento / base) * 100).toFixed(2) : 0;

// Parse date
const meses = {
  'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
  'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
};

const match = dataText.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/);
let parsedDate = null;
if (match) {
  const [, day, monthName, year] = match;
  const month = meses[monthName.toLowerCase()];
  if (month) {
    parsedDate = new Date(`${year}-${month}-${day}`);
  }
}

console.log('Post Individual:');
console.log(`  Data: ${dataText}`);
console.log(`  Data Parsed: ${parsedDate ? parsedDate.toLocaleDateString('pt-BR') : 'ERRO'}`);
console.log(`  URL: ${url}`);
console.log(`  Impressões: ${impressoes}`);
console.log(`  Alcance: ${alcance}`);
console.log(`  Reações: ${reacoes}`);
console.log(`  Comentários: ${comentarios}`);
console.log(`  Compartilhamentos: ${compartilhamentos}`);
console.log(`  Salvamentos: ${salvamentos}`);
console.log(`  Engajamento Total: ${engajamento}`);
console.log(`  ER Calculado: ${er}%`);
console.log(`\n✅ Parsing completed successfully!`);
