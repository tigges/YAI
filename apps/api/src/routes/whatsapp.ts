/**
 * WhatsApp Cloud API webhook routes.
 *
 * GET  /webhooks/whatsapp  — Meta webhook verification challenge
 * POST /webhooks/whatsapp  — Incoming messages + status updates from Meta
 *
 * One webhook endpoint handles ALL WhatsApp channels for the server.
 * Incoming messages are routed to the correct BotStudio channel by matching
 * the payload's `phone_number_id` to Channel.config.phoneNumberId.
 *
 * Setup in Meta Developer Console:
 *   Callback URL:  https://your-domain.com/api/v1/webhooks/whatsapp
 *   Verify Token:  value of WHATSAPP_VERIFY_TOKEN in .env
 *                  (or the per-channel verifyToken in Channel.config)
 */

import type { FastifyInstance } from 'fastify'
import { prisma } from '@ybot/db'
import { parseWhatsAppConfig, sendText, markRead } from '../lib/whatsapp-client.js'
import { getBotReply } from '../lib/bot-engine.js'

// ── Meta webhook payload types ────────────────────────────────────────────────

interface WATextMessage {
  from: string
  id: string
  timestamp: string
  type: 'text'
  text: { body: string }
}

interface WAStatusUpdate {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
}

interface WAChangeValue {
  messaging_product: 'whatsapp'
  metadata: { display_phone_number: string; phone_number_id: string }
  contacts?: Array<{ profile: { name: string }; wa_id: string }>
  messages?: WATextMessage[]
  statuses?: WAStatusUpdate[]
}

interface WAPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{ value: WAChangeValue; field: string }>
  }>
}

export async function whatsappRoutes(app: FastifyInstance) {
  // ── GET /webhooks/whatsapp — Meta verification challenge ─────────────────
  app.get<{
    Querystring: {
      'hub.mode'?: string
      'hub.verify_token'?: string
      'hub.challenge'?: string
    }
  }>('/webhooks/whatsapp', async (request, reply) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query

    if (mode !== 'subscribe' || !token) {
      return reply.status(400).send('Bad request')
    }

    // Accept if token matches the global env var OR any active WhatsApp channel's verifyToken
    const globalToken = process.env['WHATSAPP_VERIFY_TOKEN']
    if (globalToken && token === globalToken) {
      return reply.send(challenge)
    }

    // Check per-channel tokens
    const channels = await prisma.channel.findMany({ where: { kind: 'whatsapp', isActive: true } })
    const match = channels.some((ch) => {
      const cfg = parseWhatsAppConfig(ch.config)
      return cfg?.verifyToken === token
    })

    if (match) return reply.send(challenge)

    return reply.status(403).send('Forbidden')
  })

  // ── POST /webhooks/whatsapp — incoming messages from Meta ─────────────────
  app.post('/webhooks/whatsapp', async (request, reply) => {
    const payload = request.body as WAPayload

    // Meta expects a 200 within 20 seconds — respond immediately
    reply.status(200).send({ ok: true })

    // Process asynchronously so we never time out
    processWebhook(payload).catch((err) => {
      app.log.error({ err }, '[whatsapp] webhook processing error')
    })
  })
}

async function processWebhook(payload: WAPayload): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue
      const value = change.value

      // ── Status updates (delivered, read, failed) — log and skip ──────────
      if (value.statuses?.length) {
        // Could update CampaignDelivery status here in a future iteration
        continue
      }

      if (!value.messages?.length) continue

      const phoneNumberId = value.metadata.phone_number_id
      const channel = await findChannelByPhoneNumberId(phoneNumberId)
      if (!channel) {
        console.warn(`[whatsapp] no active channel found for phoneNumberId=${phoneNumberId}`)
        continue
      }

      const waConfig = parseWhatsAppConfig(channel.config)
      if (!waConfig) continue

      for (const msg of value.messages) {
        if (msg.type !== 'text') {
          // Non-text message (image, document, etc.) — acknowledge receipt
          await sendText(waConfig, msg.from, "Thanks for your message! I can currently only process text messages.").catch(() => {})
          continue
        }

        const userText = msg.text.body.trim()
        if (!userText) continue

        const senderName = value.contacts?.find((c) => c.wa_id === msg.from)?.profile.name ?? msg.from

        try {
          // Mark as read
          await markRead(waConfig, msg.id)

          // Find existing open conversation for this sender
          const existingConvo = await prisma.conversation.findFirst({
            where: {
              tenantId: channel.tenantId,
              channelId: channel.id,
              status: 'active',
              contact: { externalId: msg.from },
            },
            orderBy: { createdAt: 'desc' },
          })

          const { reply: botReply } = await getBotReply({
            channelId: channel.id,
            botId: channel.botId,
            tenantId: channel.tenantId,
            userText,
            externalId: msg.from,
            displayName: senderName,
            conversationId: existingConvo?.id ?? null,
          })

          if (botReply.trim()) {
            await sendText(waConfig, msg.from, botReply)
          }
        } catch (err) {
          console.error(`[whatsapp] error processing message from ${msg.from}:`, err)
          await sendText(waConfig, msg.from, "Sorry, I'm having trouble right now. Please try again in a moment.").catch(() => {})
        }
      }
    }
  }
}

/** Find the active WhatsApp channel whose config.phoneNumberId matches. */
async function findChannelByPhoneNumberId(phoneNumberId: string) {
  const channels = await prisma.channel.findMany({
    where: { kind: 'whatsapp', isActive: true },
  })
  return channels.find((ch) => {
    const cfg = parseWhatsAppConfig(ch.config)
    return cfg?.phoneNumberId === phoneNumberId
  }) ?? null
}
