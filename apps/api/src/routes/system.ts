import type { FastifyInstance } from 'fastify'
import { prisma } from '@ybot/db'
import { requireRole } from '../middleware/auth.js'
import * as os from 'node:os'
import * as http from 'node:http'


function dockerRequest(path: string): Promise<unknown> {
  return new Promise((resolve) => {
    const req = http.request(
      { socketPath: '/var/run/docker.sock', path, method: 'GET' },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve(null) } })
      },
    )
    req.on('error', () => resolve(null))
    req.setTimeout(3000, () => { req.destroy(); resolve(null) })
    req.end()
  })
}

async function pingDb() {
  const t0 = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

async function pingRedis() {
  const t0 = Date.now()
  try {
    const ioredis = await import('ioredis')
    const IORedis = ioredis.default ?? (ioredis as unknown as new (url: string, opts: object) => import('ioredis').Redis)
    const r = new (IORedis as unknown as new (url: string, opts: object) => import('ioredis').Redis)(
      process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      { connectTimeout: 2000, lazyConnect: true },
    )
    await (r as import('ioredis').Redis & { connect(): Promise<void> }).connect()
    await r.ping()
    r.disconnect()
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

export async function systemRoutes(app: FastifyInstance) {
  // ── GET /version — PUBLIC, no auth ────────────────────────────────────────
  app.get('/version', async () => {
    const e = process.env
    return {
      data: {
        version:     e['APP_VERSION']      ?? '1.1.0',
        buildNumber: e['APP_BUILD_NUMBER'] ?? 'local',
        gitSha:      e['APP_GIT_SHA']      ?? 'dev',
        buildDate:   e['APP_BUILD_DATE']   ?? new Date().toISOString(),
        environment: e['NODE_ENV']         ?? 'development',
      },
    }
  })

  app.addHook('preHandler', app.authenticate)
  app.addHook('preHandler', requireRole('ADMIN'))

  app.get('/status', async () => {
    const [db, redis, rawContainers] = await Promise.all([
      pingDb(),
      pingRedis(),
      dockerRequest('/containers/json?all=1'),
    ])

    const containers = Array.isArray(rawContainers)
      ? (rawContainers as Array<Record<string, unknown>>).map((c) => ({
          id: String(c['Id'] ?? '').slice(0, 12),
          name: (Array.isArray(c['Names']) && typeof c['Names'][0] === 'string')
            ? (c['Names'][0] as string).replace('/', '')
            : 'unknown',
          image: String(c['Image'] ?? ''),
          state: String(c['State'] ?? 'unknown'),
          status: String(c['Status'] ?? ''),
          created: c['Created'] as number | undefined,
        }))
      : []

    const [sources, totalChunks] = await Promise.all([
      prisma.knowledgeSource.findMany({
        select: { id: true, name: true, lastSyncAt: true, _count: { select: { documents: true } } },
      }).catch(() => []),
      prisma.documentChunk.count().catch(() => 0),
    ])

    return {
      data: {
        services: { database: db, redis },
        containers,
        rag: {
          sources: sources.length,
          documents: (sources as Array<{ _count: { documents: number } }>)
            .reduce((s, x) => s + x._count.documents, 0),
          chunks: totalChunks,
          sourceList: sources,
        },
        system: {
          platform: os.platform(),
          uptime: Math.round(os.uptime()),
          nodeVersion: process.version,
          cpuCount: os.cpus().length,
          totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
          freeMemMb: Math.round(os.freemem() / 1024 / 1024),
          usedMemPct: Math.round((1 - os.freemem() / os.totalmem()) * 100),
        },
        ts: new Date().toISOString(),
        version: {
          version:     process.env['APP_VERSION']      ?? '1.1.0',
          buildNumber: process.env['APP_BUILD_NUMBER'] ?? 'local',
          gitSha:      process.env['APP_GIT_SHA']      ?? 'dev',
          buildDate:   process.env['APP_BUILD_DATE']   ?? new Date().toISOString(),
        },
      },
    }
  })

  // POST /system/seed-demo — populate the Acme Hair Studio demo workspace
  // Protected by SEED_DEMO_SECRET env var (or any value if not set in dev)
  app.post('/seed-demo', async (request, reply) => {
    const secret = process.env['SEED_DEMO_SECRET']
    const { authorization } = request.headers
    if (secret && authorization !== `Bearer ${secret}`) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN' } })
    }
    try {
      const { seedDemo } = await import('../scripts/seed-demo.js')
      const result = await seedDemo()
      return { data: result }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      request.log.error({ err }, 'seed-demo failed')
      return reply.status(500).send({ error: { code: 'SEED_FAILED', message: msg } })
    }
  })

  // Returns which env vars are configured — never the actual values.
  app.get('/config', async () => {
    const e = process.env
    function isSet(key: string) { return !!e[key] && e[key] !== 'change-me-in-production' }
    function maskUrl(url: string | undefined) {
      if (!url) return null
      try {
        const u = new URL(url)
        return `${u.protocol}//${u.hostname}:${u.port || (u.protocol === 'https:' ? 443 : 5432)}`
      } catch { return '(configured)' }
    }
    return {
      data: {
        auth: {
          JWT_SECRET: { set: isSet('JWT_SECRET'), label: 'JWT Secret' },
        },
        database: {
          DATABASE_URL: { set: isSet('DATABASE_URL'), label: 'PostgreSQL', endpoint: maskUrl(e['DATABASE_URL']) },
        },
        cache: {
          REDIS_URL: { set: isSet('REDIS_URL'), label: 'Redis / Valkey', endpoint: maskUrl(e['REDIS_URL']) },
        },
        storage: {
          S3_ENDPOINT: { set: isSet('S3_ENDPOINT'), label: 'S3 / MinIO endpoint', endpoint: e['S3_ENDPOINT'] ?? null },
          S3_BUCKET:   { set: isSet('S3_BUCKET'),   label: 'S3 Bucket',           value: e['S3_BUCKET'] ?? null },
          S3_REGION:   { set: isSet('S3_REGION'),   label: 'S3 Region',           value: e['S3_REGION'] ?? null },
        },
        llm: {
          OPENAI_API_KEY:    { set: isSet('OPENAI_API_KEY'),    label: 'OpenAI API Key' },
          ANTHROPIC_API_KEY: { set: isSet('ANTHROPIC_API_KEY'), label: 'Anthropic API Key' },
          GROQ_API_KEY:      { set: isSet('GROQ_API_KEY'),      label: 'Groq API Key' },
          OLLAMA_BASE_URL:   { set: isSet('OLLAMA_BASE_URL'),   label: 'Ollama Base URL', endpoint: e['OLLAMA_BASE_URL'] ?? null },
        },
        app: {
          NODE_ENV:     { set: true, label: 'Environment', value: e['NODE_ENV'] ?? 'development' },
          FRONTEND_URL: { set: isSet('FRONTEND_URL'), label: 'Frontend URL', value: e['FRONTEND_URL'] ?? null },
        },
      },
    }
  })
}
