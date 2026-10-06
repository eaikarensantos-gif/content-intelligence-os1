import { useState } from 'react'
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, Copy, Upload, X, Brain, CalendarPlus } from 'lucide-react'
import useStore from '../../store/useStore'
import { withManualOperacional } from '../../lib/manualOperacional'
import { withAntiAIFilter } from '../../lib/antiAIFilter'
import { buildVoiceContext } from '../../utils/voiceContext'
import { assertNotTruncated, extractJsonObject } from '../../utils/aiJson'
import { handleApiError } from '../../utils/apiError'
import { ANALYSIS_CRITERIA, buildAnalysisPrompt, validateAnalysis, contentBrainLearnings } from '../../utils/contentAnalysis'

export default function ContentAnalyzer({ persona='trabalho' }) {
  const [input,setInput]=useState({content:'',platform:'Instagram',goal:'',audience:'',series:''})
  const [result,setResult]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('')
  const [copied,setCopied]=useState(''), [media,setMedia]=useState(null), [frames,setFrames]=useState([]), [saved,setSaved]=useState(false)
  const addIdea=useStore(s=>s.addIdea), ideas=useStore(s=>s.ideas), posts=useStore(s=>s.posts), metrics=useStore(s=>s.metrics), brandVoice=useStore(s=>s.brandVoice), dislikedContent=useStore(s=>s.dislikedContent), posicionamento=useStore(s=>s.posicionamento)
  const bannedWords=posicionamento?.lista_negra||[]
  const brain=contentBrainLearnings(ideas,posts,metrics)

  async function analyze(){
    if(input.content.trim().length<20 && !frames.length){setError('Cole algumas frases ou envie uma imagem/vídeo para eu analisar.');return}
    setBusy(true);setError('')
    try{
      const apiKey=localStorage.getItem('cio-openai-key'); if(!apiKey) throw new Error('Configure sua API key nas configurações.')
      const voice=buildVoiceContext(persona==='pessoal'?null:brandVoice,dislikedContent,bannedWords,persona==='pessoal'?null:posicionamento)
      const response=await fetch('/api/ai?action=openai',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':apiKey},body:JSON.stringify({
        model:'gpt-5.6-terra',thinking:{type:'adaptive'},output_config:{effort:'medium'},max_tokens:6500,
        system:withManualOperacional(withAntiAIFilter(`Responda em português brasileiro, somente JSON válido. Preserve a voz da pessoa. Não invente fatos.\n${voice}`)),
        messages:[{role:'user',content:[{type:'text',text:buildAnalysisPrompt({...input,content:input.content||'[Analisar principalmente o material visual enviado]'},persona)},...frames.map(x=>({type:'image',source:{type:'base64',media_type:'image/jpeg',data:x}}))]}],
      })})
      if(!response.ok) await handleApiError(response)
      const envelope=await response.json(); assertNotTruncated(envelope)
      setResult(validateAnalysis(extractJsonObject(envelope.content?.find(b=>b.type==='text')?.text||''))); setSaved(false)
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const copy=async(key,text)=>{await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(''),1200)}
  const imageFrame=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file)})
  const videoFrames=file=>new Promise((resolve,reject)=>{const video=document.createElement('video'),url=URL.createObjectURL(file),out=[];video.muted=true;video.preload='metadata';video.onloadedmetadata=async()=>{const times=[.08,.5,.9].map(x=>Math.max(0,video.duration*x));const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');canvas.width=640;canvas.height=Math.max(360,Math.round(640*(video.videoHeight/video.videoWidth)));for(const time of times){await new Promise(done=>{video.onseeked=done;video.currentTime=time});ctx.drawImage(video,0,0,canvas.width,canvas.height);out.push(canvas.toDataURL('image/jpeg',.78).split(',')[1])}URL.revokeObjectURL(url);resolve(out)};video.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Não consegui ler este vídeo.'))};video.src=url})
  const handleMedia=async file=>{if(!file)return;setError('');if(!file.type.startsWith('image/')&&!file.type.startsWith('video/')){setError('Envie imagem ou vídeo.');return}if(file.size>80*1024*1024){setError('O arquivo deve ter até 80 MB.');return}setMedia(file);try{setFrames(file.type.startsWith('image/')?[await imageFrame(file)]:await videoFrames(file))}catch(e){setMedia(null);setFrames([]);setError(e.message)}}
  const scriptText=result?[`GANCHO\n${result.roteiro.gancho}`,`DESENVOLVIMENTO\n${result.roteiro.desenvolvimento}`,`VIRADA / PROVA\n${result.roteiro.virada_prova}`,`ENTREGA\n${result.roteiro.entrega}`,`CTA\n${result.roteiro.cta}`].join('\n\n'):''
  const save=()=>{if(!result)return;addIdea({title:result.resumo,description:scriptText,script:scriptText,platform:input.platform.toLowerCase(),platforms:[input.platform.toLowerCase()],format:'roteiro',priority:'medium',status:'draft',tags:['analisado-content'],source:'Analisar meu conteúdo',analysis:{input:{...input,media:media?{name:media.name,type:media.type}:null},result}});setSaved(true)}

  return <section className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6" aria-label="Analisar meu conteúdo">
    <header><p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Content Intelligence</p><h1 className="text-2xl font-bold">Analisar meu conteúdo</h1><p className="text-sm text-gray-500 mt-1">Cole um roteiro, legenda ou texto. O Content aponta o que preservar, o que mudar e entrega uma versão pronta para executar.</p></header>
    <div className="card p-4 sm:p-5 space-y-4">
      <textarea className="input w-full min-h-52" aria-label="Conteúdo para analisar" placeholder="Cole aqui seu roteiro, legenda ou texto..." value={input.content} onChange={e=>setInput({...input,content:e.target.value})}/>
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-secondary flex items-center gap-2 cursor-pointer"><Upload size={15}/> Enviar imagem ou vídeo<input type="file" accept="image/*,video/*" className="hidden" onChange={e=>handleMedia(e.target.files?.[0])}/></label>
        {media&&<span className="text-xs bg-gray-50 border rounded-lg px-3 py-2 flex items-center gap-2">{media.name} · {frames.length} {media.type.startsWith('video/')?'quadros':'imagem'}<button type="button" onClick={()=>{setMedia(null);setFrames([])}}><X size={13}/></button></span>}
        {media?.type.startsWith('video/')&&<span className="text-xs text-gray-500">O Content lê 3 quadros do vídeo. Cole a fala/transcrição acima para analisar também o áudio.</span>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-xs text-gray-600">Plataforma<select className="input w-full mt-1" value={input.platform} onChange={e=>setInput({...input,platform:e.target.value})}><option>Instagram</option><option>LinkedIn</option><option>TikTok</option><option>YouTube</option><option>X</option></select></label>
        {[['goal','Objetivo'],['audience','Público'],['series','Quadro / série']].map(([k,l])=><label key={k} className="text-xs text-gray-600">{l}<input className="input w-full mt-1" value={input[k]} onChange={e=>setInput({...input,[k]:e.target.value})}/></label>)}
      </div>
      <button className="btn-primary flex items-center gap-2" disabled={busy} onClick={analyze}>{busy?<Loader2 size={16} className="animate-spin"/>:<Sparkles size={16}/>} {busy?'Analisando gancho, narrativa e voz...':'Analisar agora'}</button>
      {error&&<p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
    </div>
    {result&&<div className="space-y-5">
      <div className="card p-5"><p className="text-xs text-gray-500">Diagnóstico Content</p><h2 className="text-xl font-semibold mt-1">{result.resumo}</h2></div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5"><h3 className="font-semibold flex gap-2 items-center"><CheckCircle2 size={17}/>O que funciona</h3><ul className="list-disc pl-5 mt-3 text-sm space-y-2">{result.funciona.map((x,i)=><li key={i}>{x}</li>)}</ul></div>
        <div className="card p-5"><h3 className="font-semibold">O que eu mudaria primeiro</h3><p className="text-sm mt-3">{result.mudaria_primeiro}</p><p className="mt-3 text-sm bg-gray-50 rounded-xl p-3">{result.como_ficaria}</p></div>
      </div>
      {!!result.criticos.length&&<div className="space-y-3"><h3 className="font-semibold">O que está te segurando</h3>{result.criticos.map((x,i)=><article key={i} className="card p-5"><h4 className="font-semibold flex gap-2"><AlertTriangle size={16}/>{x.problema}</h4><p className="text-sm mt-2"><b>Impacto:</b> {x.impacto}</p><p className="text-sm mt-2"><b>Correção:</b> {x.correcao}</p><p className="text-sm mt-2 bg-gray-50 p-3 rounded-xl"><b>Exemplo:</b> {x.exemplo}</p></article>)}</div>}
      <div className="card p-5"><h3 className="font-semibold">3 caminhos de gancho</h3><div className="grid md:grid-cols-3 gap-3 mt-3">{result.ganchos.map((g,i)=><div key={g.nivel} className="border rounded-xl p-4"><p className="text-xs uppercase font-semibold text-gray-500">{g.nivel}</p><p className="font-medium mt-2">{g.texto}</p><p className="text-xs text-gray-500 mt-2">{g.porque}</p><button className="text-xs mt-3 flex gap-1" onClick={()=>copy('g'+i,g.texto)}><Copy size={12}/>{copied==='g'+i?'Copiado':'Copiar'}</button></div>)}</div></div>
      <div className="card p-5"><div className="flex justify-between gap-3"><h3 className="font-semibold">Original × Versão Content</h3><button className="btn-secondary text-xs" onClick={()=>copy('script',scriptText)}>{copied==='script'?'Copiado':'Copiar roteiro'}</button></div><div className="grid md:grid-cols-2 gap-4 mt-4"><div><p className="text-xs font-semibold text-gray-500">ORIGINAL</p><p className="text-sm whitespace-pre-wrap mt-2">{input.content}</p></div><div><p className="text-xs font-semibold text-violet-600">VERSÃO CONTENT</p><p className="text-sm whitespace-pre-wrap mt-2">{scriptText}</p></div></div><div className="flex flex-wrap gap-2 mt-4"><button className="btn-primary" onClick={save}>{saved?'Salvo no Hub':'Salvar rascunho no Hub'}</button><a className="btn-secondary flex items-center gap-2" href="/calendar"><CalendarPlus size={14}/>Ir para calendário</a></div></div>
      <div className="card p-5"><h3 className="font-semibold">Direção de gravação</h3><div className="grid md:grid-cols-2 gap-3 mt-3 text-sm"><p><b>Enquadramento:</b> {result.direcao.enquadramento}</p><p><b>Texto na tela:</b> {result.direcao.texto_tela}</p><p><b>Apoio visual:</b> {result.direcao.apoio_visual}</p><p><b>Edição:</b> {result.direcao.edicao}</p><p><b>Legenda:</b> {result.direcao.legenda}</p><p><b>Evitar:</b> {(result.direcao.evitar||[]).join('; ')||'Nada crítico'}</p></div></div>
      <div className="card p-5"><h3 className="font-semibold">Diagnóstico detalhado</h3><div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-4">{ANALYSIS_CRITERIA.map(([k,l])=><div key={k}><div className="flex justify-between text-xs"><span>{l}</span><b>{result.notas[k]}/10</b></div><div className="h-1.5 bg-gray-100 rounded mt-1"><div className="h-full bg-gray-700 rounded" style={{width:`${result.notas[k]*10}%`}}/></div></div>)}</div></div>
    </div>}
    <div className="card p-5"><h3 className="font-semibold flex items-center gap-2"><Brain size={17}/>Content Brain</h3><p className="text-sm text-gray-500 mt-2">{brain.message}</p>{brain.learnings.length>0&&<div className="mt-3 space-y-2">{brain.learnings.map((x,i)=><p key={i} className="text-sm"><b>{x.format}</b>: {x.count} conteúdos comparáveis, engajamento médio de {(x.avg*100).toFixed(2)}%.</p>)}</div>}<p className="text-xs text-gray-400 mt-3">Amostra vinculada a conteúdos analisados e métricas: {brain.sample}.</p></div>
  </section>
}
