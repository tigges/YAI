/**
 * flow-runner.ts
 *
 * Integrates the @ybot/runtime SessionMachine with the widget public chat route.
 * When a bot has a published FlowVersion for its environment, this module
 * intercepts incoming messages, runs them through the flow graph, and
 * returns the collected outbound messages instead of falling through to
 * the bare RAG/LLM pipeline.
 *
 * Session state (current node, flow variables, waiting status) is persisted
 * in the `flow_sessions` table so it survives across HTTP requests.
 */

import { randomUUID } from 'node:crypto'
import { SessionMachine } from '@ybot/runtime'
import type { Session, SessionVariables, FlowGraph } from '@ybot/runtime'
import { prisma } from '@ybot/db'
import { createLlmAdapter, createLlmAdapterForModel } from '@ybot/llm'

const defaultLlm = createLlmAdapter({
  provider: (process.env['LLM_PROVIDER'] as 'openai' | 'anthropic' | 'groq' | 'ollama' | 'gemini') ?? 'openai',
  apiKey: process.env['LLM_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '',
  model: process.env['LLM_MODEL'],
  baseUrl: process.env['LLM_BASE_URL'],
})

export interface FlowRunResult {
  /** true when a published flow was found and handled the message */
  handled: boolean
  /** Collected outbound text messages from the flow */
  messages: string[]
  /** Non-null when the flow triggered a human handover */
  handover?: { team?: string; priority?: string; note?: string }
  /** Non-null when the flow is waiting for the user's next input */
  waitingFor?: Session['waitingFor']
}

/**
 * Try to handle an incoming user message through a published flow.
 * Returns `{ handled: false }` when no published flow is configured for the bot,
 * allowing the caller to fall back to RAG/LLM.
 */
export async function runFlowIfPublished(opts: {
  conversationId: string
  botId: string
  tenantId: string
  userText: string
}): Promise<FlowRunResult> {
  const { conversationId, botId, tenantId, userText } = opts

  // ── 1. Find the conversation's environment ─────────────────────────────────
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId },
    select: { environmentId: true },
  })
  const envId = convo?.environmentId
  if (!envId) return { handled: false, messages: [] }

  // ── 2. Find the most recently published FlowVersion for this bot + env ──────
  const publishedVersion = await prisma.flowVersion.findFirst({
    where: {
      flow: { botId },
      status: 'published',
      environmentId: envId,
    },
    include: { flow: true },
    orderBy: { publishedAt: 'desc' },
  })
  if (!publishedVersion) return { handled: false, messages: [] }

  const graph = publishedVersion.graph as unknown as FlowGraph
  const startNode = graph.nodes.find((n) => n.data.kind === 'trigger_start')
  if (!startNode) return { handled: false, messages: [] }

  // ── 3. Load or create the FlowSession for this conversation ─────────────────
  const fsRecord = await prisma.flowSession.findUnique({ where: { conversationId } })

  let session: Session
  if (!fsRecord) {
    session = {
      id: randomUUID(),
      conversationId,
      botId,
      tenantId,
      flowId: publishedVersion.flowId,
      flowVersionId: publishedVersion.id,
      currentNodeId: startNode.id,
      variables: {
        flow: { _last_user_message: userText },
        global: {},
        contact: {},
      } satisfies SessionVariables,
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await prisma.flowSession.create({
      data: {
        id: session.id,
        tenantId,
        conversationId,
        botId,
        flowId: publishedVersion.flowId,
        flowVersionId: publishedVersion.id,
        currentNodeId: startNode.id,
        variables: session.variables as object,
        status: 'running',
      },
    })
  } else {
    const vars = fsRecord.variables as unknown as SessionVariables
    vars.flow['_last_user_message'] = userText
    session = {
      id: fsRecord.id,
      conversationId,
      botId: fsRecord.botId,
      tenantId: fsRecord.tenantId,
      flowId: fsRecord.flowId,
      flowVersionId: fsRecord.flowVersionId,
      currentNodeId: fsRecord.currentNodeId,
      variables: vars,
      status: fsRecord.status as Session['status'],
      waitingFor: fsRecord.waitingFor as Session['waitingFor'] | undefined,
      createdAt: fsRecord.createdAt,
      updatedAt: fsRecord.updatedAt,
    }
  }

  // ── 4. Build the LLM adapter (respects saved BotConfig model selection) ──────
  const cfg = await prisma.botConfig.findUnique({ where: { botId } }).catch(() => null)
  const model = cfg?.model ?? undefined
  const llmAdapter = model ? createLlmAdapterForModel(model) : defaultLlm

  // ── 5. Run the flow engine ────────────────────────────────────────────────────
  const machine = new SessionMachine({
    llm: llmAdapter,
    db: prisma,
    httpFetch: fetch,
  })

  const result = await machine.run(session, graph, userText)
  const updatedSession = result.session

  // ── 6. Persist the updated session ───────────────────────────────────────────
  if (updatedSession.status === 'completed') {
    // Delete so the flow restarts fresh next conversation
    await prisma.flowSession.delete({ where: { conversationId } }).catch(() => {})
  } else {
    await prisma.flowSession.upsert({
      where: { conversationId },
      create: {
        id: updatedSession.id,
        tenantId,
        conversationId,
        botId,
        flowId: updatedSession.flowId,
        flowVersionId: updatedSession.flowVersionId,
        currentNodeId: updatedSession.currentNodeId,
        variables: updatedSession.variables as object,
        status: updatedSession.status,
        waitingFor: updatedSession.waitingFor ? (updatedSession.waitingFor as object) : undefined,
      },
      update: {
        currentNodeId: updatedSession.currentNodeId,
        variables: updatedSession.variables as object,
        status: updatedSession.status,
        waitingFor: updatedSession.waitingFor ? (updatedSession.waitingFor as object) : undefined,
      },
    })
  }

  // ── 7. Handle human handover ──────────────────────────────────────────────────
  if (result.handover) {
    await prisma.conversation
      .update({ where: { id: conversationId }, data: { status: 'waiting_agent' } })
      .catch(() => {})
  }

  const messages = result.newMessages.map((m) => m.content.text)

  return {
    handled: true,
    messages,
    handover: result.handover,
    waitingFor: updatedSession.waitingFor,
  }
}
