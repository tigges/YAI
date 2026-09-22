const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('ybot-app')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { token?: string } }
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

export class ApiError extends Error {
  constructor(public status: number, public body: { code: string; message: string }) {
    super(body?.message ?? `HTTP ${status}`)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    credentials: 'include',
    ...init,
  })
  const json = (await res.json().catch(() => ({}))) as T
  if (!res.ok) throw new ApiError(res.status, (json as { error: { code: string; message: string } }).error)
  return json
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email: string, password: string) =>
    apiFetch<{ data: { token: string; user: { id: string; email: string; displayName: string; tenantId: string } } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body: { email: string; password: string; displayName: string; tenantName: string; tenantSlug: string }) =>
    apiFetch<{ data: { token: string; user: unknown } }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (email: string) =>
    apiFetch<{ data: { message: string } }>('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    apiFetch<{ data: { message: string } }>('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  acceptInvite: (token: string, password: string, displayName?: string) =>
    apiFetch<{ data: { token: string; user: { id: string; email: string; displayName: string; tenantId: string; role: string } } }>('/auth/accept-invite', { method: 'POST', body: JSON.stringify({ token, password, displayName }) }),
}

// ── Me ────────────────────────────────────────────────────────────────────────
export const me = {
  get: () => apiFetch<{ data: { id: string; email: string; displayName: string; status?: string } }>('/me'),
  update: (body: { displayName?: string; email?: string; status?: string }) =>
    apiFetch<{ data: unknown }>('/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ data: unknown }>('/me/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
}

// ── Bots ──────────────────────────────────────────────────────────────────────
export const bots = {
  list: () => apiFetch<{ data: BotSummary[] }>('/bots'),
  get: (id: string) => apiFetch<{ data: BotSummary }>(`/bots/${id}`),
  create: (name: string, description?: string) =>
    apiFetch<{ data: BotSummary }>('/bots', { method: 'POST', body: JSON.stringify({ name, description }) }),
  update: (id: string, body: Partial<{ name: string; personaName: string | null; description: string | null; avatarUrl: string | null }>) =>
    apiFetch<{ data: BotSummary }>(`/bots/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}

// ── Flows ─────────────────────────────────────────────────────────────────────
export const flows = {
  list: (botId: string) => apiFetch<{ data: Flow[] }>(`/bots/${botId}/flows`),
  get: (botId: string, flowId: string) => apiFetch<{ data: Flow }>(`/bots/${botId}/flows/${flowId}`),
  create: (botId: string, body: { name: string; description?: string; kind?: string; tags?: string[] }) =>
    apiFetch<{ data: Flow }>(`/bots/${botId}/flows`, { method: 'POST', body: JSON.stringify(body) }),
  update: (botId: string, flowId: string, body: Partial<{ name: string; description: string; tags: string[] }>) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/flows/${flowId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (botId: string, flowId: string) =>
    apiFetch<void>(`/bots/${botId}/flows/${flowId}`, { method: 'DELETE' }),
  getCanvas: (botId: string, flowId: string, version: number) =>
    apiFetch<{ data: FlowVersion }>(`/bots/${botId}/flows/${flowId}/versions/${version}/canvas`),
  saveCanvas: (botId: string, flowId: string, version: number, graph: FlowGraph) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/flows/${flowId}/versions/${version}/canvas`, { method: 'PUT', body: JSON.stringify({ graph }) }),
  publish: (botId: string, flowId: string, environmentId: string) =>
    apiFetch<{ data: FlowVersion }>(`/bots/${botId}/flows/${flowId}/publish`, { method: 'POST', body: JSON.stringify({ environmentId }) }),
}

// ── Knowledge ─────────────────────────────────────────────────────────────────
export const knowledge = {
  intents: {
    list: (botId: string) => apiFetch<{ data: Intent[] }>(`/bots/${botId}/intents`),
    create: (botId: string, body: Partial<Intent>) => apiFetch<{ data: Intent }>(`/bots/${botId}/intents`, { method: 'POST', body: JSON.stringify(body) }),
    update: (botId: string, id: string, body: Partial<Intent>) => apiFetch<{ data: unknown }>(`/bots/${botId}/intents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (botId: string, id: string) => apiFetch<void>(`/bots/${botId}/intents/${id}`, { method: 'DELETE' }),
  },
  entities: {
    list: (botId: string) => apiFetch<{ data: Entity[] }>(`/bots/${botId}/entities`),
    create: (botId: string, body: Partial<Entity>) => apiFetch<{ data: Entity }>(`/bots/${botId}/entities`, { method: 'POST', body: JSON.stringify(body) }),
    update: (botId: string, id: string, body: Partial<Entity>) => apiFetch<{ data: unknown }>(`/bots/${botId}/entities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (botId: string, id: string) => apiFetch<void>(`/bots/${botId}/entities/${id}`, { method: 'DELETE' }),
  },
  faqs: {
    list: (botId: string) => apiFetch<{ data: Faq[] }>(`/bots/${botId}/faqs`),
    create: (botId: string, body: Partial<Faq>) => apiFetch<{ data: Faq }>(`/bots/${botId}/faqs`, { method: 'POST', body: JSON.stringify(body) }),
    update: (botId: string, id: string, body: Partial<Faq>) => apiFetch<{ data: unknown }>(`/bots/${botId}/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (botId: string, id: string) => apiFetch<void>(`/bots/${botId}/faqs/${id}`, { method: 'DELETE' }),
  },
  sources: {
    list: (botId: string) => apiFetch<{ data: KnowledgeSource[] }>(`/bots/${botId}/sources`),
    create: (botId: string, body: { name: string; kind: string; config: Record<string, unknown> }) =>
      apiFetch<{ data: KnowledgeSource }>(`/bots/${botId}/sources`, { method: 'POST', body: JSON.stringify(body) }),
    upload: async (botId: string, file: File): Promise<{ data: KnowledgeSource }> => {
      const token = getToken()
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${BASE}/bots/${botId}/sources/upload`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: form,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ code: 'UNKNOWN', message: `HTTP ${res.status}` }))
        throw new ApiError(res.status, body?.error ?? body)
      }
      return res.json()
    },
    sync: (botId: string, id: string) => apiFetch<{ data: { queued: boolean } }>(`/bots/${botId}/sources/${id}/sync`, { method: 'POST' }),
    delete: (botId: string, id: string) => apiFetch<void>(`/bots/${botId}/sources/${id}`, { method: 'DELETE' }),
  },
  training: {
    get: (botId: string) => apiFetch<{ data: LlmConfig }>(`/bots/${botId}/training`),
    update: (botId: string, config: Partial<LlmConfig>) => apiFetch<{ data: LlmConfig }>(`/bots/${botId}/training`, { method: 'PUT', body: JSON.stringify(config) }),
    runs: (botId: string) => apiFetch<{ data: TrainingRun[] }>(`/bots/${botId}/training-runs`),
  },
  inboxConfig: {
    get: (botId: string) => apiFetch<{ data: Record<string, unknown> }>(`/bots/${botId}/inbox-config`),
    update: (botId: string, config: Record<string, unknown>) => apiFetch<{ data: Record<string, unknown> }>(`/bots/${botId}/inbox-config`, { method: 'PATCH', body: JSON.stringify(config) }),
  },
}

// ── Conversations ─────────────────────────────────────────────────────────────
export const conversations = {
  list: (params?: Record<string, string>) => apiFetch<{ data: Conversation[] }>(`/conversations?${new URLSearchParams(params ?? {})}`),
  get: (id: string) => apiFetch<{ data: Conversation }>(`/conversations/${id}`),
  create: (body: { botId: string; channelId?: string; contactId?: string; message?: string }) =>
    apiFetch<{ data: Conversation }>('/conversations', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { status?: string; assignedTo?: string | null }) =>
    apiFetch<{ data: unknown }>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  messages: {
    list: (id: string) => apiFetch<{ data: Message[] }>(`/conversations/${id}/messages`),
    send: (id: string, content: { text: string }, authorKind = 'agent') =>
      apiFetch<{ data: Message }>(`/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, authorKind }) }),
  },
  labels: {
    add: (id: string, labelId: string) => apiFetch<{ data: unknown }>(`/conversations/${id}/labels`, { method: 'POST', body: JSON.stringify({ labelId }) }),
    remove: (id: string, labelId: string) => apiFetch<void>(`/conversations/${id}/labels/${labelId}`, { method: 'DELETE' }),
  },
}

// ── Tickets ───────────────────────────────────────────────────────────────────
export const tickets = {
  list: (params?: Record<string, string>) => apiFetch<{ data: Ticket[] }>(`/tickets?${new URLSearchParams(params ?? {})}`),
  create: (body: { conversationId?: string; subject: string; priority?: string; assignedTo?: string; tags?: string[] }) =>
    apiFetch<{ data: Ticket }>('/tickets', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<{ status: string; priority: string; assignedTo: string | null; tags: string[] }>) =>
    apiFetch<{ data: unknown }>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export const contacts = {
  list: (params?: Record<string, string>) => apiFetch<{ data: Contact[] }>(`/contacts?${new URLSearchParams(params ?? {})}`),
  create: (body: { displayName: string; email?: string; phone?: string; metadata?: Record<string, unknown> }) =>
    apiFetch<{ data: Contact }>('/contacts', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Contact>) => apiFetch<{ data: unknown }>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<void>(`/contacts/${id}`, { method: 'DELETE' }),
}

// ── Campaigns + Templates ──────────────────────────────────────────────────────
export const campaigns = {
  list: (botId: string) => apiFetch<{ data: Campaign[] }>(`/bots/${botId}/campaigns`),
  audienceCount: (botId: string, params: { hasEmail?: boolean; hasPhone?: boolean; channel?: string; tags?: string[] }) => {
    const q = new URLSearchParams()
    if (params.hasEmail) q.set('hasEmail', 'true')
    if (params.hasPhone) q.set('hasPhone', 'true')
    if (params.channel) q.set('channel', params.channel)
    if (params.tags?.length) q.set('tags', params.tags.join(','))
    return apiFetch<{ data: { count: number } }>(`/bots/${botId}/campaigns/audience-count?${q}`)
  },
  create: (botId: string, body: { name: string; direction?: string; channel?: string; status?: 'draft' | 'running'; scheduledAt?: string; subject?: string; body?: string; filters?: { hasEmail?: boolean; hasPhone?: boolean; channel?: string; tags?: string[] } }) =>
    apiFetch<{ data: Campaign }>(`/bots/${botId}/campaigns`, { method: 'POST', body: JSON.stringify(body) }),
  launch: (botId: string, id: string) =>
    apiFetch<{ data: { ok: boolean; status: string } }>(`/bots/${botId}/campaigns/${id}/launch`, { method: 'POST' }),
  pause: (botId: string, id: string) =>
    apiFetch<{ data: { ok: boolean; status: string } }>(`/bots/${botId}/campaigns/${id}/pause`, { method: 'POST' }),
  update: (botId: string, id: string, body: Partial<{ name: string; status: string; scheduledAt: string; subject: string; body: string; filters: { hasEmail?: boolean; hasPhone?: boolean; channel?: string; tags?: string[] } }>) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (botId: string, id: string) =>
    apiFetch<void>(`/bots/${botId}/campaigns/${id}`, { method: 'DELETE' }),
  deliveries: (botId: string, id: string) =>
    apiFetch<{ data: CampaignDelivery[] }>(`/bots/${botId}/campaigns/${id}/deliveries`),
}

// ── Channels ─────────────────────────────────────────────────────────────────
export const channels = {
  list: (botId: string) => apiFetch<{ data: Channel[] }>(`/bots/${botId}/channels`),
  create: (botId: string, body: { name: string; kind: string; environmentId: string; config?: Record<string, unknown> }) =>
    apiFetch<{ data: Channel }>(`/bots/${botId}/channels`, { method: 'POST', body: JSON.stringify(body) }),
  update: (botId: string, id: string, body: Partial<{ name: string; config: Record<string, unknown>; isActive: boolean }>) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/channels/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (botId: string, id: string) =>
    apiFetch<void>(`/bots/${botId}/channels/${id}`, { method: 'DELETE' }),
}
export const templates = {
  list: (botId: string, params?: Record<string, string>) => apiFetch<{ data: Template[] }>(`/bots/${botId}/templates?${new URLSearchParams(params ?? {})}`),
  create: (botId: string, body: { name: string; channel: string; content: Record<string, unknown>; variables?: string[]; submitForReview?: boolean }) =>
    apiFetch<{ data: Template }>(`/bots/${botId}/templates`, { method: 'POST', body: JSON.stringify(body) }),
  update: (botId: string, id: string, body: Partial<{ name: string; channel: string; content: Record<string, unknown>; variables: string[]; approvalStatus: string }>) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (botId: string, id: string) =>
    apiFetch<void>(`/bots/${botId}/templates/${id}`, { method: 'DELETE' }),
}

// ── Config ────────────────────────────────────────────────────────────────────
export const webhooks = {
  list: () => apiFetch<{ data: Webhook[] }>('/webhooks'),
  create: (body: { url: string; events: string[]; secret?: string }) =>
    apiFetch<{ data: Webhook }>('/webhooks', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: { isActive?: boolean; events?: string[] }) =>
    apiFetch<{ data: unknown }>(`/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => apiFetch<void>(`/webhooks/${id}`, { method: 'DELETE' }),
  test: (id: string) => apiFetch<{ data: { delivered: boolean; statusCode: number; durationMs: number } }>(`/webhooks/${id}/test`, { method: 'POST' }),
}

export const team = {
  members: () => apiFetch<{ data: TeamMember[] }>('/team/members'),
  invite: (email: string, role: string) => apiFetch<{ data: unknown }>('/team/invites', { method: 'POST', body: JSON.stringify({ email, role }) }),
  updateRole: (id: string, role: string) => apiFetch<{ data: unknown }>(`/team/members/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  remove: (id: string) => apiFetch<void>(`/team/members/${id}`, { method: 'DELETE' }),
  labels: () => apiFetch<{ data: Label[] }>('/team/labels'),
}

export const analytics = {
  overview: (botId?: string) => apiFetch<{ data: AnalyticsOverview }>(`/analytics/overview${botId ? `?botId=${botId}` : ''}`),
  conversations: (params?: Record<string, string>) => apiFetch<{ data: ConversationTrend[] }>(`/analytics/conversations?${new URLSearchParams(params ?? {})}`),
  agents: (params?: Record<string, string>) => apiFetch<{ data: AgentStat[] }>(`/analytics/agents?${new URLSearchParams(params ?? {})}`),
  channels: () => apiFetch<{ data: ChannelStat[] }>('/analytics/channels'),
  csatTrend: (days?: number) => apiFetch<{ data: CsatTrendPoint[] }>(`/analytics/csat-trend?days=${days ?? 30}`),
  resolutionBreakdown: (botId?: string) => apiFetch<{ data: ResolutionBreakdownItem[] }>(`/analytics/resolution-breakdown${botId ? `?botId=${botId}` : ''}`),
  responseTimeByHour: () => apiFetch<{ data: ResponseTimeHourPoint[] }>('/analytics/response-time-by-hour'),
}

export const audit = {
  list: (params?: Record<string, string>) => apiFetch<{ data: AuditEvent[] }>(`/audit?${new URLSearchParams(params ?? {})}`),
}

export const optimizations = {
  list: (botId: string, status?: string) =>
    apiFetch<{ data: TemplateOptimization[] }>(`/bots/${botId}/optimizations${status ? `?status=${status}` : ''}`),
  get: (botId: string, id: string) =>
    apiFetch<{ data: TemplateOptimization }>(`/bots/${botId}/optimizations/${id}`),
  apply: (botId: string, id: string) =>
    apiFetch<{ data: TemplateOptimization }>(`/bots/${botId}/optimizations/${id}/apply`, { method: 'POST' }),
  dismiss: (botId: string, id: string) =>
    apiFetch<{ data: TemplateOptimization }>(`/bots/${botId}/optimizations/${id}/dismiss`, { method: 'POST' }),
}

export const preview = {
  knowledgeStats: (botId: string) =>
    apiFetch<{ data: { chunkCount: number; sourceCount: number } }>(`/bots/${botId}/preview/knowledge-stats`),
  /** Returns the raw fetch Response so the caller can consume the SSE stream. */
  chatStream: (botId: string, body: { message: string; systemPrompt?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }> }): Promise<Response> => {
    const token = (() => { try { const r = localStorage.getItem('ybot-app'); if (!r) return null; const p = JSON.parse(r) as { state?: { token?: string } }; return p?.state?.token ?? null } catch { return null } })()
    return fetch(`${BASE}/bots/${botId}/preview/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify(body),
    })
  },
}

/** Build the WebSocket URL for the tenant real-time channel. */
export function buildWsUrl(token: string): string {
  const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1'
  const isRelative = apiBase.startsWith('/')
  const origin = isRelative ? window.location.origin : new URL(apiBase).origin
  const proto = origin.startsWith('https') ? 'wss' : 'ws'
  const host = origin.replace(/^https?:\/\//, '')
  return `${proto}://${host}/ws?token=${encodeURIComponent(token)}`
}

export const system = {
  status: () => apiFetch<{ data: SystemStatus }>('/system/status'),
  config: () => apiFetch<{ data: SystemConfig }>('/system/config'),
}

export const workflows = {
  list: (botId: string, params?: Record<string, string>) =>
    apiFetch<{ data: AutomationRule[] }>(`/bots/${botId}/workflows?${new URLSearchParams(params ?? {})}`),
  create: (botId: string, body: { name: string; description?: string; trigger: string; conditions?: string; actions?: string[]; status?: string }) =>
    apiFetch<{ data: AutomationRule }>(`/bots/${botId}/workflows`, { method: 'POST', body: JSON.stringify(body) }),
  update: (botId: string, id: string, body: Partial<{ name: string; description: string; trigger: string; conditions: string; actions: string[]; status: string }>) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggle: (botId: string, id: string) =>
    apiFetch<{ data: { status: string } }>(`/bots/${botId}/workflows/${id}/toggle`, { method: 'POST' }),
  delete: (botId: string, id: string) =>
    apiFetch<void>(`/bots/${botId}/workflows/${id}`, { method: 'DELETE' }),
}

export const dashboards = {
  list: (botId: string) =>
    apiFetch<{ data: Dashboard[] }>(`/bots/${botId}/dashboards`),
  create: (botId: string, body: { name: string; layout?: unknown[] }) =>
    apiFetch<{ data: Dashboard }>(`/bots/${botId}/dashboards`, { method: 'POST', body: JSON.stringify(body) }),
  update: (botId: string, id: string, body: Partial<{ name: string; layout: unknown[] }>) =>
    apiFetch<{ data: unknown }>(`/bots/${botId}/dashboards/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (botId: string, id: string) =>
    apiFetch<void>(`/bots/${botId}/dashboards/${id}`, { method: 'DELETE' }),
}
// ── Types ─────────────────────────────────────────────────────────────────────
export interface BotSummary { id: string; name: string; description?: string; status: string; environments: Array<{ id: string; kind: string; name: string }> }
export interface Flow { id: string; name: string; description?: string; kind: string; tags: string[]; updatedAt: string; versions: FlowVersion[] }
export interface FlowVersion { id: string; version: number; status: string; graph: FlowGraph; publishedAt?: string }
export interface FlowGraph { nodes: FlowNode[]; edges: FlowEdge[] }
export interface FlowNode { id: string; type: string; position: { x: number; y: number }; data: { kind: string; label: string; config: Record<string, unknown> } }
export interface FlowEdge { id: string; source: string; target: string; sourceHandle?: string }
export interface Intent { id: string; name: string; description?: string; utterances: string[]; responses: object[] }
export interface Entity { id: string; name: string; kind: string; values: object[] }
export interface Faq { id: string; question: string; answer: string; tags: string[] }
export interface KnowledgeSource { id: string; name: string; kind: string; config: Record<string, unknown>; lastSyncAt?: string; documents: Array<{ id: string; status: string }> }
export interface LlmConfig { model: string; temperature: number; maxTokens: number; systemPrompt: string }
export interface Conversation { id: string; status: string; assignedTo?: string; contact?: Contact; channel?: { id: string; name: string; kind: string }; messages: Message[]; labels: Array<{ label: Label }>; updatedAt: string }
export interface Message { id: string; direction: string; authorKind: string; content: { text: string }; createdAt: string }
export interface Ticket { id: string; subject: string; status: string; priority: string; assignedTo?: string; tags: string[]; createdAt: string; conversation?: { contact?: Contact } }
export interface Contact { id: string; displayName?: string; email?: string; phone?: string; metadata: Record<string, unknown>; createdAt: string }
export interface Campaign { id: string; name: string; channel: string; status: string; direction: string; subject?: string; body?: string; scheduledAt?: string; sentAt?: string; sent?: number; delivered?: number }
export interface CampaignDelivery { id: string; contactId: string; email?: string; status: string; sentAt?: string; error?: string }
export interface Template { id: string; name: string; channel: string; approvalStatus: string; content: Record<string, unknown>; variables: string[] }
export interface Channel { id: string; name: string; kind: string; config: Record<string, unknown>; isActive: boolean; botId: string; createdAt: string }
export interface Webhook { id: string; url: string; events: string[]; isActive: boolean; createdAt: string }
export interface Label { id: string; name: string; color: string }
export interface TeamMember { id: string; displayName: string; email: string; memberships: Array<{ role: string }>; agentProfile?: { status: string } }
export interface AnalyticsOverview { totalConversations: number; resolvedConversations: number; resolutionRate: number; escalationRate: number; totalContacts: number; csatScore: number; avgResponseTimeMs: number | null; botHandledPct: number }
export interface ConversationTrend { date: string; conversations: number; resolved: number; escalated: number }
export interface AgentStat { agentId: string; name: string; total: number; resolved: number; escalated: number; resolutionRate: number }
export interface ChannelStat { channelId: string; name: string; total: number }
export interface CsatTrendPoint { date: string; score: number; positive: number; negative: number }
export interface ResolutionBreakdownItem { name: string; value: number }
export interface ResponseTimeHourPoint { hour: string; time: number }
export interface TrainingRun { id: string; createdAt: string; model: string; examples: number; intents: number; faqs: number; sources: number; status: string; durationMs: number }
export interface AuditEvent { id: string; action: string; resource?: string; metadata: Record<string, unknown>; createdAt: string; user?: { displayName: string; email: string } }

export interface DockerContainer { id: string; name: string; image: string; state: string; status: string; created?: number }
export interface ServicePing { ok: boolean; latencyMs: number }
export interface RagSourceEntry { id: string; name: string; lastSyncAt?: string; _count: { documents: number } }
export interface SystemStatus {
  services: { database: ServicePing; redis: ServicePing }
  containers: DockerContainer[]
  rag: { sources: number; documents: number; chunks: number; sourceList: RagSourceEntry[] }
  system: { platform: string; uptime: number; nodeVersion: string; cpuCount: number; totalMemMb: number; freeMemMb: number; usedMemPct: number }
  version?: { version: string; buildNumber: string; gitSha: string; buildDate: string }
  ts: string
}

export interface ConfigEntry { set: boolean; label: string; value?: string | null; endpoint?: string | null }
export interface SystemConfig {
  auth: { JWT_SECRET: ConfigEntry }
  database: { DATABASE_URL: ConfigEntry }
  cache: { REDIS_URL: ConfigEntry }
  storage: { S3_ENDPOINT: ConfigEntry; S3_BUCKET: ConfigEntry; S3_REGION: ConfigEntry }
  llm: { OPENAI_API_KEY: ConfigEntry; ANTHROPIC_API_KEY: ConfigEntry; GROQ_API_KEY: ConfigEntry; OLLAMA_BASE_URL: ConfigEntry }
  app: { NODE_ENV: ConfigEntry; FRONTEND_URL: ConfigEntry }
}

export interface TemplateOptimization {
  id: string
  tenantId: string
  botId: string
  templateId?: string | null
  kind: string
  title: string
  description: string
  currentValue?: string | null
  proposedValue: string
  evidenceCount: number
  avgQualityScore: number
  status: 'pending' | 'applied' | 'dismissed'
  appliedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AutomationRule {
  id: string
  tenantId: string
  botId: string
  name: string
  description?: string
  trigger: string
  conditions: string
  actions: string[]
  status: 'active' | 'paused' | 'draft'
  runCount: number
  lastRunAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Dashboard {
  id: string
  tenantId: string
  botId: string
  name: string
  layout: unknown[]
  createdAt: string
  updatedAt: string
  widgets?: Array<{ id: string; kind: string; title: string; config: Record<string, unknown> }>
}
