const LEADING_FILLER = new Set(['the', 'a', 'an'])

function firstWord(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const useful = words.find((word) => !LEADING_FILLER.has(word.toLowerCase()))
  return useful ?? ''
}

function fromEmail(email: string | null | undefined): string {
  const label = email?.split('@')[1]?.split('.')[0]?.trim() ?? ''
  if (!label) return ''
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function companyLabel(tenantName: string | null | undefined, email: string | null | undefined): string {
  const fromTenant = tenantName ? firstWord(tenantName) : ''
  return fromTenant || fromEmail(email)
}

export function workspaceIdentity(input: {
  displayName?: string | null
  email?: string | null
  tenantName?: string | null
}): { handle: string; avatarName: string; company: string } {
  const company = companyLabel(input.tenantName, input.email)
  const name = input.displayName?.trim() ?? ''
  const initial = name.charAt(0).toUpperCase()
  if (!company) return { handle: name, avatarName: name, company: '' }
  return {
    handle: initial ? `${initial}${company}` : company,
    avatarName: initial ? `${initial} ${company}` : company,
    company,
  }
}
