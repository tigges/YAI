const PLACEHOLDER = /^(visitor|guest|there)$/i
const GREETING = /^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening)[!?.\s]*$/i
const NAME = /^[\p{L}][\p{L}'’.\-]*(?: [\p{L}][\p{L}'’.\-]*){0,2}$/u

/** A name we can say out loud. Greetings, placeholders, and sentences are not names. */
export function usableContactName(raw: string | null | undefined): string | undefined {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!name || name.length > 40 || PLACEHOLDER.test(name) || GREETING.test(name)) return undefined
  if (!NAME.test(name)) return undefined
  return name
}
