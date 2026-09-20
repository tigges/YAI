/**
 * Runtime bridge: handles inbound messages and runs the SessionMachine OR
 * falls back to a direct RAG → Claude path when no published flow exists.
 *
 * Flow (with published flow):
 *  1. Inbound user message arrives at POST /conversations/:id/messages
 *  2. Load/create a Session in Redis (Valkey)
 *  3. Run SessionMachine against the flow graph
 *  4. Persist bot reply messages, broadcast over WS
 *
 * Flow (no published flow / direct LLM mode):
 *  1. Embed user message via OpenAI text-embedding-3-small
 *  2. pgvector cosine search over DocumentChunk for top-5 context chunks
 *  3. Stream Anthropic Claude ragComplete() — each chunk is broadcast
 *     as { event: 'message.chunk', data: { conversationId, chunk } }
 *  4. When stream completes, save full bot message, broadcast message.created
 */

import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { SessionMachine } from '@ybot/runtime'
import type { Session, ExecutionServices } from '@ybot/runtime'
import { createLlmAdapter, createEmbeddingAdapter } from '@ybot/llm'

const prisma = new PrismaClient()
const llm = createLlmAdapter()
const embedAdapter = createEmbeddingAdapter()

// ── Redis / session helpers ───────────────────────────────────────────────────
let redisClient: import('ioredis').Redis | null = null
async function getRedis(): Promise<import('ioredis').Redis | null> {
  if (redisClient) return redisClient
  try {
    const ioredis = await import('ioredis')
    const Redis = ioredis.default ?? (ioredis as unknown as { new(url: string, opts: object): import('ioredis').Redis })
    redisClient = new (Redis as unknown as new (url: string, opts: object) => import('ioredis').Redis)(
      process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000 },
    )
    await (redisClient as import('ioredis').Redis & { connect(): Promise<void> }).connect()
    return redisClient!
  } catch {
    return null
  }
}

const SESSION_TTL = 3600

async function loadSession(conversationId: string): Promise<Session | null> {
  const r = await getRedis()
  if (!r) return null
  try {
    const raw = await r.get(`session:${conversationId}`)
    if (raw) return JSON.parse(raw) as Session
  } catch { /* redis unavailable */ }
  return null
}

async function saveSession(session: Session): Promise<void> {
  const r = await getRedis()
  if (!r) return
  try {
    await r.set(`session:${session.conversationId}`, JSON.stringify(session), 'EX', SESSION_TTL)
  } catch { /* redis unavailable */ }
}

function buildServices(): ExecutionServices {
  return { llm, db: prisma, httpFetch: fetch }
}

// ── RAG search ────────────────────────────────────────────────────────────────
async function searchRag(query: string, tenantId: string, botId: string, topK = 5): Promise<string[]> {
  try {
    const embedResult = await embedAdapter.embed({ texts: [query] })
    const embedding = embedResult.embeddings[0]
    if (!embedding || embedding.length === 0) return []

    const rows = await (prisma.$queryRawUnsafe as (sql: string, ...params: unknown[]) => Promise<Array<{ content: string; similarity: number }>>)(
      `SELECT dc.content, 1 - (dc.embedding <=> $1::vector) AS similarity
       FROM "document_chunks" dc
       JOIN "documents" d ON dc."documentId" = d.id
       JOIN "knowledge_sources" ks ON d."knowledgeSourceId" = ks.id
       WHERE dc."tenantId" = $2
         AND ks."botId" = $3
         AND dc.embedding IS NOT NULL
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $4`,
      JSON.stringify(embedding),
      tenantId,
      botId,
      topK,
    )
    return rows.map((r) => r.content)
  } catch {
    return []
  }
}

// ── Direct LLM path (no flow) ─────────────────────────────────────────────────
async function handleDirectLlm(
  app: FastifyInstance,
  conversationId: string,
  tenantId: string,
  botId: string,
  incomingText: string,
  systemPrompt: string,
): Promise<void> {
  const context = await searchRag(incomingText, tenantId, botId)

  // Accumulate streamed chunks; broadcast each one over WS
  let fullContent = ''
  const onChunk = (chunk: string) => {
    fullContent += chunk
    app.broadcastToTenant(tenantId, {
      event: 'message.chunk',
      data: { conversationId, chunk },
    })
  }

  await llm.ragComplete({
    question: incomingText,
    context,
    systemPrompt,
    onChunk,
  })

  if (!fullContent.trim()) {
    fullContent = "I'm sorry, I couldn't find a good answer for that right now."
  }

  const saved = await prisma.message.create({
    data: { tenantId, conversationId, direction: 'outbound', authorKind: 'bot', content: { text: fullContent } },
  })
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })

  app.broadcastToTenant(tenantId, { event: 'message.created', data: saved })
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function processInboundMessage(
  app: FastifyInstance,
  conversationId: string,
  tenantId: string,
  incomingText: string,
): Promise<void> {
  try {
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        bot: {
          include: {
            flows: {
              include: { versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 } },
              take: 1,
            },
          },
        },
      },
    })
    if (!convo?.bot) return

    const flow = convo.bot.flows?.[0]
    const version = flow?.versions?.[0]

    // ── No published flow → use direct RAG + LLM path ──────────────────────
    if (!flow || !version?.graph) {
      await handleDirectLlm(
        app,
        conversationId,
        tenantId,
        convo.botId ?? convo.bot.id,
        incomingText,
        `You are a helpful assistant for ${convo.bot.name}. Answer using only the provided knowledge base context. If you don't know, say so politely.`,
      )
      return
    }

    // ── Published flow path ────────────────────────────────────────────────
    const graph = version.graph as unknown as import('@ybot/runtime').FlowGraph

    let session = await loadSession(conversationId)
    if (!session || session.status === 'completed' || session.status === 'handed_over') {
      const nodes = (graph.nodes ?? []) as Array<{ id: string; data: { kind: string } }>
      const startNode = nodes.find((n) => n.data.kind === 'trigger_start' || n.data.kind === 'start')
      if (!startNode) return
      session = {
        id: `s_${Date.now()}`,
        conversationId,
        botId: convo.botId ?? convo.bot.id,
        tenantId,
        flowId: flow.id,
        flowVersionId: version.id,
        currentNodeId: startNode.id,
        variables: { flow: { last_user_message: incomingText }, global: {}, contact: {} },
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    } else {
      session.variables.flow['last_user_message'] = incomingText
    }

    const machine = new SessionMachine(buildServices())
    const result = await machine.run(session, graph, incomingText)

    for (const msg of result.newMessages) {
      const saved = await prisma.message.create({
        data: { tenantId, conversationId, direction: 'outbound', authorKind: 'bot', content: msg.content },
      })
      app.broadcastToTenant(tenantId, { event: 'message.created', data: saved })
    }

    if (result.handover) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'escalated', updatedAt: new Date() } })
    }
    if (result.completed) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'resolved', updatedAt: new Date() } })
    }

    await saveSession(result.session)
  } catch (err) {
    app.log.error({ err, conversationId }, 'Runtime bridge error')
  }
}
