export interface TopicRoute {
  handle: string
  phrases: string[]
}

function tokens(text: string): string[] {
  return text.match(/[a-z0-9']+/g) ?? []
}

/** One adjacent swap, or one insert, delete, or substitution. */
function oneEdit(a: string, b: string): 'swap' | 'edit' | null {
  if (a === b || Math.abs(a.length - b.length) > 1) return null
  if (a.length === b.length) {
    const diffs: number[] = []
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) diffs.push(i)
      if (diffs.length > 2) return null
    }
    if (diffs.length === 1) return 'edit'
    const first = diffs[0]
    const second = diffs[1]
    if (
      diffs.length === 2 &&
      first !== undefined &&
      second === first + 1 &&
      a[first] === b[second] &&
      a[second] === b[first]
    ) {
      return 'swap'
    }
    return null
  }
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  let i = 0
  let j = 0
  let skipped = false
  while (i < longer.length && j < shorter.length) {
    if (longer[i] === shorter[j]) {
      i++
      j++
    } else if (skipped) {
      return null
    } else {
      skipped = true
      i++
    }
  }
  return 'edit'
}

/**
 * A swapped pair of letters counts from 3 letters ("wnat" / "want", "ctu" / "cut").
 * One extra, missing, or changed letter counts only from 5, so "book" does not become "back".
 */
function closeWord(left: string, right: string): boolean {
  if (left === right) return true
  const kind = oneEdit(left, right)
  if (!kind) return false
  const longer = Math.max(left.length, right.length)
  if (kind === 'swap') return longer >= 3
  return longer >= 5
}

function phraseHit(hay: string, needle: string): 'exact' | 'fuzzy' | null {
  if (hay.includes(needle)) return 'exact'
  const wanted = tokens(needle)
  const heard = tokens(hay)
  if (wanted.length === 0 || heard.length < wanted.length) return null
  for (let start = 0; start <= heard.length - wanted.length; start++) {
    let fuzzy = false
    let fits = true
    for (let i = 0; i < wanted.length; i++) {
      const word = wanted[i] ?? ''
      const heardWord = heard[start + i] ?? ''
      if (word === heardWord) continue
      if (closeWord(word, heardWord)) {
        fuzzy = true
        continue
      }
      fits = false
      break
    }
    if (fits) return fuzzy ? 'fuzzy' : 'exact'
  }
  return null
}

/** Longest matching phrase wins, so "cancel my order" beats "order". A one-letter slip still counts. "other" when nothing fits. */
export function matchTopic(text: string, routes: TopicRoute[]): string {
  const hay = text.toLowerCase()
  let best: { handle: string; score: number } | undefined
  for (const route of routes) {
    for (const phrase of route.phrases) {
      const needle = phrase.toLowerCase().trim()
      if (!needle) continue
      const hit = phraseHit(hay, needle)
      if (!hit) continue
      const score = hit === 'exact' ? needle.length : needle.length - 0.5
      if (!best || score > best.score) best = { handle: route.handle, score }
    }
  }
  return best?.handle ?? 'other'
}
