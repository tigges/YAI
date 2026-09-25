import { fillNameTokens, isNameVariable, nameForSpeech } from '@ybot/shared'

function lookup(variables: Record<string, unknown>, path: string): unknown {
  const keys = path.trim().split('.')
  let val: unknown = variables
  for (const key of keys) {
    if (val && typeof val === 'object' && key in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return val
}

// Lightweight variable interpolation: "Hello {{contact.name}}" → "Hello Alice".
// A missing name is "there", so a greeting never shows the raw placeholder.
export function interpolate(template: string, variables: Record<string, unknown>): string {
  const spoken = nameForSpeech(lookup(variables, 'contact.name'))
  const filled = template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const trimmed = path.trim()
    const val = lookup(variables, trimmed)
    if (isNameVariable(trimmed)) return nameForSpeech(val)
    if (val !== undefined && val !== null && val !== '') return fillNameTokens(String(val), spoken)
    return `{{${path}}}`
  })
  return fillNameTokens(filled, spoken)
}

// Resolve a condition: { field, operator, value }
type Operator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_empty'
export function evaluateCondition(
  field: string,
  operator: Operator,
  expected: string,
  variables: Record<string, unknown>,
): boolean {
  const actual = String(variables[field] ?? '')
  switch (operator) {
    case 'equals':       return actual === expected
    case 'not_equals':   return actual !== expected
    case 'contains':     return actual.toLowerCase().includes(expected.toLowerCase())
    case 'greater_than': return parseFloat(actual) > parseFloat(expected)
    case 'less_than':    return parseFloat(actual) < parseFloat(expected)
    case 'is_set':       return actual !== '' && actual !== 'undefined' && actual !== 'null'
    case 'is_empty':     return actual === '' || actual === 'undefined' || actual === 'null'
    default:             return false
  }
}
