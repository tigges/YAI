import type { FastifyInstance } from 'fastify'
import { requireRole } from '../middleware/auth.js'
import { prisma } from '@ybot/db'
import { installStarterFlows } from '../lib/install-starter-flows.js'


interface JwtPayload {
  sub: string
  tenantId: string
  role: string
}

export async function botsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)
  const canBuild = requireRole('DEVELOPER', 'SUPERVISOR', 'ADMIN')

  app.get('/', async (request) => {
    const { tenantId } = request.user as JwtPayload
    const bots = await prisma.bot.findMany({
      where: { tenantId },
      include: { environments: true },
      orderBy: { createdAt: 'asc' },
    })
    return { data: bots }
  })

  app.get('/:botId', async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { botId } = request.params as { botId: string }

    const bot = await prisma.bot.findFirst({
      where: { id: botId, tenantId },
      include: { environments: true },
    })

    if (!bot) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bot not found' } })
    return { data: bot }
  })

  app.post('/', { preHandler: canBuild }, async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { name, description } = request.body as { name: string; description?: string }

    const bot = await prisma.bot.create({
      data: {
        tenantId,
        name,
        description,
        environments: {
          create: [
            { tenantId, kind: 'sandbox', name: 'Sandbox' },
            { tenantId, kind: 'production', name: 'Production' },
          ],
        },
      },
      include: { environments: true },
    })

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    const sandbox = bot.environments.find((env) => env.kind === 'sandbox')
    await installStarterFlows(tenantId, bot.id, tenant?.name ?? name, sandbox?.id ?? null)

    return reply.status(201).send({ data: bot })
  })

  app.patch('/:botId', { preHandler: canBuild }, async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { botId } = request.params as { botId: string }
    const body = request.body as { name?: string; personaName?: string | null; description?: string | null; avatarUrl?: string | null }

    const bot = await prisma.bot.findFirst({ where: { id: botId, tenantId } })
    if (!bot) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bot not found' } })

    const updated = await prisma.bot.update({
      where: { id: botId },
      data: {
        ...(body.name !== undefined      && { name: body.name }),
        ...(body.personaName !== undefined && { personaName: body.personaName ?? null }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.avatarUrl !== undefined   && { avatarUrl: body.avatarUrl ?? null }),
      },
      include: { environments: true },
    })
    return { data: updated }
  })

  app.patch('/:botId/environments/:environmentId', { preHandler: canBuild }, async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { botId, environmentId } = request.params as { botId: string; environmentId: string }
    const body = request.body as { name?: string }
    const name = (body.name ?? '').trim()
    if (!name || name.length > 40) {
      return reply.status(400).send({ error: { code: 'INVALID_NAME', message: 'Enter a name up to 40 characters.' } })
    }

    const env = await prisma.environment.findFirst({ where: { id: environmentId, botId, tenantId } })
    if (!env) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Environment not found' } })

    const updated = await prisma.environment.update({ where: { id: env.id }, data: { name } })
    return { data: updated }
  })

  app.delete('/:botId/environments/:environmentId', { preHandler: canBuild }, async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { botId, environmentId } = request.params as { botId: string; environmentId: string }

    const env = await prisma.environment.findFirst({ where: { id: environmentId, botId, tenantId } })
    if (!env) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Environment not found' } })

    const remaining = await prisma.environment.count({ where: { botId, tenantId } })
    if (remaining <= 1) {
      return reply.status(409).send({ error: { code: 'LAST_ENVIRONMENT', message: 'A bot needs at least one environment.' } })
    }

    const [channels, conversations, flows] = await Promise.all([
      prisma.channel.count({ where: { environmentId: env.id } }),
      prisma.conversation.count({ where: { environmentId: env.id } }),
      prisma.flowVersion.count({ where: { environmentId: env.id } }),
    ])
    if (channels + conversations + flows > 0) {
      return reply.status(409).send({
        error: { code: 'ENVIRONMENT_IN_USE', message: 'This environment still has a channel, conversation, or published flow.' },
      })
    }

    await prisma.environment.delete({ where: { id: env.id } })
    return reply.status(204).send()
  })
}
