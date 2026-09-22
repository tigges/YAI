import React, { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button, Input, Card } from '@ybot/ui'
import { useAppStore } from '../store/app'
import { apiFetch } from '../lib/api'
import type { Bot } from '../store/app'

const isDemoMode = () => import.meta.env.VITE_DEMO_MODE === 'true'

export function BotNewPage() {
  const navigate = useNavigate()
  const { setBots, bots } = useAppStore()
  const [name, setName] = useState('')
  const [personaName, setPersonaName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (isDemoMode()) {
      const demoBot: Bot = {
        id: `demo-bot-${Date.now()}`,
        name,
        description: description || undefined,
        status: 'active',
        environments: [
          { id: 'demo-env-sandbox', kind: 'sandbox', name: 'Sandbox' },
          { id: 'demo-env-prod', kind: 'production', name: 'Production' },
        ],
      }
      setBots([...bots, demoBot])
      navigate({ to: '/overview' })
      return
    }

    try {
      const created = await apiFetch<{ data: Bot }>('/bots', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      })
      // Set personaName separately if provided (PATCH after create)
      if (personaName.trim() && created?.data?.id) {
        await apiFetch(`/bots/${created.data.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ personaName: personaName.trim() }),
        }).catch(() => {})
      }
      const botsRes = await apiFetch<{ data: Bot[] }>('/bots')
      setBots(botsRes.data)
      navigate({ to: '/overview' })
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-[440px]">
        <h1 className="mb-6 text-xl font-bold text-[var(--text-primary)]">Create new bot</h1>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Internal name"
              placeholder="Salon Support Bot v2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              hint="Visible only inside BotStudio"
            />
            <Input
              label="Persona name (customer-facing)"
              placeholder="Bella"
              value={personaName}
              onChange={(e) => setPersonaName(e.target.value)}
              hint="First name shown to customers: 'Hi, I'm Bella!'"
            />
            <Input
              label="Description (optional)"
              placeholder="Handles booking queries for Bella Hair Studio"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {error && <p className="text-xs text-[var(--error)]">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" type="button" onClick={() => navigate({ to: '/bots' })}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()}>
                {loading ? 'Creating…' : 'Create bot'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
