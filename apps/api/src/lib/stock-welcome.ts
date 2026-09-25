export type StockWelcomeKind = 'support' | 'starter' | 'product'

/**
 * A welcome that still stacks the old greeting and the next question in one turn.
 * A greeting that already says who is speaking is left alone, including a custom edit.
 */
export function stockWelcomeKind(graph: unknown): StockWelcomeKind | null {
  if (!graph || typeof graph !== 'object') return null
  const text = JSON.stringify(graph)
  if (text.includes("Hi, I'm the assistant") || text.includes("Hi, I'm Bella")) return null
  if (text.includes('I can tell you what BotStudio does') && text.includes('What would you like to know?')) return 'product'
  if (text.includes('How can I help you today?') && text.includes('What do you need help with?')) return 'support'
  if (text.includes('How can I help?') && text.includes('What do you need help with?')) return 'starter'
  return null
}
