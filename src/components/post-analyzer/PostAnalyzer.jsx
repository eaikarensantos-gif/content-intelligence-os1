import { useState, useRef } from 'react'
import { Upload, Download, Calendar, AlertCircle, Trash2, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'

export default function PostAnalyzer() {
  const [platform, setPlatform] = useState('instagram')
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(() => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  })
  const fileInputRef = useRef(null)

  const parseInstagramData = (workbook) => {
    try {
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(sheet)

      // Extract all unique periods from data
      const periodsMap = {}
      jsonData.forEach(row => {
        const rowDate = row['Data'] || row['Date']
        if (rowDate) {
          try {
            const pDate = new Date(rowDate)
            const periodKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`
            periodsMap[periodKey] = (periodsMap[periodKey] || 0) + 1
          } catch {}
        }
      })

      const availablePeriods = Object.keys(periodsMap).sort()
      let activePeriod = period

      // If selected period has no data, use the first available period
      if (availablePeriods.length > 0 && !periodsMap[period]) {
        activePeriod = availablePeriods[0]
        setPeriod(activePeriod)
      }

      const [year, month] = activePeriod.split('-')
      const currentPeriod = new Date(`${year}-${month}-01`)

      // Parse Instagram data
      const posts = jsonData
        .filter(row => {
          if (!row['Data'] && !row['Date']) return false
          const rowDate = row['Data'] || row['Date']
          if (!rowDate) return false
          try {
            const pDate = new Date(rowDate)
            return pDate.getFullYear() === currentPeriod.getFullYear() &&
                   pDate.getMonth() === currentPeriod.getMonth()
          } catch {
            return false
          }
        })
        .map(row => {
          const interacoes = (parseInt(row['Curtidas'] || row['Likes'] || 0) || 0) +
                            (parseInt(row['Comentários'] || row['Comments'] || 0) || 0) +
                            (parseInt(row['Compartilhamentos'] || row['Shares'] || 0) || 0) +
                            (parseInt(row['Salvamentos'] || row['Saves'] || 0) || 0)

          const alcance = parseInt(row['Alcance'] || row['Reach'] || 0) || 0
          const impressoes = parseInt(row['Impressões'] || row['Impressions'] || 0) || 0
          const base = alcance > 0 ? alcance : impressoes

          const er = base > 0 ? ((interacoes / base) * 100).toFixed(2) : 0

          const titulo = row['Título'] || row['Caption'] || row['Texto'] ||
                        `Post ${new Date(row['Data'] || row['Date']).toLocaleDateString('pt-BR')}`

          const link = row['URL do Post'] || row['Link'] || row['URL'] || 'Link não disponível'

          return {
            data: row['Data'] || row['Date'],
            titulo: titulo.length > 50 ? titulo.substring(0, 50) + '...' : titulo,
            er: parseFloat(er),
            alcance: alcance || impressoes,
            link: link,
            interacoes: interacoes,
            base: base
          }
        })
        .sort((a, b) => b.er - a.er)

      return {
        platform: 'instagram',
        period: activePeriod,
        posts: posts,
        maxER: posts.length > 0 ? Math.max(...posts.map(p => p.er)) : 0
      }
    } catch (err) {
      throw new Error(`Erro ao processar dados do Instagram: ${err.message}`)
    }
  }

  const parseLinkedInData = (workbook) => {
    try {
      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      // LinkedIn individual post report format (one post per file)
      // Extract values from specific cells
      const getCell = (addr) => {
        const cell = sheet[addr]
        return cell ? cell.v : null
      }

      const url = getCell('B1') || 'Link não disponível'
      const dataText = getCell('B2') // e.g., "10 de mar de 2026"
      const impressoes = parseInt(getCell('B6')) || 0
      const alcance = parseInt(getCell('B7')) || 0
      const reacoes = parseInt(getCell('B10')) || 0
      const comentarios = parseInt(getCell('B11')) || 0
      const compartilhamentos = parseInt(getCell('B12')) || 0
      const salvamentos = parseInt(getCell('B13')) || 0

      const engajamento = reacoes + comentarios + compartilhamentos + salvamentos
      const base = alcance > 0 ? alcance : impressoes
      const er = base > 0 ? ((engajamento / base) * 100).toFixed(2) : 0

      // Parse date from "10 de mar de 2026" format
      const parseLinkedInDate = (dateText) => {
        if (!dateText) return null
        const meses = {
          'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
          'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        }

        const match = dateText.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d+)/)
        if (!match) return null

        const [, day, monthName, year] = match
        const month = meses[monthName.toLowerCase()]
        if (!month) return null

        return new Date(`${year}-${month}-${day}`)
      }

      const parsedDate = parseLinkedInDate(dataText)
      if (!parsedDate) throw new Error('Não foi possível extrair a data do arquivo')

      const dataFormatada = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
      const periodKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}`

      // Check if date matches selected period
      const [year, month] = period.split('-')
      const selectedPeriod = new Date(`${year}-${month}-01`)

      if (parsedDate.getFullYear() !== selectedPeriod.getFullYear() ||
          parsedDate.getMonth() !== selectedPeriod.getMonth()) {
        // Auto-update period to match file data
        setPeriod(periodKey)
      }

      const post = {
        data: dataFormatada,
        titulo: url !== 'Link não disponível' ? url.substring(0, 50) : 'Post sem URL',
        er: parseFloat(er),
        alcance: alcance,
        link: url,
        interacoes: engajamento,
        base: base,
        detalhes: {
          impressoes,
          reacoes,
          comentarios,
          compartilhamentos,
          salvamentos
        }
      }

      return {
        platform: 'linkedin',
        period: periodKey,
        posts: [post],
        maxER: parseFloat(er)
      }
    } catch (err) {
      throw new Error(`Erro ao processar dados do LinkedIn: ${err.message}`)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })

      let parsedData
      if (platform === 'instagram') {
        parsedData = parseInstagramData(workbook)
      } else if (platform === 'linkedin') {
        parsedData = parseLinkedInData(workbook)
      }

      if (!parsedData || parsedData.posts.length === 0) {
        setError('Nenhum post encontrado no período selecionado')
        setLoading(false)
        return
      }

      // Add posts to existing list
      setPosts(prev => [...prev, ...parsedData.posts])

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err)
      setError(err.message || 'Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  const deletePost = (index) => {
    setPosts(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    if (confirm('Tem certeza que deseja remover todos os posts?')) {
      setPosts([])
      setError(null)
    }
  }

  const generatePDF = () => {
    if (posts.length === 0) {
      setError('Nenhum post disponível para gerar PDF')
      return
    }

    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()

    // ===== PÁGINA 1: CAPA =====
    // Background gradient effect
    doc.setFillColor(255, 100, 0)
    doc.rect(0, 0, pageWidth, pageHeight / 3, 'F')

    doc.setFontSize(32)
    doc.setTextColor(255, 255, 255)
    doc.setFont(undefined, 'bold')
    doc.text('ANÁLISE DE PERFORMANCE', 20, 60)
    doc.text('DE POSTS', 20, 95)

    // Plataforma icon
    doc.setFontSize(48)
    doc.setTextColor(255, 255, 255)
    doc.text(platform === 'instagram' ? '📱' : '🔗', pageWidth - 50, 80)

    // Summary box
    doc.setFillColor(240, 240, 240)
    doc.rect(20, 120, pageWidth - 40, 80, 'F')

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.setFont(undefined, 'normal')
    doc.text(`Plataforma: ${platform.toUpperCase()}`, 30, 135)
    doc.text(`Data da análise: ${new Date().toLocaleDateString('pt-BR')}`, 30, 150)
    doc.text(`Total de posts: ${posts.length}`, 30, 165)

    const maxER = Math.max(...posts.map(p => p.er))
    const avgER = (posts.reduce((sum, p) => sum + p.er, 0) / posts.length).toFixed(2)
    const totalAlcance = posts.reduce((sum, p) => sum + p.alcance, 0)

    doc.text(`Maior ER: ${maxER.toFixed(2)}%`, 30, 180)
    doc.text(`ER Médio: ${avgER}% | Alcance Total: ${totalAlcance.toLocaleString()}`, 30, 195)

    // Footer
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Relatório gerado automaticamente pelo Content Intelligence OS', 20, pageHeight - 20)

    // ===== PÁGINA 2+: DETALHES DOS POSTS =====
    let currentY = 20
    const margin = 20
    const contentWidth = pageWidth - 2 * margin

    doc.addPage()

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'bold')
    doc.text('Detalhes dos Posts', margin, currentY)
    currentY += 15

    // Table header
    doc.setFillColor(255, 100, 0)
    doc.setTextColor(255, 255, 255)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(9)

    const cols = [25, 60, 20, 30, 30]
    const colX = [margin, margin + 28, margin + 90, margin + 115, margin + 150]
    const rowHeight = 7

    const headers = ['Data', 'Título', 'ER %', 'Alcance', 'Interações']
    headers.forEach((header, i) => {
      doc.text(header, colX[i], currentY, { maxWidth: cols[i] - 2 })
    })

    currentY += rowHeight + 2

    // Table body
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(8)

    posts.forEach((post, idx) => {
      if (currentY > pageHeight - 25) {
        doc.addPage()
        currentY = 20
      }

      const isMaxER = post.er === maxER

      // Highlight best ER
      if (isMaxER) {
        doc.setFillColor(255, 245, 220)
        doc.rect(margin, currentY - 5, contentWidth, rowHeight + 1, 'F')
      }

      if (isMaxER) {
        doc.setTextColor(255, 100, 0)
        doc.setFont(undefined, 'bold')
      }

      const rowData = [
        post.data || '—',
        post.titulo.substring(0, 30) + (post.titulo.length > 30 ? '...' : ''),
        `${post.er}%`,
        post.alcance.toLocaleString(),
        post.interacoes.toString()
      ]

      rowData.forEach((cell, i) => {
        const align = i >= 2 ? 'right' : 'left'
        doc.text(String(cell), colX[i], currentY, { maxWidth: cols[i] - 2, align })
      })

      if (isMaxER) {
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'normal')
      }

      currentY += rowHeight + 1
    })

    // Summary statistics
    currentY += 8
    if (currentY > pageHeight - 40) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Resumo Executivo', margin, currentY)
    currentY += 10

    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(50, 50, 50)

    const stats = [
      `Total de Posts: ${posts.length}`,
      `Engajamento Rate Máximo: ${maxER.toFixed(2)}%`,
      `Engajamento Rate Médio: ${avgER}%`,
      `Alcance Total: ${totalAlcance.toLocaleString()} usuários`,
      `Interações Totais: ${posts.reduce((sum, p) => sum + p.interacoes, 0).toLocaleString()}`
    ]

    stats.forEach(stat => {
      doc.text(`• ${stat}`, margin + 5, currentY)
      currentY += 7
    })

    // Final footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      margin,
      pageHeight - 10
    )

    doc.save(`Relatorio_Performance_${platform}_${new Date().getTime()}.pdf`)
  }

  const maxER = posts.length > 0 ? Math.max(...posts.map(p => p.er)) : 0
  const avgER = posts.length > 0 ? (posts.reduce((sum, p) => sum + p.er, 0) / posts.length).toFixed(2) : 0
  const totalAlcance = posts.reduce((sum, p) => sum + p.alcance, 0)
  const totalInteracoes = posts.reduce((sum, p) => sum + p.interacoes, 0)

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">📊 Análise Completa de Posts</h1>
        <p className="text-orange-100 mt-1">Importe múltiplos arquivos e gere um relatório profissional</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Platform selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Plataforma</label>
            <select
              value={platform}
              onChange={(e) => {
                setPlatform(e.target.value)
                setError(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="instagram">📱 Instagram</option>
              <option value="linkedin">🔗 LinkedIn</option>
            </select>
          </div>

          {/* Period selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Calendar size={16} /> Período
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* File upload */}
        <div className="border-2 border-dashed border-orange-300 rounded-lg p-8 text-center bg-orange-50">
          <Upload className="mx-auto mb-3 text-orange-400" size={32} />
          <p className="text-sm text-gray-600 mb-3 font-medium">Arraste um arquivo .xlsx aqui ou clique para selecionar</p>
          <p className="text-xs text-gray-500 mb-4">Você pode adicionar múltiplos arquivos. Todos os posts serão reunidos no relatório final.</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 font-semibold flex items-center justify-center gap-2 mx-auto"
          >
            <Plus size={18} />
            {loading ? 'Processando...' : 'Anexar Arquivo'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-semibold text-red-900">Erro</p>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Posts summary and table */}
      {posts.length > 0 && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-700 font-semibold uppercase">Posts</p>
              <p className="text-3xl font-bold text-orange-900 mt-2">{posts.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-semibold uppercase">Maior ER</p>
              <p className="text-3xl font-bold text-emerald-900 mt-2">{maxER.toFixed(2)}%</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold uppercase">ER Médio</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{avgER}%</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <p className="text-xs text-purple-700 font-semibold uppercase">Alcance</p>
              <p className="text-2xl font-bold text-purple-900 mt-2">{(totalAlcance / 1000).toFixed(1)}k</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-orange-600 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">Data</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-white">Título</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">ER %</th>
                    <th className="px-4 py-4 text-right text-sm font-semibold text-white">Alcance</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">Int.</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-white">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post, i) => (
                    <tr key={i} className={`border-b border-gray-100 transition-colors ${post.er === maxER ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium">{post.data || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{post.titulo}</td>
                      <td className={`px-4 py-3 text-center text-sm font-bold ${post.er === maxER ? 'text-orange-600' : 'text-gray-900'}`}>
                        {post.er}%
                        {post.er === maxER && <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">BEST</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{post.alcance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700 font-medium">{post.interacoes}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => deletePost(i)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                          title="Remover post"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4">
            <button
              onClick={generatePDF}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all font-bold text-lg shadow-md hover:shadow-lg"
            >
              <Download size={24} />
              📥 GERAR RELATÓRIO COMPLETO EM PDF
            </button>
            {posts.length > 0 && (
              <button
                onClick={clearAll}
                className="px-6 py-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
              >
                🗑️ Limpar Tudo
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {posts.length === 0 && !error && (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Upload className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-600 text-lg font-medium">Nenhum post adicionado ainda</p>
          <p className="text-gray-500 mt-2">Importe o primeiro arquivo para começar</p>
        </div>
      )}
    </div>
  )
}
