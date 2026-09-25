const API = 'https://app.botstudio.uk/api/v1/public/chat/botstudio-web'

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

/** A page load starts a new chat. An earlier visit does not resume a finished session. */
export function freshHeroSession(): string {
  return `web_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function heroPayload(input: {
  sessionId: string
  conversationId?: string | null
  message?: string
  opening?: boolean
}): { sessionId: string; conversationId?: string; message?: string; opening?: boolean } {
  return {
    sessionId: input.sessionId,
    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
    ...(input.opening ? { opening: true } : { message: input.message ?? '' }),
  }
}

export function startHeroChat(els: HeroChatEls, endpoint = API): void {
  const { log, form, input } = els
  const sendBtn = form.querySelector<HTMLButtonElement>('button')
  const sessionId = freshHeroSession()
  let conversationId: string | null = null
  let chain: Promise<void> = Promise.resolve()

  function bubble(role: 'user' | 'bot', text: string): HTMLParagraphElement {
    const node = document.createElement('p')
    node.className = role === 'user' ? 'bubble mine' : 'bubble'
    node.textContent = text
    log.append(node)
    log.scrollTop = log.scrollHeight
    return node
  }

  async function deliver(text: string, opening: boolean): Promise<void> {
    if (sendBtn) sendBtn.disabled = true
    const reply = bubble('bot', '')
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroPayload({ sessionId, conversationId, message: text, opening })),
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
          if (item.conversationId) conversationId = item.conversationId
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
      if (sendBtn) sendBtn.disabled = false
    }
  }

  function enqueue(text: string, opening: boolean): void {
    chain = chain.then(() => deliver(text, opening))
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    const text = input.value.trim()
    if (!text) return
    input.value = ''
    bubble('user', text)
    enqueue(text, false)
    input.focus()
  })

  enqueue('', true)
}
