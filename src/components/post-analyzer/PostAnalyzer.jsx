import { useState, useRef } from 'react'
import { Upload, Download, Calendar, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'

export default function PostAnalyzer() {
  const [platform, setPlatform] = useState('instagram')
  const [data, setData] = useState(null)
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

      const [year, month] = period.split('-')
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
        period: period,
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
      const jsonData = XLSX.utils.sheet_to_json(sheet)

      const [year, month] = period.split('-')
      const currentPeriod = new Date(`${year}-${month}-01`)

      // Parse LinkedIn data
      const posts = jsonData
        .filter(row => {
          const rowDate = row['Data de publicação']
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
          const engajamento = parseInt(row['Engajamento'] || 0) || 0
          const impressoes = parseInt(row['Impressões'] || 0) || 0
          const er = impressoes > 0 ? ((engajamento / impressoes) * 100).toFixed(2) : 0

          const url = row['URL da publicação'] || 'Link não disponível'
          const titulo = url !== 'Link não disponível' ? url.substring(0, 50) : 'Post sem URL'

          return {
            data: row['Data de publicação'],
            titulo: titulo,
            er: parseFloat(er),
            alcance: impressoes,
            link: url,
            interacoes: engajamento,
            base: impressoes
          }
        })
        .sort((a, b) => b.er - a.er)

      return {
        platform: 'linkedin',
        period: period,
        posts: posts,
        maxER: posts.length > 0 ? Math.max(...posts.map(p => p.er)) : 0
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

      setData(parsedData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = () => {
    if (!data || data.posts.length === 0) {
      setError('Nenhum dado disponível para gerar PDF')
      return
    }

    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    let currentY = 20

    // Header
    doc.setFontSize(18)
    doc.text('📱 Performance Individual de Posts', 20, currentY)
    currentY += 15

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Plataforma: ${data.platform.toUpperCase()} | Período: ${data.period}`, 20, currentY)
    currentY += 15

    // Column widths
    const cols = [20, 70, 20, 30, 25]
    const colX = [15, 40, 115, 140, 175]
    const rowHeight = 8

    // Table header
    doc.setFillColor(255, 100, 0)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont(undefined, 'bold')

    const headers = ['Data', 'Título/Tema', 'ER %', 'Alcance', 'Link']
    headers.forEach((header, i) => {
      doc.text(header, colX[i], currentY, { maxWidth: cols[i] - 2 })
    })
    currentY += rowHeight + 2

    // Table body
    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'normal')
    const maxER = Math.max(...data.posts.map(p => p.er))

    data.posts.forEach((post, idx) => {
      if (currentY > pageHeight - 20) {
        doc.addPage()
        currentY = 20
      }

      const isMaxER = post.er === maxER
      if (isMaxER) {
        doc.setFillColor(255, 240, 220)
        doc.rect(15, currentY - 6, pageWidth - 30, rowHeight, 'F')
      }

      if (isMaxER) {
        doc.setTextColor(255, 100, 0)
        doc.setFont(undefined, 'bold')
      }

      const rowData = [
        post.data || '—',
        post.titulo.substring(0, 45),
        `${post.er}%`,
        post.alcance.toLocaleString(),
        post.link !== 'Link não disponível' ? '🔗 Ver' : 'N/A'
      ]

      rowData.forEach((cell, i) => {
        const align = i === 2 || i === 3 || i === 4 ? 'right' : 'left'
        doc.text(String(cell), colX[i], currentY, { maxWidth: cols[i] - 2, align })
      })

      if (isMaxER) {
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'normal')
      }

      currentY += rowHeight
    })

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      15,
      pageHeight - 10
    )

    doc.save(`Performance_${data.platform}_${data.period}.pdf`)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Análise Individual de Posts</h1>
        <p className="text-gray-600 mt-1">Importe dados de .xlsx e gere relatórios de performance</p>
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
                setData(null)
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
              onChange={(e) => {
                setPeriod(e.target.value)
                setData(null)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* File upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="mx-auto mb-3 text-gray-400" size={32} />
          <p className="text-sm text-gray-600 mb-3">Arraste um arquivo .xlsx ou clique para selecionar</p>
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
            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Processando...' : 'Selecionar arquivo'}
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

      {/* Data display */}
      {data && data.posts.length > 0 && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-xs text-orange-700 font-semibold">Posts Analisados</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{data.posts.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-semibold">Maior ER</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{data.maxER.toFixed(2)}%</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold">Período</p>
              <p className="text-lg font-bold text-blue-900 mt-1">{period}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-orange-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Título/Tema</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">ER %</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Alcance</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {data.posts.map((post, i) => (
                    <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${post.er === data.maxER ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-700">{post.data || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{post.titulo}</td>
                      <td className={`px-4 py-3 text-center text-sm font-semibold ${post.er === data.maxER ? 'text-orange-600' : 'text-gray-700'}`}>
                        {post.er}%
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">{post.alcance.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center">
                        {post.link !== 'Link não disponível' ? (
                          <a href={post.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            🔗 Ver Post
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">Link não disponível</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PDF export button */}
          <button
            onClick={generatePDF}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
          >
            <Download size={20} />
            📥 CLIQUE AQUI PARA BAIXAR O RELATÓRIO COMPLETO EM PDF
          </button>
        </div>
      )}

      {/* Empty state */}
      {!data && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">Importe um arquivo .xlsx para começar</p>
        </div>
      )}
    </div>
  )
}
