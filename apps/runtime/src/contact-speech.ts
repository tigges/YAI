// These rules match packages/shared/src/contact-speech.ts.
// This file stays inside the runtime package on purpose. The production image
// loads the flow runner from @ybot/runtime, and that directory has no
// node_modules, so `import … from '@ybot/shared'` crashes the API on startup.

const PLACEHOLDER = /^(visitor|guest|there|unknown|user)$/i
const GREETING = /^(hi|hello|hey|hiya|yo|good morning|good afternoon|good evening)[!?.\s]*$/i
const NAME = /^[\p{L}][\p{L}'’.\-]*(?: [\p{L}][\p{L}'’.\-]*){0,2}$/u
const NAME_VARIABLE = /^(?:contact|user|visitor|customer)\.name$/i

const NEUTRAL_NAME = 'there'

export function isNameVariable(path: string): boolean {
  return NAME_VARIABLE.test(path.trim())
}

function usableContactName(raw: string | null | undefined): string | undefined {
  const name = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!name || name.length > 40 || PLACEHOLDER.test(name) || GREETING.test(name)) return undefined
  if (name.includes('{{') || name.includes('}}')) return undefined
  if (!NAME.test(name)) return undefined
  return name
}

function spokenFirstName(raw: string | null | undefined): string | undefined {
  const name = usableContactName(raw)
  return name ? name.split(' ')[0] : undefined
}

export function nameForSpeech(raw: unknown): string {
  if (typeof raw !== 'string') return NEUTRAL_NAME
  return spokenFirstName(raw) ?? NEUTRAL_NAME
}

export function fillNameTokens(template: string, rawName: unknown): string {
  const spoken = nameForSpeech(rawName)
  return template.replace(/\{\{\s*(?:contact|user|visitor|customer)\.name\s*\}\}/gi, spoken)
}
