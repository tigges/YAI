import { presentChatText } from './visitor-name.js'

function presentContent(content: unknown, displayName: string | null | undefined): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return content
  const row = content as Record<string, unknown>
  if (typeof row['text'] !== 'string') return content
  const text = presentChatText(row['text'], displayName)
  if (text === row['text']) return content
  return { ...row, text }
}

function presentMessage<T extends { content: unknown }>(message: T, displayName: string | null | undefined): T {
  const content = presentContent(message.content, displayName)
  if (content === message.content) return message
  return { ...message, content }
}

/** Every inbox read uses the same name rule as a new chat. */
export function presentConversation<T extends { contact?: { displayName?: string | null } | null; messages?: Array<{ content: unknown }> }>(
  conversation: T,
): T {
  const name = conversation.contact?.displayName
  if (!conversation.messages?.length) return conversation
  return {
    ...conversation,
    messages: conversation.messages.map((message) => presentMessage(message, name)),
  }
}

export function presentMessages<T extends { content: unknown }>(
  messages: T[],
  displayName: string | null | undefined,
): T[] {
  return messages.map((message) => presentMessage(message, displayName))
}
