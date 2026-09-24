import React, { useState } from 'react'
import { Workflow, Plus, Search, Play, Trash2, Pencil } from 'lucide-react'
import { Button, Input, Badge, Table, THead, TBody, TR, TH, TD, EmptyState, PageHeader, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { useNavigate } from '@tanstack/react-router'
import { useFlows, useCreateFlow, useDeleteFlow, useUpdateFlow, usePublishFlow } from '../../lib/hooks'
import { useAppStore } from '../../store/app'

const SUBNAV = [
  { label: 'Flows', path: '/build/flows' },
  { label: 'Workflows', path: '/build/workflows' },
]

export function FlowsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string; description: string } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  const { data: flows = [], isLoading } = useFlows()
  const createFlow = useCreateFlow()
  const updateFlow = useUpdateFlow()
  const deleteFlow = useDeleteFlow()
  const publishFlow = usePublishFlow()
  const environments = useAppStore((s) => s.bots.find((b) => b.id === s.selectedBotId)?.environments ?? [])
  const publishEnv = environments.find((env) => env.kind === 'sandbox') ?? environments.find((env) => env.kind === 'production')
  const suggested = flows.filter((flow) => flow.tags?.includes('proposed') && flow.versions?.[0]?.status !== 'published')

  const filtered = flows.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 2) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const flow = await createFlow.mutateAsync({ name: newName.trim(), description: newDesc.trim() || undefined })
      setShowNew(false); setNewName(''); setNewDesc('')
      navigate({ to: '/build/flows/$flowId', params: { flowId: flow.id } })
    } catch {
      // The dialog stays open and shows createFlow.isError.
    }
  }

  async function saveRename() {
    if (!renaming?.name.trim()) return
    await updateFlow.mutateAsync({
      flowId: renaming.id,
      name: renaming.name.trim(),
      description: renaming.description.trim(),
    })
    setRenaming(null)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Flows"
        description="Visual conversation flow builder"
        actions={
          <Button size="md" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Flow
          </Button>
        }
        tabs={<SubNav items={SUBNAV} />}
      />

      <div className="flex-1 overflow-auto p-6">
        {suggested.length > 0 && (
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <p className="text-sm font-medium text-[var(--text-primary)]">Suggested from chats</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              These drafts stay unpublished until you publish one. The welcome flow then hands off to it next time.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {suggested.map((flow) => (
                <div key={flow.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--text-primary)]">{flow.name}</p>
                    {flow.description && <p className="text-xs text-[var(--text-muted)]">{flow.description}</p>}
                  </div>
                  <Button
                    size="sm"
                    disabled={!publishEnv || publishFlow.isPending}
                    onClick={() => publishEnv && publishFlow.mutate({ flowId: flow.id, environmentId: publishEnv.id })}
                  >
                    {publishEnv?.kind === 'sandbox' ? 'Publish to Sandbox' : 'Publish'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search flows…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-md)]" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Workflow size={20} />}
            title="No flows yet"
            description="Create your first flow to start building conversations."
            action={<Button size="md" onClick={() => setShowNew(true)}><Plus size={14} /> New Flow</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Version</TH>
                <TH>Updated</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {filtered.map((flow) => {
                const latest = flow.versions?.[0]
                return (
                  <TR key={flow.id} onClick={() => navigate({ to: '/build/flows/$flowId', params: { flowId: flow.id } })}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Workflow size={14} className="text-[var(--text-muted)]" />
                        <div>
                          <span className="font-medium">{flow.name}</span>
                          {flow.description && <p className="text-xs text-[var(--text-muted)]">{flow.description}</p>}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={latest?.status === 'published' ? 'success' : 'muted'} dot>
                        {latest?.status ?? 'draft'}
                      </Badge>
                    </TD>
                    <TD className="text-[var(--text-muted)]">v{latest?.version ?? 1}</TD>
                    <TD className="text-[var(--text-muted)]">{relativeTime(flow.updatedAt)}</TD>
                    <TD>
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon-sm" title="Rename" onClick={() => setRenaming({ id: flow.id, name: flow.name, description: flow.description ?? '' })}><Pencil size={12} /></Button>
                        <Button variant="ghost" size="icon-sm" title="Open canvas" onClick={() => navigate({ to: '/build/flows/$flowId', params: { flowId: flow.id } })}><Play size={12} /></Button>
                        <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => setDeleting({ id: flow.id, name: flow.name })}><Trash2 size={12} /></Button>
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>New flow</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Name *</label>
              <Input autoFocus placeholder="e.g. Welcome & Routing" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Description</label>
              <Input placeholder="What does this flow do?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            {createFlow.isError && (
              <p className="text-xs text-[var(--danger)]">Could not create this flow. Please try again.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || createFlow.isPending} onClick={handleCreate}>
              {createFlow.isPending ? 'Creating…' : 'Create flow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(open) => { if (!open) setRenaming(null) }}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Rename flow</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Name *</label>
              <Input autoFocus value={renaming?.name ?? ''} onChange={(e) => setRenaming((current) => current ? { ...current, name: e.target.value } : current)} onKeyDown={(e) => e.key === 'Enter' && void saveRename()} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Description</label>
              <Input value={renaming?.description ?? ''} onChange={(e) => setRenaming((current) => current ? { ...current, description: e.target.value } : current)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button disabled={!renaming?.name.trim() || updateFlow.isPending} onClick={() => void saveRename()}>
              {updateFlow.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Delete flow</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-[var(--text-secondary)]">Delete {deleting?.name}? The canvas for this flow is removed.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              disabled={deleteFlow.isPending}
              onClick={() => {
                if (!deleting) return
                deleteFlow.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
              }}
            >
              {deleteFlow.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
