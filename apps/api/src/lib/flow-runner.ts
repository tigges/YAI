/**
 * flow-runner.ts
 *
 * Integrates the @ybot/runtime SessionMachine with the widget public chat route.
 * The newest published welcome flow is the entry. An execute_flow node jumps
 * into another published flow in the same environment. Session state is stored
 * in flow_sessions so a later message resumes the flow the visitor is in.
 */

import { randomUUID } from 'node:crypto'
import { SessionMachine } from '@ybot/runtime'
import type { Session, SessionVariables, FlowGraph } from '@ybot/runtime'
import { prisma } from '@ybot/db'
import { createLlmAdapter, createLlmAdapterForModel } from '@ybot/llm'
import { usableContactName } from './contact-name.js'
import { pickEntry } from './entry-flow.js'
import { runFlowTurn } from './flow-turn.js'

const defaultLlm = createLlmAdapter({
  provider: (process.env['LLM_PROVIDER'] as 'openai' | 'anthropic' | 'groq' | 'ollama' | 'gemini') ?? 'openai',
  apiKey: process.env['LLM_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '',
  model: process.env['LLM_MODEL'],
  baseUrl: process.env['LLM_BASE_URL'],
})

export interface FlowRunResult {
  handled: boolean
  messages: string[]
  handover?: { team?: string; priority?: string; note?: string }
  waitingFor?: Session['waitingFor']
  flowName?: string
}

type VersionRow = {
  id: string
  flowId: string
  graph: unknown
  flow: { name: string; tags: string[] }
}

function startNodeId(graph: FlowGraph): string | undefined {
  return graph.nodes.find((node) => node.data.kind === 'trigger_start' || node.data.kind === 'start')?.id
}

function spoken(name: string | null | undefined): string {
  const usable = usableContactName(name)
  return usable ? usable.split(' ')[0]! : 'there'
}

export async function runFlowIfPublished(opts: {
  conversationId: string
  botId: string
  tenantId: string
  userText: string
}): Promise<FlowRunResult> {
  const { conversationId, botId, tenantId, userText } = opts

  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId },
    select: { environmentId: true, subject: true, contact: { select: { displayName: true } } },
  })
  const envId = convo?.environmentId
  if (!envId) return { handled: false, messages: [] }

  const fsRecord = await prisma.flowSession.findUnique({ where: { conversationId } })
  const active = fsRecord
    ? await prisma.flowVersion.findUnique({ where: { id: fsRecord.flowVersionId }, include: { flow: true } })
    : await entryVersion(botId, envId)
  if (!active) return { handled: false, messages: [] }

  const cfg = await prisma.botConfig.findUnique({ where: { botId } }).catch(() => null)
  const model = cfg?.model ?? undefined
  const llmAdapter = model ? createLlmAdapterForModel(model) : defaultLlm
  const machine = new SessionMachine({ llm: llmAdapter, db: prisma, httpFetch: fetch })

  const first = await runVersion({
    machine,
    version: active,
    fsRecord,
    conversationId,
    botId,
    tenantId,
    userText,
    contactName: spoken(convo?.contact?.displayName),
  })
  if (!first) return { handled: false, messages: [] }

  let version = active
  let outcome = first
  if (first.jumpToFlow) {
    const target = await prisma.flowVersion.findFirst({
      where: { status: 'published', environmentId: envId, flow: { botId, name: first.jumpToFlow } },
      include: { flow: true },
      orderBy: { publishedAt: 'desc' },
    })
    if (!target) {
      outcome = {
        ...first,
        messages: [...first.messages, `I can help with ${first.jumpToFlow}. A person on the team will follow up.`],
        jumpToFlow: undefined,
      }
    } else {
      const jumped = await runVersion({
        machine,
        version: target,
        fsRecord: null,
        conversationId,
        botId,
        tenantId,
        userText,
        contactName: spoken(convo?.contact?.displayName),
      })
      if (jumped) {
        version = target
        outcome = { ...jumped, messages: [...first.messages, ...jumped.messages] }
        if (!convo?.subject) {
          await prisma.conversation.update({ where: { id: conversationId }, data: { subject: target.flow.name } }).catch(() => {})
        }
      }
    }
  }

  const visible = outcome.messages.some((message) => message.trim().length > 0)
  if (!visible && !outcome.handover) {
    await prisma.flowSession.delete({ where: { conversationId } }).catch(() => {})
    return { handled: false, messages: [] }
  }

  if (outcome.session.status === 'completed') {
    await prisma.flowSession.delete({ where: { conversationId } }).catch(() => {})
  } else {
    await prisma.flowSession.upsert({
      where: { conversationId },
      create: {
        id: outcome.session.id,
        tenantId,
        conversationId,
        botId,
        flowId: version.flowId,
        flowVersionId: version.id,
        currentNodeId: outcome.session.currentNodeId,
        variables: outcome.session.variables as object,
        status: outcome.session.status,
        waitingFor: outcome.session.waitingFor ? (outcome.session.waitingFor as object) : undefined,
      },
      update: {
        flowId: version.flowId,
        flowVersionId: version.id,
        currentNodeId: outcome.session.currentNodeId,
        variables: outcome.session.variables as object,
        status: outcome.session.status,
        waitingFor: outcome.session.waitingFor ? (outcome.session.waitingFor as object) : undefined,
      },
    })
  }

  if (outcome.handover) {
    await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'waiting_agent' } }).catch(() => {})
  }

  return {
    handled: true,
    messages: outcome.messages,
    handover: outcome.handover,
    waitingFor: outcome.session.waitingFor,
    flowName: version.flow.name,
  }
}

async function entryVersion(botId: string, environmentId: string) {
  const versions = await prisma.flowVersion.findMany({
    where: { status: 'published', environmentId, flow: { botId } },
    include: { flow: true },
  })
  return pickEntry(versions)
}

async function runVersion(opts: {
  machine: SessionMachine
  version: VersionRow
  fsRecord: { id: string; botId: string; tenantId: string; flowId: string; flowVersionId: string; currentNodeId: string; variables: unknown; status: string; waitingFor: unknown; createdAt: Date; updatedAt: Date } | null
  conversationId: string
  botId: string
  tenantId: string
  userText: string
  contactName: string
}) {
  const graph = opts.version.graph as unknown as FlowGraph
  const startId = startNodeId(graph)
  if (!startId) return null

  let session: Session
  if (!opts.fsRecord) {
    session = {
      id: randomUUID(),
      conversationId: opts.conversationId,
      botId: opts.botId,
      tenantId: opts.tenantId,
      flowId: opts.version.flowId,
      flowVersionId: opts.version.id,
      currentNodeId: startId,
      variables: {
        flow: { _last_user_message: opts.userText },
        global: {},
        contact: { name: opts.contactName },
      } satisfies SessionVariables,
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } else {
    const vars = opts.fsRecord.variables as unknown as SessionVariables
    vars.flow['_last_user_message'] = opts.userText
    vars.contact = { ...vars.contact, name: opts.contactName }
    session = {
      id: opts.fsRecord.id,
      conversationId: opts.conversationId,
      botId: opts.fsRecord.botId,
      tenantId: opts.fsRecord.tenantId,
      flowId: opts.fsRecord.flowId,
      flowVersionId: opts.fsRecord.flowVersionId,
      currentNodeId: opts.fsRecord.currentNodeId,
      variables: vars,
      status: opts.fsRecord.status as Session['status'],
      waitingFor: opts.fsRecord.waitingFor as Session['waitingFor'] | undefined,
      createdAt: opts.fsRecord.createdAt,
      updatedAt: opts.fsRecord.updatedAt,
    }
  }

  const result = await runFlowTurn(opts.machine, session, graph, startId, opts.userText)
  return {
    session: result.session,
    messages: result.newMessages.map((message) => message.content.text),
    handover: result.handover,
    jumpToFlow: result.jumpToFlow,
  }
}
