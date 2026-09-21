/**
 * Public (no-auth) routes for the embeddable chat widget.
 *
 * GET  /widget.js          — serves the compiled embed widget script
 * POST /public/chat/:channelId — SSE streaming chat for external sites
 */

import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { createLlmAdapter, createEmbeddingAdapter } from '@ybot/llm'
import type { LlmMessage } from '@ybot/llm'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const prisma = new PrismaClient()
const llm    = createLlmAdapter()
const embed  = createEmbeddingAdapter()

// ── RAG search (same as runtime-bridge but self-contained here) ────────────────
async function ragSearch(query: string, tenantId: string, botId: string, topK = 4): Promise<string[]> {
  try {
    const result = await embed.embed({ texts: [query] })
    const vec = result.embeddings[0]
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

export async function widgetRoutes(app: FastifyInstance) {
  // ── GET /widget.js — serve pre-built embed script ────────────────────────
  app.get('/widget.js', async (_request, reply) => {
    try {
      const __dir = dirname(fileURLToPath(import.meta.url))
      // Look for the built widget; path: apps/embed/dist/widget.js relative to this file's location
      const candidates = [
        resolve(__dir, '../../embed/dist/widget.js'),
        resolve(__dir, '../../../apps/embed/dist/widget.js'),
      ]
      let js: string | null = null
      for (const p of candidates) {
        try { js = await readFile(p, 'utf8'); break } catch { /* try next */ }
      }
      if (!js) {
        // Return a minimal stub if not built yet
        js = `(function(){console.warn('[YBot Widget] Build not found. Run: pnpm --filter @ybot/embed build');})();`
      }
      return reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300')
        .send(js)
    } catch {
      return reply.status(500).send('// Widget unavailable')
    }
  })

  // ── POST /public/chat/:channelId — public streaming chat ─────────────────
  app.post<{ Params: { channelId: string } }>('/public/chat/:channelId', async (request, reply) => {
    const { channelId } = request.params
    const body = request.body as {
      message?: string
      sessionId?: string
      history?: Array<{ role: string; content: string }>
    }
    const userText = (body.message ?? '').trim()
    if (!userText) return reply.status(400).send({ error: 'message required' })

    // Resolve channel → bot → tenant
    const channel = await prisma.channel.findFirst({ where: { id: channelId, isActive: true }, include: { bot: true } })
    if (!channel?.bot) return reply.status(404).send({ error: 'Channel not found' })

    const { tenantId, botId, bot } = { tenantId: channel.tenantId, botId: channel.botId, bot: channel.bot }

    // Load per-bot LLM config
    const cfg = await prisma.botConfig.findUnique({ where: { botId } }).catch(() => null)
    const systemPrompt = cfg?.systemPrompt
      ?? `You are a helpful assistant for ${bot.name}. Answer using the provided knowledge base context.`
    const model = cfg?.model ?? undefined
    const temperature = cfg?.temperature ?? 0.3
    const maxTokens = cfg?.maxTokens ?? 2048

    // RAG context
    const ragChunks = await ragSearch(userText, tenantId, botId)
    const contextBlock = ragChunks.length > 0
      ? `\n\n--- KNOWLEDGE BASE ---\n${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}\n--- END KNOWLEDGE BASE ---\n\nAnswer using only this context. If unknown, say so.`
      : ''

    // Build message history
    const history: LlmMessage[] = (body.history ?? [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const messages: LlmMessage[] = [...history, { role: 'user', content: userText }]

    // SSE stream response
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.flushHeaders?.()

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      await llm.stream({
        messages,
        systemPrompt: systemPrompt + contextBlock,
        model,
        temperature,
        maxTokens,
        onChunk: (chunk) => send({ chunk }),
      })
      send({ done: true })
    } catch (err) {
      send({ chunk: "I'm sorry, something went wrong. Please try again.", done: true })
    } finally {
      reply.raw.end()
    }
  })
}
