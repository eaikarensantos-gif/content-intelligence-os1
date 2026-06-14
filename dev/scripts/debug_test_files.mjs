import XLSX from 'xlsx';

console.log('📋 Debugging Test Files\n');

// Check Instagram file
const instagramFile = XLSX.readFile('test_instagram_2026_04.xlsx');
const instagramSheet = instagramFile.Sheets[instagramFile.SheetNames[0]];
const instagramData = XLSX.utils.sheet_to_json(instagramSheet);

console.log('Instagram Data:');
instagramData.forEach((row, idx) => {
  console.log(`  Row ${idx + 1}: Data="${row['Data']}" (type: ${typeof row['Data']}), Título="${row['Título'].substring(0, 30)}"`);
});

console.log('\n\nLinkedIn File Structure:');
const linkedinFile = XLSX.readFile('test_linkedin_2026_04.xlsx');
const linkedinSheet = linkedinFile.Sheets[linkedinFile.SheetNames[0]];

console.log('Cell contents:');
Object.keys(linkedinSheet).forEach(cell => {
  if (cell.startsWith('!')) return;
  console.log(`  ${cell}: ${linkedinSheet[cell].v}`);
});
