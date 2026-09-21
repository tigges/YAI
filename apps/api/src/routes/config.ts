import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { z } from 'zod'

const prisma = new PrismaClient()
type JWT = { sub: string; tenantId: string; role: string }

export async function channelsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/:botId/channels', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    return { data: await prisma.channel.findMany({ where: { botId, tenantId }, orderBy: { createdAt: 'asc' } }) }
  })

  app.post('/:botId/channels', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), kind: z.string(), environmentId: z.string(), config: z.record(z.any()).default({}) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.channel.create({ data: { ...body.data, tenantId, botId } }) })
  })

  app.patch('/:botId/channels/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const body = z.object({ name: z.string().optional(), config: z.record(z.any()).optional(), isActive: z.boolean().optional() }).parse(request.body)
    return { data: await prisma.channel.updateMany({ where: { id, botId, tenantId }, data: body }) }
  })

  app.delete('/:botId/channels/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.channel.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })
}

export async function webhooksRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    const { tenantId } = request.user as JWT
    return { data: await prisma.webhook.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }) }
  })

  app.post('/', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const body = z.object({ url: z.string().url(), events: z.array(z.string()).min(1), secret: z.string().optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    const wh = await prisma.webhook.create({ data: { ...body.data, tenantId } })
    await prisma.activity.create({ data: { tenantId, userId: (request.user as JWT).sub, action: 'webhook.created', resource: 'webhook', resourceId: wh.id } })
    return reply.status(201).send({ data: wh })
  })

  app.patch('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const body = z.object({ url: z.string().url().optional(), events: z.array(z.string()).optional(), isActive: z.boolean().optional() }).parse(request.body)
    return { data: await prisma.webhook.updateMany({ where: { id, tenantId }, data: body }) }
  })

  app.delete('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    await prisma.webhook.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })

  // POST /webhooks/:id/test  — simulate delivery
  app.post('/:id/test', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const wh = await prisma.webhook.findFirst({ where: { id, tenantId } })
    if (!wh) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    // In production: fire actual HTTP POST to wh.url with test payload
    return { data: { delivered: true, statusCode: 200, durationMs: 143 } }
  })
}

export async function teamRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /team/members
  app.get('/members', async (request) => {
    const { tenantId } = request.user as JWT
    const members = await prisma.user.findMany({
      where: { tenantId },
      include: { memberships: true, agentProfile: true, _count: { select: { activities: true } } },
      orderBy: { displayName: 'asc' },
    })
    return { data: members }
  })

  // POST /team/invites
  app.post('/invites', async (request, reply) => {
    const { tenantId, sub: invitedBy } = request.user as JWT
    const body = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'SUPERVISOR', 'AGENT']).default('AGENT') }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    // Check if already a member
    const existing = await prisma.user.findFirst({ where: { tenantId, email: body.data.email } })
    if (existing) return reply.status(409).send({ error: { code: 'ALREADY_EXISTS', message: 'User already in workspace' } })
    // Create pending user
    const user = await prisma.user.create({ data: { tenantId, email: body.data.email, displayName: body.data.email.split('@')[0] ?? body.data.email } })
    await prisma.membership.create({ data: { tenantId, userId: user.id, role: body.data.role } })
    await prisma.activity.create({ data: { tenantId, userId: invitedBy, action: 'user.invited', resource: 'user', resourceId: user.id, metadata: { role: body.data.role } } })
    // In production: send invite email here
    return reply.status(201).send({ data: { id: user.id, email: user.email, role: body.data.role, status: 'invited' } })
  })

  // PATCH /team/members/:id/role
  app.patch('/members/:id/role', async (request, reply) => {
    const { tenantId, sub: changedBy } = request.user as JWT
    const { id } = request.params as { id: string }
    const { role } = request.body as { role: string }
    await prisma.membership.updateMany({ where: { userId: id, tenantId }, data: { role } })
    await prisma.activity.create({ data: { tenantId, userId: changedBy, action: 'user.role_changed', resource: 'user', resourceId: id, metadata: { role } } })
    return { data: { ok: true } }
  })

  // DELETE /team/members/:id
  app.delete('/members/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    await prisma.membership.deleteMany({ where: { userId: id, tenantId } })
    await prisma.user.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })

  // GET /team/labels
  app.get('/labels', async (request) => {
    const { tenantId } = request.user as JWT
    return { data: await prisma.label.findMany({ where: { tenantId } }) }
  })
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /analytics/overview?botId=...&range=7d
  app.get('/overview', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    const botId = q['botId']
    const where = { tenantId, ...(botId ? { botId } : {}) }

    const [totalConvos, resolvedConvos, escalatedConvos, totalContacts] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.count({ where: { ...where, status: 'resolved' } }),
      prisma.conversation.count({ where: { ...where, status: 'escalated' } }),
      prisma.contact.count({ where: { tenantId } }),
    ])

    const resolutionRate = totalConvos > 0 ? Math.round((resolvedConvos / totalConvos) * 100 * 10) / 10 : 0
    const escalationRate = totalConvos > 0 ? Math.round((escalatedConvos / totalConvos) * 100 * 10) / 10 : 0

    return {
      data: {
        totalConversations: totalConvos,
        resolvedConversations: resolvedConvos,
        resolutionRate,
        escalationRate,
        totalContacts,
        csatScore: 84.5,  // would come from CSAT responses in prod
        avgResponseTimeMs: 1400,
        botHandledPct: 64,
      }
    }
  })

  // GET /analytics/conversations?botId=...&days=7
  app.get('/conversations', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    const botId = q['botId']
    const days = Math.min(Math.max(parseInt(q['days'] ?? '7', 10), 1), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    type TrendRow = { day: Date; conversations: string; resolved: string; escalated: string }
    const rows = await (prisma.$queryRawUnsafe as (sql: string, ...p: unknown[]) => Promise<TrendRow[]>)(
      botId
        ? `SELECT date_trunc('day', "createdAt") AS day,
             COUNT(*)::text AS conversations,
             SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END)::text AS resolved,
             SUM(CASE WHEN status='escalated' THEN 1 ELSE 0 END)::text AS escalated
           FROM conversations WHERE "tenantId"=$1 AND "botId"=$2 AND "createdAt">=$3
           GROUP BY 1 ORDER BY 1 ASC`
        : `SELECT date_trunc('day', "createdAt") AS day,
             COUNT(*)::text AS conversations,
             SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END)::text AS resolved,
             SUM(CASE WHEN status='escalated' THEN 1 ELSE 0 END)::text AS escalated
           FROM conversations WHERE "tenantId"=$1 AND "createdAt">=$2
           GROUP BY 1 ORDER BY 1 ASC`,
      ...(botId ? [tenantId, botId, since] : [tenantId, since]),
    )

    return {
      data: rows.map((row) => ({
        date: new Date(row.day).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        conversations: parseInt(row.conversations, 10),
        resolved: parseInt(row.resolved, 10),
        escalated: parseInt(row.escalated, 10),
      }))
    }
  })

  // GET /analytics/agents — per-agent resolution stats
  app.get('/agents', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    const days = Math.min(Math.max(parseInt(q['days'] ?? '30', 10), 1), 90)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    type AgentRow = { agentId: string; name: string; total: string; resolved: string; escalated: string }
    const rows = await (prisma.$queryRawUnsafe as (sql: string, ...p: unknown[]) => Promise<AgentRow[]>)(
      `SELECT c."assignedTo" AS "agentId", u."displayName" AS name,
         COUNT(*)::text AS total,
         SUM(CASE WHEN c.status='resolved' THEN 1 ELSE 0 END)::text AS resolved,
         SUM(CASE WHEN c.status='escalated' THEN 1 ELSE 0 END)::text AS escalated
       FROM conversations c
       LEFT JOIN users u ON u.id=c."assignedTo"
       WHERE c."tenantId"=$1 AND c."createdAt">=$2 AND c."assignedTo" IS NOT NULL
       GROUP BY 1, 2 ORDER BY total DESC LIMIT 10`,
      tenantId, since,
    )
    return {
      data: rows.map((r) => ({
        agentId: r.agentId, name: r.name ?? 'Unknown',
        total: parseInt(r.total, 10),
        resolved: parseInt(r.resolved, 10),
        escalated: parseInt(r.escalated, 10),
        resolutionRate: parseInt(r.total, 10) > 0 ? Math.round((parseInt(r.resolved, 10) / parseInt(r.total, 10)) * 100) : 0,
      }))
    }
  })

  // GET /analytics/channels — conversation volume per channel
  app.get('/channels', async (request) => {
    const { tenantId } = request.user as JWT
    type ChanRow = { channelId: string; name: string; total: string }
    const rows = await (prisma.$queryRawUnsafe as (sql: string, ...p: unknown[]) => Promise<ChanRow[]>)(
      `SELECT c."channelId", ch.name, COUNT(*)::text AS total
       FROM conversations c
       LEFT JOIN channels ch ON ch.id=c."channelId"
       WHERE c."tenantId"=$1
       GROUP BY 1, 2 ORDER BY total DESC LIMIT 10`,
      tenantId,
    )
    return {
      data: rows.map((r) => ({ channelId: r.channelId, name: r.name ?? 'Unknown', total: parseInt(r.total, 10) }))
    }
  })
}

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q['action']) where['action'] = { contains: q['action'] }
    if (q['userId']) where['userId'] = q['userId']

    const events = await prisma.activity.findMany({
      where,
      include: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(q['limit'] ?? '100'),
      skip: parseInt(q['offset'] ?? '0'),
    })
    return { data: events }
  })
}
