// Serverless proxy for RSS feeds — avoids CORS in the browser
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'url param required' })

  try {
    const feedRes = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)' },
    })
    if (!feedRes.ok) throw new Error(`Feed returned ${feedRes.status}`)
    const xml = await feedRes.text()
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.status(200).send(xml)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
