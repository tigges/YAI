import type { FastifyInstance, FastifyRequest } from 'fastify'

type WsClient = {
  send(data: string): void
  readyState: number
  on(event: string, cb: (data: Buffer | string) => void): void
}
const WS_OPEN = 1

// Tenant → set of open sockets
const clients = new Map<string, Set<WsClient>>()

/** Broadcast a JSON-serialisable event to every WS client for a given tenant. */
export function broadcastToTenant(tenantId: string, event: object): void {
  const payload = JSON.stringify(event)
  for (const ws of clients.get(tenantId) ?? []) {
    if (ws.readyState === WS_OPEN) {
      try { ws.send(payload) } catch { /* ignore dead socket */ }
    }
  }
}

export async function wsRoutes(app: FastifyInstance) {
  // @ts-ignore — websocket handler type provided by @fastify/websocket
  app.get('/ws', { websocket: true }, (connection: { socket: WsClient }, request: FastifyRequest) => {
    const socket = connection.socket
    const token = (request.query as Record<string, string>)['token']
    let tenantId = ''

    try {
      const decoded = app.jwt.verify<{ tenantId: string }>(token ?? '')
      tenantId = decoded.tenantId
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
      return
    }

    if (!clients.has(tenantId)) clients.set(tenantId, new Set())
    clients.get(tenantId)!.add(socket)

    socket.send(JSON.stringify({ type: 'connected', tenantId }))

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string }
        if (msg.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }))
      } catch { /* ignore */ }
    })

    socket.on('close', () => {
      clients.get(tenantId)?.delete(socket)
    })
  })
}
