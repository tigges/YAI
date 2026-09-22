import { PrismaClient } from '@prisma/client'

/**
 * Shared PrismaClient singleton for the whole process.
 *
 * Importing this module from multiple route files is safe — Node's ESM module
 * cache ensures this file is only evaluated once, so every importer receives
 * the same PrismaClient instance and therefore the same connection pool.
 *
 * The globalThis guard keeps a single instance alive across hot-module reloads
 * in development (tsx --watch) without leaking connections.
 */
declare const globalThis: typeof global & { __ybot_prisma?: PrismaClient }

export const prisma: PrismaClient =
  globalThis.__ybot_prisma ?? new PrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__ybot_prisma = prisma
}
