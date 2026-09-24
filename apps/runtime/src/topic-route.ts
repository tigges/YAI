export interface TopicRoute {
  handle: string
  phrases: string[]
}

/** First matching handle, or "other" when nothing fits. */
export function matchTopic(text: string, routes: TopicRoute[]): string {
  const hay = text.toLowerCase()
  for (const route of routes) {
    if (route.phrases.some((phrase) => phrase && hay.includes(phrase.toLowerCase()))) return route.handle
  }
  return 'other'
}
