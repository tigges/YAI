// BullMQ queue manager — dynamically loaded so the API starts without Redis
// In production, call initQueues(REDIS_URL) on startup

export const QUEUE_KNOWLEDGE_SYNC  = 'knowledge:sync'
export const QUEUE_CAMPAIGN_SEND   = 'campaign:send'
export const QUEUE_REPORT_GENERATE = 'report:generate'
export const QUEUE_WEBHOOK_DELIVER = 'webhook:deliver'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQueue = { add(name: string, data: object, opts?: object): Promise<unknown> }

let knowledgeSyncQueue: AnyQueue | null = null
let webhookQueue: AnyQueue | null = null
let campaignQueue: AnyQueue | null = null

export async function initQueues(redisUrl: string) {
  try {
    const { Queue } = await import('bullmq')
    const connection = { url: redisUrl }
    knowledgeSyncQueue = new Queue(QUEUE_KNOWLEDGE_SYNC,  { connection })
    webhookQueue       = new Queue(QUEUE_WEBHOOK_DELIVER,  { connection })
    campaignQueue      = new Queue(QUEUE_CAMPAIGN_SEND,    { connection })
    console.log('✅ BullMQ queues initialised')
  } catch {
    console.warn('⚠️  BullMQ init skipped (Redis unavailable or bullmq not installed)')
  }
}

export async function enqueueKnowledgeSync(payload: { tenantId: string; sourceId: string; botId: string; kind?: string; config?: Record<string, unknown> }) {
  await knowledgeSyncQueue?.add('sync', payload, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
}

export async function enqueueWebhookDelivery(payload: { url: string; secret?: string; event: string; data: object }) {
  await webhookQueue?.add('deliver', payload, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } })
}

export async function enqueueCampaignSend(payload: { tenantId: string; botId: string; campaignId: string }) {
  await campaignQueue?.add('send', payload, { attempts: 2, backoff: { type: 'exponential', delay: 10000 } })
}

/** Fan out a platform event to all matching webhooks for a tenant. */
export async function dispatchWebhookEvent(tenantId: string, event: string, data: object): Promise<void> {
  if (!webhookQueue) return
  try {
    const { PrismaClient } = await import('@ybot/db')
    const prisma = new PrismaClient()
    const hooks = await prisma.webhook.findMany({ where: { tenantId, isActive: true, events: { has: event } } })
    await Promise.all(hooks.map((wh: { url: string; secret: string | null }) => enqueueWebhookDelivery({ url: wh.url, secret: wh.secret ?? undefined, event, data })))
    await prisma.$disconnect()
  } catch { /* non-critical */ }
}
