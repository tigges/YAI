const API = 'https://app.botstudio.uk/api/v1/public/chat/botstudio-web'
const SESSION_KEY = 'botstudio-hero-session'
const CONVO_KEY = 'botstudio-hero-conversation'

export interface HeroChatEls {
  log: HTMLElement
  form: HTMLFormElement
  input: HTMLInputElement
}

export function readSseEvents(buffer: string): { events: Array<{ conversationId?: string; chunk?: string; done?: boolean }>; rest: string } {
  const lines = buffer.split('\n')
  const rest = lines.pop() ?? ''
  const events: Array<{ conversationId?: string; chunk?: string; done?: boolean }> = []
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    try {
      events.push(JSON.parse(line.slice(6)) as { conversationId?: string; chunk?: string; done?: boolean })
    } catch {
      /* ignore a partial frame */
    }
  }
  return { events, rest }
}

export function startHeroChat(els: HeroChatEls, endpoint = API): void {
  const { log, form, input } = els
  const sendBtn = form.querySelector<HTMLButtonElement>('button')
  let sessionId = sessionStorage.getItem(SESSION_KEY) ?? ''
  if (!sessionId) {
    sessionId = `web_${Date.now()}_${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  let conversationId = sessionStorage.getItem(CONVO_KEY)
  let busy = false

  const empty = document.createElement('p')
  empty.className = 'widget-empty'
  empty.textContent = 'Ask a question. This chat is live.'
  log.append(empty)

  function bubble(role: 'user' | 'bot', text: string): HTMLParagraphElement {
    empty.remove()
    const node = document.createElement('p')
    node.className = role === 'user' ? 'bubble mine' : 'bubble'
    node.textContent = text
    log.append(node)
    log.scrollTop = log.scrollHeight
    return node
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text || busy) return
    busy = true
    if (sendBtn) sendBtn.disabled = true
    input.value = ''
    bubble('user', text)
    const reply = bubble('bot', '')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId, conversationId }),
      })
      if (!res.ok || !res.body) throw new Error(String(res.status))
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let spoken = ''
      while (true) {
        const part = await reader.read()
        if (part.done) break
        buf += decoder.decode(part.value, { stream: true })
        const parsed = readSseEvents(buf)
        buf = parsed.rest
        for (const item of parsed.events) {
          if (item.conversationId) {
            conversationId = item.conversationId
            sessionStorage.setItem(CONVO_KEY, item.conversationId)
          }
          if (item.chunk) {
            spoken += item.chunk
            reply.textContent = spoken
            log.scrollTop = log.scrollHeight
          }
        }
      }
      if (!spoken) reply.textContent = 'I could not write a reply. Please try again.'
    } catch {
      reply.textContent = 'Could not reach the server. Please try again.'
    } finally {
      busy = false
      if (sendBtn) sendBtn.disabled = false
      input.focus()
    }
  })
}
