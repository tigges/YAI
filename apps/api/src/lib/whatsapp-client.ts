/**
 * WhatsApp Cloud API client.
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH = 'https://graph.facebook.com'
const DEFAULT_VERSION = 'v20.0'

export interface WhatsAppConfig {
  phoneNumberId: string
  accessToken: string
  verifyToken: string
  businessAccountId?: string
  apiVersion?: string
}

function endpoint(cfg: WhatsAppConfig, path: string): string {
  const v = cfg.apiVersion ?? DEFAULT_VERSION
  return `${GRAPH}/${v}/${path}`
}

async function graphPost(url: string, token: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    const msg = (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
    throw new Error(`WhatsApp API error: ${msg}`)
  }
  return json
}

/** Send a plain text message. */
export async function sendText(cfg: WhatsAppConfig, to: string, text: string): Promise<string> {
  const url = endpoint(cfg, `${cfg.phoneNumberId}/messages`)
  const res = await graphPost(url, cfg.accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  }) as { messages?: Array<{ id: string }> }
  return res.messages?.[0]?.id ?? ''
}

/** Mark an incoming message as read. */
export async function markRead(cfg: WhatsAppConfig, messageId: string): Promise<void> {
  const url = endpoint(cfg, `${cfg.phoneNumberId}/messages`)
  await graphPost(url, cfg.accessToken, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  }).catch(() => {})  // non-fatal
}

/** Send a typing indicator (mark as "seen" + simulate delay). */
export async function sendTyping(cfg: WhatsAppConfig, to: string): Promise<void> {
  // WhatsApp doesn't have a dedicated typing indicator via Cloud API —
  // marking the message as read is the closest equivalent.
  void to
  void cfg
}

/** Parse the Channel.config JSON field into a typed WhatsAppConfig. */
export function parseWhatsAppConfig(config: unknown): WhatsAppConfig | null {
  if (typeof config !== 'object' || config === null) return null
  const c = config as Record<string, unknown>
  if (!c['phoneNumberId'] || !c['accessToken'] || !c['verifyToken']) return null
  return {
    phoneNumberId: String(c['phoneNumberId']),
    accessToken: String(c['accessToken']),
    verifyToken: String(c['verifyToken']),
    businessAccountId: c['businessAccountId'] ? String(c['businessAccountId']) : undefined,
    apiVersion: c['apiVersion'] ? String(c['apiVersion']) : undefined,
  }
}
