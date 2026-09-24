export interface TopicRoute {
  handle: string
  phrases: string[]
}

/** Longest matching phrase wins, so "cancel my order" beats "order". "other" when nothing fits. */
export function matchTopic(text: string, routes: TopicRoute[]): string {
  const hay = text.toLowerCase()
  let best: { handle: string; length: number } | undefined
  for (const route of routes) {
    for (const phrase of route.phrases) {
      const needle = phrase.toLowerCase()
      if (!needle || !hay.includes(needle)) continue
      if (!best || needle.length > best.length) best = { handle: route.handle, length: needle.length }
    }
  }
  return best?.handle ?? 'other'
}
