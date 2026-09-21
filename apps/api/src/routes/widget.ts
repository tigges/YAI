/**
 * Public widget routes — no authentication required.
 *
 * GET  /widget.js                     — serves the compiled embed widget script
 * GET  /widget-test/:channelId        — browser-loadable test page for a channel
 * POST /public/chat/:channelId        — SSE streaming chat (creates DB conversation)
 * POST /public/csat/:channelId        — submit CSAT rating for a conversation
 */

import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { createLlmAdapter, createEmbeddingAdapter } from '@ybot/llm'
import type { LlmMessage } from '@ybot/llm'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma  = new PrismaClient()
const llm     = createLlmAdapter()
const embedAI = createEmbeddingAdapter()

// ── CORS helper — applied to every public route ────────────────────────────
function setCors(reply: { header(k: string, v: string): void }) {
  reply.header('Access-Control-Allow-Origin',  '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type')
}

// ── RAG ───────────────────────────────────────────────────────────────────
async function ragSearch(query: string, tenantId: string, botId: string, topK = 4): Promise<string[]> {
  try {
    const r = await embedAI.embed({ texts: [query] })
    const vec = r.embeddings[0]
    if (!vec || vec.length === 0) return []
    const rows = await (prisma.$queryRawUnsafe as (sql: string, ...p: unknown[]) => Promise<Array<{ content: string }>>)(
      `SELECT dc.content
       FROM "document_chunks" dc
       JOIN "documents" d ON dc."documentId"=d.id
       JOIN "knowledge_sources" ks ON d."knowledgeSourceId"=ks.id
       WHERE dc."tenantId"=$2 AND ks."botId"=$3 AND dc.embedding IS NOT NULL
       ORDER BY dc.embedding <=> $1::vector LIMIT $4`,
      JSON.stringify(vec), tenantId, botId, topK,
    )
    return rows.map((r) => r.content)
  } catch { return [] }
}

// ── Widget JS source (served if compiled bundle is absent) ─────────────────
const WIDGET_INLINE_JS = /* js */`
(function(){
  var script=document.currentScript||document.querySelector('script[src*="widget.js"]');
  var channelId='';
  if(script){try{var u=new URL(script.src);channelId=u.searchParams.get('id')||u.searchParams.get('channelId')||'';}catch(e){}}
  if(!channelId)channelId=window.YBotChannelId||'';
  if(!channelId){console.warn('[YBot Widget] No channelId');return;}
  var API_BASE='/api/v1';
  if(script){try{var u=new URL(script.src);API_BASE=u.protocol+'//'+u.host+'/api/v1';}catch(e){}}
  var ACCENT=window.YBotAccentColor||'#6366f1';
  var TITLE=window.YBotTitle||'Chat with us';
  var conversationId=null;
  var sessionId='ws_'+Date.now()+'_'+Math.random().toString(36).slice(2);
  var open=false,messages=[],loading=false;
  // CSAT state: null = not shown, 'pending' = awaiting rating, 1/-1 = rated
  var csatState=null;
  function css(el,s){Object.assign(el.style,s);}
  function mk(tag,a){var n=document.createElement(tag);for(var k in a)n.setAttribute(k,a[k]);return n;}
  var root=mk('div');css(root,{position:'fixed',bottom:'24px',right:'24px',zIndex:'2147483647',fontFamily:'system-ui,sans-serif'});
  var bubble=mk('button');css(bubble,{width:'56px',height:'56px',borderRadius:'50%',border:'none',cursor:'pointer',background:ACCENT,color:'#fff',boxShadow:'0 4px 20px rgba(0,0,0,.25)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',transition:'transform .2s'});
  bubble.innerHTML='&#128172;';bubble.title=TITLE;
  bubble.onmouseenter=function(){bubble.style.transform='scale(1.1)'};
  bubble.onmouseleave=function(){bubble.style.transform='scale(1)'};
  var panel=mk('div');css(panel,{position:'absolute',bottom:'72px',right:'0',width:'360px',height:'540px',background:'#fff',borderRadius:'16px',boxShadow:'0 12px 48px rgba(0,0,0,.18)',display:'none',flexDirection:'column',overflow:'hidden'});
  var hdr=mk('div');css(hdr,{background:ACCENT,color:'#fff',padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:'0'});
  var hTitle=mk('span');hTitle.textContent=TITLE;css(hTitle,{fontWeight:'600',fontSize:'15px'});
  var closeB=mk('button');closeB.innerHTML='&times;';css(closeB,{background:'none',border:'none',color:'#fff',cursor:'pointer',fontSize:'18px',padding:'2px 6px'});
  closeB.onclick=function(){toggle(false);};hdr.append(hTitle,closeB);
  var msgArea=mk('div');css(msgArea,{flex:'1',overflowY:'auto',padding:'12px',display:'flex',flexDirection:'column',gap:'8px'});
  var inputRow=mk('div');css(inputRow,{padding:'10px 12px',borderTop:'1px solid #f0f0f0',display:'flex',gap:'8px',flexShrink:'0'});
  var ta=mk('textarea');ta.placeholder='Type a message\u2026';ta.rows=1;css(ta,{flex:'1',resize:'none',border:'1px solid #e5e7eb',borderRadius:'8px',padding:'8px 12px',fontSize:'14px',fontFamily:'inherit',outline:'none',lineHeight:'1.4'});
  var sendB=mk('button');sendB.textContent='\u2191';css(sendB,{background:ACCENT,color:'#fff',border:'none',borderRadius:'8px',width:'36px',height:'36px',cursor:'pointer',fontSize:'18px',fontWeight:'bold',flexShrink:'0',alignSelf:'flex-end'});
  inputRow.append(ta,sendB);panel.append(hdr,msgArea,inputRow);root.append(panel,bubble);document.body.appendChild(root);
  function renderCsatCard(){
    if(csatState===null)return;
    var card=mk('div');css(card,{margin:'8px 0 4px',padding:'12px 14px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'12px',textAlign:'center'});
    if(csatState==='pending'){
      var lbl=mk('p');lbl.textContent='Was this conversation helpful?';css(lbl,{margin:'0 0 10px',fontSize:'13px',color:'#374151',fontWeight:'500'});
      var btns=mk('div');css(btns,{display:'flex',gap:'8px',justifyContent:'center'});
      var up=mk('button');up.innerHTML='\uD83D\uDC4D Yes';
      var dn=mk('button');dn.innerHTML='\uD83D\uDC4E No';
      [up,dn].forEach(function(b){css(b,{background:'#fff',border:'1px solid #d1d5db',borderRadius:'8px',padding:'6px 16px',cursor:'pointer',fontSize:'13px',color:'#374151',transition:'background .15s'});});
      up.onmouseover=function(){up.style.background='#dcfce7';};up.onmouseout=function(){up.style.background='#fff';};
      dn.onmouseover=function(){dn.style.background='#fee2e2';};dn.onmouseout=function(){dn.style.background='#fff';};
      up.onclick=function(){submitCsat(1);};dn.onclick=function(){submitCsat(-1);};
      btns.append(up,dn);card.append(lbl,btns);
    } else {
      var thanks=mk('p');
      thanks.textContent=csatState===1?'\uD83D\uDC4D Thanks for the positive feedback!':'\uD83D\uDC4E Thanks for letting us know!';
      css(thanks,{margin:'0',fontSize:'13px',color:'#6b7280'});card.appendChild(thanks);
    }
    msgArea.appendChild(card);
  }
  function render(){
    msgArea.innerHTML='';
    messages.forEach(function(m){
      var row=mk('div');css(row,{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'});
      var bub=mk('div');css(bub,{maxWidth:'80%',padding:'8px 12px',borderRadius:m.role==='user'?'14px 14px 2px 14px':'14px 14px 14px 2px',background:m.role==='user'?ACCENT:'#f3f4f6',color:m.role==='user'?'#fff':'#111',fontSize:'14px',lineHeight:'1.5',whiteSpace:'pre-wrap',wordBreak:'break-word'});
      bub.textContent=m.text+(m.streaming?'\u258b':'');
      row.appendChild(bub);msgArea.appendChild(row);
    });
    renderCsatCard();
    msgArea.scrollTop=msgArea.scrollHeight;
  }
  function addMsg(role,text,streaming){messages.push({role:role,text:text,streaming:streaming||false});render();return messages.length-1;}
  function updMsg(i,text,streaming,done){
    if(messages[i]){messages[i].text=text;messages[i].streaming=streaming||false;}
    if(done&&messages.filter(function(m){return m.role==='user';}).length>=1&&csatState===null){csatState='pending';}
    render();
  }
  function submitCsat(rating){
    if(!conversationId)return;
    csatState=rating;render();
    fetch(API_BASE+'/public/csat/'+channelId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:conversationId,rating:rating})}).catch(function(){});
  }
  async function send(){
    var text=ta.value.trim();if(!text||loading)return;
    ta.value='';loading=true;sendB.disabled=true;
    var hist=messages.slice(-10).map(function(m){return{role:m.role==='user'?'user':'assistant',content:m.text};});
    addMsg('user',text);var bi=addMsg('bot','',true);
    try{
      var res=await fetch(API_BASE+'/public/chat/'+channelId,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,sessionId:sessionId,conversationId:conversationId,history:hist})});
      if(!res.ok||!res.body){updMsg(bi,'Sorry, something went wrong. ('+res.status+')');loading=false;sendB.disabled=false;return;}
      var reader=res.body.getReader(),dec=new TextDecoder(),buf='',botText='';
      while(true){
        var r=await reader.read();if(r.done)break;
        buf+=dec.decode(r.value,{stream:true});
        var lines=buf.split('\\n');buf=lines.pop()||'';
        for(var i=0;i<lines.length;i++){
          var line=lines[i];
          if(line.startsWith('data: ')){try{var d=JSON.parse(line.slice(6));if(d.conversationId)conversationId=d.conversationId;if(d.chunk){botText+=d.chunk;updMsg(bi,botText,true);}if(d.done)updMsg(bi,botText,false,true);}catch(e){}}
        }
      }
      if(!botText)updMsg(bi,"I\\'m sorry, I couldn\\'t generate a response.",false,true);
    }catch(e){updMsg(bi,"Couldn\\'t reach the server. Please try again.");}
    finally{loading=false;sendB.disabled=false;}
  }
  function toggle(force){open=force!==undefined?force:!open;panel.style.display=open?'flex':'none';bubble.innerHTML=open?'&times;':'&#128172;';if(open&&messages.length===0)addMsg('bot','Hello! &#128075; How can I help you today?');if(open)setTimeout(function(){ta.focus();},50);}
  bubble.onclick=function(){toggle();};sendB.onclick=send;
  ta.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}};
})();`

export async function widgetRoutes(app: FastifyInstance) {

  // Handle OPTIONS preflight for all public/* and widget.js
  app.options('/widget.js', async (_req, reply) => { setCors(reply); return reply.status(204).send() })
  app.options('/public/*', async (_req, reply) => { setCors(reply); return reply.status(204).send() })

  // ── GET /widget.js ─────────────────────────────────────────────────────────
  app.get('/widget.js', async (_request, reply) => {
    setCors(reply)
    reply.header('Content-Type', 'application/javascript; charset=utf-8')
    reply.header('Cache-Control', 'public, max-age=300')

    // Try to serve the pre-built bundle first
    try {
      const __dir = dirname(fileURLToPath(import.meta.url))
      const candidates = [
        resolve(__dir, '../../embed/dist/widget.js'),
        resolve(__dir, '../../../apps/embed/dist/widget.js'),
      ]
      for (const p of candidates) {
        try { return reply.send(await readFile(p, 'utf8')) } catch { /* try next */ }
      }
    } catch { /* fall through */ }

    // Fall back to the inline version
    return reply.send(WIDGET_INLINE_JS)
  })

  // ── GET /widget-test/:channelId — browser test page ────────────────────────
  app.get<{ Params: { channelId: string } }>('/widget-test/:channelId', async (request, reply) => {
    const { channelId } = request.params
    const channel = await prisma.channel.findFirst({ where: { id: channelId, isActive: true }, include: { bot: true } })
    const botName = channel?.bot?.name ?? 'YBot'
    const origin  = `${request.protocol ?? 'http'}://${request.hostname}`

    return reply
      .header('Content-Type', 'text/html; charset=utf-8')
      .send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${botName} — Widget Test</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#f8fafc;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;color:#334155}
    .card{background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:90%;text-align:center}
    h1{font-size:1.5rem;font-weight:700;margin-bottom:8px}
    p{color:#64748b;font-size:.95rem;line-height:1.6}
    .badge{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 12px;font-family:monospace;font-size:.8rem;color:#475569;margin-top:16px}
    .arrow{font-size:2rem;position:fixed;bottom:90px;right:30px;animation:bounce .8s infinite alternate}
    @keyframes bounce{from{transform:translateX(0)}to{transform:translateX(8px)}}
  </style>
</head>
<body>
  <div class="card">
    <h1>🤖 ${botName}</h1>
    <p>The chat widget is loaded in the bottom-right corner.<br/>Click the 💬 bubble to start a conversation.</p>
    <div class="badge">Channel: ${channelId}</div>
  </div>
  <div class="arrow">👉</div>
  <script>window.YBotTitle='${botName}';</script>
  <script src="${origin}/api/v1/widget.js?id=${channelId}" async></script>
</body>
</html>`)
  })

  // ── POST /public/chat/:channelId — public SSE streaming chat ───────────────
  app.post<{ Params: { channelId: string } }>('/public/chat/:channelId', async (request, reply) => {
    setCors(reply)
    const { channelId } = request.params
    const body = request.body as {
      message?: string
      sessionId?: string
      conversationId?: string
      history?: Array<{ role: string; content: string }>
    }
    const userText = (body.message ?? '').trim()
    if (!userText) return reply.status(400).send({ error: 'message required' })

    const channel = await prisma.channel.findFirst({ where: { id: channelId, isActive: true }, include: { bot: true } })
    if (!channel?.bot) return reply.status(404).send({ error: 'Channel not found' })

    const { tenantId, botId, bot } = { tenantId: channel.tenantId, botId: channel.botId, bot: channel.bot }

    // ── Resolve or create a conversation ──────────────────────────────────
    let conversationId = body.conversationId ?? null
    if (conversationId) {
      // Verify it belongs to this channel
      const exists = await prisma.conversation.findFirst({ where: { id: conversationId, tenantId, channelId } })
      if (!exists) conversationId = null
    }

    if (!conversationId) {
      const env = await prisma.environment.findFirst({ where: { botId } })
      if (env) {
        // Upsert an anonymous contact keyed by sessionId
        const sessionId = body.sessionId ?? `anon_${Date.now()}`
        let contact = await prisma.contact.findFirst({ where: { tenantId, externalId: sessionId } })
        if (!contact) {
          contact = await prisma.contact.create({
            data: { tenantId, externalId: sessionId, displayName: 'Visitor', channelId },
          })
        }
        const convo = await prisma.conversation.create({
          data: { tenantId, botId, environmentId: env.id, channelId, contactId: contact.id, status: 'active' },
        })
        conversationId = convo.id
      }
    }

    // ── Save inbound user message ────────────────────────────────────────
    if (conversationId) {
      await prisma.message.create({
        data: { tenantId, conversationId, direction: 'inbound', authorKind: 'user', content: { text: userText } },
      }).catch(() => {})
    }

    // ── LLM config ────────────────────────────────────────────────────────
    const cfg = await prisma.botConfig.findUnique({ where: { botId } }).catch(() => null)
    const systemPrompt = cfg?.systemPrompt ?? `You are a helpful assistant for ${bot.name}. Answer using the knowledge base context.`
    const model = cfg?.model ?? undefined
    const temperature = cfg?.temperature ?? 0.3
    const maxTokens = cfg?.maxTokens ?? 2048

    // ── RAG context ────────────────────────────────────────────────────────
    const ragChunks = await ragSearch(userText, tenantId, botId)
    const contextBlock = ragChunks.length > 0
      ? `\n\n--- KNOWLEDGE BASE ---\n${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n--- END KNOWLEDGE BASE ---\n\nAnswer using only this context. If unknown, say so.`
      : ''

    // ── History ────────────────────────────────────────────────────────────
    const history: LlmMessage[] = (body.history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const messages: LlmMessage[] = [...history, { role: 'user', content: userText }]

    // ── SSE stream ─────────────────────────────────────────────────────────
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.setHeader('Access-Control-Allow-Origin', '*')
    reply.raw.flushHeaders?.()

    const send = (data: object) => reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)

    // Emit conversationId first so client can persist it
    if (conversationId) send({ conversationId })

    let fullText = ''
    try {
      await llm.stream({
        messages, systemPrompt: systemPrompt + contextBlock, model, temperature, maxTokens,
        onChunk: (chunk) => { fullText += chunk; send({ chunk }) },
      })
      send({ done: true })
    } catch {
      send({ chunk: "I'm sorry, something went wrong. Please try again.", done: true })
      fullText = "I'm sorry, something went wrong."
    } finally {
      // ── Save bot reply ──────────────────────────────────────────────────
      if (conversationId && fullText.trim()) {
        await prisma.message.create({
          data: { tenantId, conversationId, direction: 'outbound', authorKind: 'bot', content: { text: fullText } },
        }).catch(() => {})
      }
      reply.raw.end()
    }
  })

  // ── POST /public/csat/:channelId — rate a bot response ────────────────────
  app.post<{ Params: { channelId: string } }>('/public/csat/:channelId', async (request, reply) => {
    setCors(reply)
    const { channelId } = request.params
    const { conversationId, rating, messageId, comment } = request.body as {
      conversationId?: string; rating?: number; messageId?: string; comment?: string
    }
    if (!conversationId || (rating !== 1 && rating !== -1)) {
      return reply.status(400).send({ error: 'conversationId and rating (1 or -1) required' })
    }

    const convo = await prisma.conversation.findFirst({ where: { id: conversationId, channelId } })
    if (!convo) return reply.status(404).send({ error: 'Not found' })

    await prisma.csatResponse.create({
      data: { tenantId: convo.tenantId, conversationId, messageId, rating, comment },
    })
    return reply.send({ ok: true })
  })
}
