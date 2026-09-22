import React, { useState } from 'react'
import {
  Globe, MessageSquare, Phone, Mail, Facebook,
  Send, CheckCircle2, Circle, Pencil, Trash2, Plus, Code2,
  Copy, Loader2, FlaskConical, Wand2,
} from 'lucide-react'
import { Badge, Button } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'
import { useChannels, useCreateChannel, useDeleteChannel } from '../../lib/hooks'
import type { Channel } from '../../lib/api'
import { useAppStore } from '../../store/app'
import { WidgetSetupWizard } from './WidgetSetupWizard'

const SUBNAV = [
  { label: 'Channels',      path: '/configure/channels' },
  { label: 'Optimizations', path: '/configure/optimizations' },
  { label: 'Integrations',  path: '/configure/integrations' },
  { label: 'Database',      path: '/configure/database' },
  { label: 'Webhooks',      path: '/configure/webhooks' },
]

const KIND_META: Record<string, { label: string; description: string; icon: React.ReactNode; docsUrl?: string }> = {
  web:       { label: 'Web Widget',          description: 'Embeddable chat widget for your website', icon: <Globe size={22} /> },
  whatsapp:  { label: 'WhatsApp Business',   description: 'Connect via WhatsApp Business API',       icon: <MessageSquare size={22} />, docsUrl: 'https://developers.facebook.com/docs/whatsapp' },
  sms:       { label: 'SMS (Twilio)',        description: 'Send and receive SMS via Twilio',          icon: <Phone size={22} />, docsUrl: 'https://www.twilio.com/docs' },
  email:     { label: 'Email',               description: 'Receive and reply to emails',             icon: <Mail size={22} /> },
  facebook:  { label: 'Facebook Messenger',  description: 'Connect your Facebook Page inbox',       icon: <Facebook size={22} /> },
  telegram:  { label: 'Telegram',            description: 'Deploy a Telegram bot',                  icon: <Send size={22} /> },
}

const ADD_KINDS = ['web', 'whatsapp', 'sms', 'email', 'facebook', 'telegram']

function getEmbedCode(channelId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `<!-- YBot chat widget -->
<script src="${base}/api/v1/widget.js?id=${channelId}" async></script>

<!-- Optional customisation -->
<script>
  window.YBotTitle = 'Chat with us';
  window.YBotAccentColor = '#6366f1';
</script>`
}

function getTestUrl(channelId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/api/v1/widget-test/${channelId}`
}

function getDemoUrl(channelId: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/api/v1/public/demo/${channelId}`
}

export function ChannelsPage() {
  const selectedBotId = useAppStore((s: { selectedBotId: string | null }) => s.selectedBotId) ?? ''
  const { data: channels = [], isLoading } = useChannels()
  const createChannel = useCreateChannel()
  const deleteChannel = useDeleteChannel()

  const [selected, setSelected]       = useState<Channel | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [showEmbed, setShowEmbed]     = useState<Channel | null>(null)
  const [addKind, setAddKind]         = useState('web')
  const [addName, setAddName]         = useState('')
  const [copied, setCopied]           = useState(false)
  const [showWizard, setShowWizard]   = useState(false)

  function copyEmbed(channelId: string) {
    navigator.clipboard?.writeText(getEmbedCode(channelId)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate() {
    if (!addName.trim()) return
    const envs = (useAppStore.getState() as unknown as { selectedBot?: { environments?: Array<{ id: string }> } }).selectedBot
    const envId = envs?.environments?.[0]?.id ?? selectedBotId
    await createChannel.mutateAsync({ name: addName.trim(), kind: addKind, environmentId: envId })
    setShowAdd(false)
    setAddName('')
    setAddKind('web')
  }

  function handleAddChannel() {
    setAddKind('web')
    setShowAdd(true)
  }

  return (
    <div className="flex flex-col h-full">
      {showWizard && <WidgetSetupWizard onClose={() => setShowWizard(false)} />}

      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Configure</h1>
          <Button size="sm" className="gap-1.5" onClick={handleAddChannel}>
            <Plus size={14} /> Add Channel
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6">
          {[
            { label: 'Total channels', value: channels.length },
            { label: 'Active',         value: channels.filter((c) => c.isActive).length },
            { label: 'Web widgets',    value: channels.filter((c) => c.kind === 'web').length },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--text-primary)]">{s.value}</span>
              <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading channels…
          </div>
        )}

        {!isLoading && channels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Globe size={40} className="text-[var(--text-muted)]" />
            <div className="text-center">
              <p className="font-semibold text-[var(--text-primary)] mb-1">No channels yet</p>
              <p className="text-sm text-[var(--text-muted)]">Add a channel to start receiving conversations.</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" className="gap-1.5" onClick={() => setShowWizard(true)}>
                <Wand2 size={14} /> Set up web widget
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleAddChannel}>
                <Plus size={14} /> Other channel
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map((ch) => {
            const meta = KIND_META[ch.kind] ?? { label: ch.kind, description: ch.name, icon: <Globe size={22} /> }
            return (
              <div
                key={ch.id}
                className={cn(
                  'rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-5 cursor-pointer hover:border-[var(--accent)]/40 transition-colors group',
                  ch.isActive ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-70',
                )}
                onClick={() => setSelected(ch)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'p-3 rounded-[var(--radius-md)]',
                    ch.isActive ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]'
                  )}>
                    {meta.icon}
                  </div>
                  <div className="flex items-center gap-1">
                    {ch.kind === 'web' && (
                      <>
                        <button
                          title="Test widget in new tab"
                          onClick={(e) => { e.stopPropagation(); window.open(getTestUrl(ch.id), '_blank') }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                        >
                          <FlaskConical size={14} />
                        </button>
                        <button
                          title="View embed code"
                          onClick={(e) => { e.stopPropagation(); setShowEmbed(ch) }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
                        >
                          <Code2 size={14} />
                        </button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] transition-all"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelected(ch)}><Pencil size={13} /> Settings</DropdownMenuItem>
                        {ch.kind === 'web' && <DropdownMenuItem onClick={() => { setShowWizard(true) }}><Wand2 size={13} /> Setup wizard</DropdownMenuItem>}
                        {ch.kind === 'web' && <DropdownMenuItem onClick={() => window.open(getTestUrl(ch.id), '_blank')}><FlaskConical size={13} /> Test widget</DropdownMenuItem>}
                        {ch.kind === 'web' && <DropdownMenuItem onClick={() => setShowEmbed(ch)}><Code2 size={13} /> Embed code</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => deleteChannel.mutate(ch.id)}><Trash2 size={13} /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="font-semibold text-[var(--text-primary)] mb-0.5">{ch.name}</h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">{meta.description}</p>

                <div className="flex items-center justify-between">
                  <span className={cn('flex items-center gap-1.5 text-xs font-medium', ch.isActive ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')}>
                    {ch.isActive ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                    {ch.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Badge variant="muted" className="text-[10px] uppercase tracking-wide">{ch.kind}</Badge>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Channel settings dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        {selected && (() => {
          const meta = KIND_META[selected.kind] ?? { label: selected.kind, description: '', icon: <Globe size={22} /> }
          return (
            <DialogContent size="md">
              <DialogHeader><DialogTitle>{meta.label} settings</DialogTitle></DialogHeader>
              <DialogBody className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)]">
                  <span className={cn('p-2 rounded-[var(--radius-md)]', selected.isActive ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]')}>
                    {meta.icon}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{selected.name}</p>
                    <p className={cn('text-xs font-medium', selected.isActive ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')}>{selected.isActive ? 'Active' : 'Inactive'}</p>
                  </div>
                </div>

                {selected.kind === 'web' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Embed code</label>
                      <Button variant="ghost" size="sm" className="gap-1.5 h-6 text-xs" onClick={() => { setSelected(null); setShowEmbed(selected) }}>
                        <Code2 size={11} /> View full
                      </Button>
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2">
                      <code className="text-[11px] text-[var(--text-muted)] font-mono break-all">…/widget.js?id={selected.id}</code>
                    </div>
                  </div>
                )}

                {selected.kind === 'web' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Live preview</label>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="gap-1.5 h-6 text-xs" onClick={() => window.open(getDemoUrl(selected.id), '_blank')}>
                          🌐 Demo site
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-6 text-xs" onClick={() => window.open(getTestUrl(selected.id), '_blank')}>
                          <FlaskConical size={11} /> Widget only
                        </Button>
                      </div>
                    </div>
                    <div className="relative rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden bg-[#f8fafc]" style={{ height: 300 }}>
                      <iframe
                        key={selected.id}
                        src={getTestUrl(selected.id)}
                        title="Widget preview"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                      />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1.5">Click the 💬 bubble to start a test conversation — or open the <strong>Demo site</strong> to test from a realistic customer-facing page.</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-[var(--text-muted)]">Channel ID: <code className="font-mono bg-[var(--bg-overlay)] px-1 rounded">{selected.id}</code></p>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
                {selected.kind === 'web' && (
                  <Button variant="ghost" className="gap-1.5" onClick={() => { setSelected(null); window.open(getTestUrl(selected.id), '_blank') }}>
                    <FlaskConical size={14} /> Test Widget
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          )
        })()}
      </Dialog>

      {/* Embed code dialog */}
      <Dialog open={!!showEmbed} onOpenChange={(o) => { if (!o) setShowEmbed(null) }}>
        {showEmbed && (
          <DialogContent size="md">
            <DialogHeader><DialogTitle>Web widget embed code</DialogTitle></DialogHeader>
            <DialogBody>
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Paste this snippet just before the <code className="font-mono text-xs bg-[var(--bg-overlay)] px-1 rounded">&lt;/body&gt;</code> tag of your website.
              </p>
              <div className="relative">
                <pre className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] p-4 text-xs text-[var(--text-secondary)] font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {getEmbedCode(showEmbed.id)}
                </pre>
                <button
                  onClick={() => copyEmbed(showEmbed.id)}
                  className="absolute top-2 right-2 px-2 py-1 rounded text-xs bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
                >
                  {copied ? <CheckCircle2 size={11} className="text-[var(--success)]" /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-3">
                Channel ID: <code className="font-mono bg-[var(--bg-overlay)] px-1 rounded">{showEmbed.id}</code>
              </p>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => setShowEmbed(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Add channel dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Add a channel</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            {/* Web widget – promote wizard */}
            <button
              onClick={() => { setShowAdd(false); setShowWizard(true) }}
              className="w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border-2 border-[var(--accent)] bg-[var(--accent-muted)] text-left hover:bg-[var(--accent)]/15 transition-colors"
            >
              <span className="p-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-white shrink-0"><Globe size={16} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--accent)]">Web Widget</p>
                <p className="text-xs text-[var(--text-muted)]">Guided wizard — customise, get embed code, verify</p>
              </div>
              <Wand2 size={14} className="text-[var(--accent)] shrink-0" />
            </button>

            <div className="relative flex items-center gap-2">
              <div className="flex-1 border-t border-[var(--border)]" />
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">Other channels</span>
              <div className="flex-1 border-t border-[var(--border)]" />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Channel type</label>
              <div className="grid grid-cols-2 gap-2">
                {ADD_KINDS.filter((k) => k !== 'web').map((k) => {
                  const m = KIND_META[k]!
                  return (
                    <button
                      key={k}
                      onClick={() => setAddKind(k)}
                      className={cn(
                        'flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] border text-left text-xs transition-colors',
                        addKind === k ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                      )}
                    >
                      <span className="shrink-0">{m.icon}</span> {m.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Channel name *</label>
              <input
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder={`e.g. ${KIND_META[addKind]?.label ?? 'My channel'}`}
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              disabled={!addName.trim() || createChannel.isPending}
              onClick={handleCreate}
            >
              {createChannel.isPending ? 'Creating…' : 'Add channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
