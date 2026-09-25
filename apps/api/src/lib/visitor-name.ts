import { prisma } from '@ybot/db'
import { NAME_QUESTION, fillNameTokens, spokenFirstName, usableContactName } from '@ybot/shared'

const ASKED = 'nameAsked'
const AWAITING = 'awaitingName'

export interface VisitorName {
  id?: string
  displayName?: string | null
  metadata?: unknown
}

export interface NamePlan {
  /** First name for {{contact.name}}, or "there". */
  spoken: string
  /** This turn is only the thanks. Do not run the flow on the name itself. */
  thanks?: string
  displayName?: string
  metadata?: Record<string, unknown>
}

export function contactMeta(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return { ...(value as Record<string, unknown>) }
}

/**
 * What this visitor line does to the name.
 * A real name is kept. "Hi" is not a name. We ask once, then carry on.
 */
export function planNameTurn(contact: VisitorName | null | undefined, userText: string): NamePlan {
  const meta = contactMeta(contact?.metadata)
  const known = spokenFirstName(contact?.displayName)
  if (known) return { spoken: known }

  if (meta[AWAITING] === true) {
    const given = usableContactName(userText)
    if (given) {
      const first = given.split(' ')[0]!
      return {
        spoken: first,
        thanks: `Thanks, ${first}.`,
        displayName: given,
        metadata: { ...meta, [AWAITING]: false, [ASKED]: true },
      }
    }
    return { spoken: 'there', metadata: { ...meta, [AWAITING]: false } }
  }

  const openedWith = usableContactName(userText)
  if (openedWith) {
    const first = openedWith.split(' ')[0]!
    return {
      spoken: first,
      displayName: openedWith,
      metadata: { ...meta, [ASKED]: true, [AWAITING]: false },
    }
  }

  return { spoken: 'there' }
}

/**
 * Drop leftover name tokens. Ask once when we still do not know who this is.
 * A flow that is waiting gets to ask on its own next turn, so the name is not
 * glued onto the line the visitor is already reading.
 */
export function finishBotLines(
  lines: string[],
  contact: VisitorName | null | undefined,
  spoken: string,
  options?: { waiting?: boolean },
): { lines: string[]; metadata?: Record<string, unknown> } {
  const cleaned = lines.map((line) => fillNameTokens(line, spoken))
  const meta = contactMeta(contact?.metadata)
  const known = spokenFirstName(spoken) ?? spokenFirstName(contact?.displayName)
  if (known || meta[ASKED] === true || !contact?.id) return { lines: cleaned }
  if (!cleaned.some((line) => line.trim().length > 0)) return { lines: cleaned }
  if (cleaned.some((line) => line.includes(NAME_QUESTION))) return { lines: cleaned }
  if (options?.waiting) return { lines: cleaned }
  return {
    lines: [...cleaned, NAME_QUESTION],
    metadata: { ...meta, [ASKED]: true, [AWAITING]: true },
  }
}

export async function saveContactName(
  contactId: string,
  change: { displayName?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  if (!change.displayName && !change.metadata) return
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      ...(change.displayName ? { displayName: change.displayName } : {}),
      ...(change.metadata ? { metadata: change.metadata as never } : {}),
    },
  })
}

export async function takeNameTurn(conversationId: string, userText: string): Promise<NamePlan & { contact: VisitorName | null }> {
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId },
    select: { contact: { select: { id: true, displayName: true, metadata: true } } },
  })
  const contact = convo?.contact ?? null
  const plan = planNameTurn(contact, userText)
  if (contact?.id && (plan.displayName || plan.metadata)) {
    await saveContactName(contact.id, plan).catch(() => {})
  }
  const next: VisitorName | null = contact
    ? {
        id: contact.id,
        displayName: plan.displayName ?? contact.displayName,
        metadata: plan.metadata ?? contact.metadata,
      }
    : null
  return { ...plan, contact: next }
}

/** Rewrite a stored chat line so a missing name never shows the braces. */
export function presentChatText(text: string, displayName: string | null | undefined): string {
  return fillNameTokens(text, displayName)
}
