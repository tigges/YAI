import React, { useState } from 'react'
import {
  Dumbbell, Play, CheckCircle, Clock, AlertCircle,
  Cpu, TrendingUp, RefreshCw, Info,
} from 'lucide-react'
import { Button, Badge, Card, CardHeader, CardTitle } from '@ybot/ui'
import { SubNav } from '../../../components/SubNav'
import { cn } from '@ybot/ui'
import { useTraining, useSaveTraining } from '../../../lib/hooks'

const SUBNAV = [
  { label: 'Intents', path: '/build/knowledge/intents' },
  { label: 'Entities', path: '/build/knowledge/entities' },
  { label: 'FAQs', path: '/build/knowledge/faqs' },
  { label: 'Sources', path: '/build/knowledge/sources' },
  { label: 'Training', path: '/build/knowledge/training' },
]

// ── Model catalogue ────────────────────────────────────────────────────────
const MODEL_GROUPS: Array<{
  label: string
  envVar: string
  signupUrl?: string
  free?: boolean
  models: Array<{ value: string; label: string; note?: string }>
}> = [
  {
    label: 'Google Gemini',
    envVar: 'GEMINI_API_KEY',
    signupUrl: 'https://aistudio.google.com',
    free: true,
    models: [
      { value: 'gemini-2.0-flash',    label: 'Gemini 2.0 Flash',    note: 'Recommended default — fast, capable, free tier' },
      { value: 'gemini-1.5-flash',    label: 'Gemini 1.5 Flash',    note: 'Free tier, slightly older' },
      { value: 'gemini-1.5-pro',      label: 'Gemini 1.5 Pro',      note: 'Higher quality, lower RPM on free tier' },
    ],
  },
  {
    label: 'Groq',
    envVar: 'GROQ_API_KEY',
    signupUrl: 'https://console.groq.com',
    free: true,
    models: [
      { value: 'groq/llama-3.3-70b-versatile', label: 'Llama 3.3 70B',   note: 'Best open-source quality, free tier' },
      { value: 'groq/llama-3.1-8b-instant',    label: 'Llama 3.1 8B',    note: 'Ultra-fast, lower quality' },
      { value: 'groq/mixtral-8x7b-32768',      label: 'Mixtral 8x7B',    note: 'Good for multilingual' },
    ],
  },
  {
    label: 'OpenAI',
    envVar: 'OPENAI_API_KEY',
    signupUrl: 'https://platform.openai.com',
    models: [
      { value: 'gpt-4o',      label: 'GPT-4o',      note: 'Best quality' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', note: 'Cost-effective' },
    ],
  },
  {
    label: 'Anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    signupUrl: 'https://console.anthropic.com',
    models: [
      { value: 'claude-sonnet-4-5',   label: 'Claude Sonnet 4.5', note: 'Latest Sonnet, excellent reasoning' },
      { value: 'claude-3-5-sonnet',   label: 'Claude 3.5 Sonnet', note: 'Previous Sonnet' },
      { value: 'claude-3-haiku',      label: 'Claude 3 Haiku',    note: 'Fast and cheap' },
    ],
  },
  {
    label: 'Local (Ollama)',
    envVar: 'OLLAMA_BASE_URL',
    signupUrl: 'https://ollama.ai',
    models: [
      { value: 'ollama/llama3.2',  label: 'Llama 3.2 (local)',  note: 'No internet needed' },
      { value: 'ollama/mistral',   label: 'Mistral (local)',    note: 'Lightweight option' },
    ],
  },
]

const MODEL_TO_GROUP: Record<string, (typeof MODEL_GROUPS)[number]> = {}
MODEL_GROUPS.forEach((g) => g.models.forEach((m) => { MODEL_TO_GROUP[m.value] = g }))

interface TrainingRun {
  id: string
  status: 'success' | 'running' | 'failed'
  triggeredBy: string
  startedAt: string
  duration: string
  intents: number
  entities: number
  accuracy?: number
}

const MOCK_RUNS: TrainingRun[] = [
  { id: '1', status: 'success', triggeredBy: 'admin@acme.com', startedAt: '2h ago', duration: '1m 42s', intents: 5, entities: 3, accuracy: 94.2 },
  { id: '2', status: 'success', triggeredBy: 'dev@acme.com', startedAt: '1d ago', duration: '1m 18s', intents: 4, entities: 3, accuracy: 91.8 },
  { id: '3', status: 'failed', triggeredBy: 'admin@acme.com', startedAt: '3d ago', duration: '0m 12s', intents: 4, entities: 2 },
  { id: '4', status: 'success', triggeredBy: 'dev@acme.com', startedAt: '5d ago', duration: '1m 05s', intents: 3, entities: 2, accuracy: 88.5 },
]

export function TrainingPage() {
  const { data: config } = useTraining()
  const saveTraining = useSaveTraining()
  const [runs, setRuns] = useState(MOCK_RUNS)
  const [training, setTraining] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedModel, setSelectedModel] = useState(config?.model ?? 'gemini-2.0-flash')
  const [temperature, setTemperature] = useState(String(config?.temperature ?? 0.3))
  const [systemPrompt, setSystemPrompt] = useState(config?.systemPrompt ?? 'You are a helpful customer support assistant.')

  React.useEffect(() => {
    if (config) {
      setSelectedModel(config.model ?? 'gemini-2.0-flash')
      setTemperature(String(config.temperature ?? 0.3))
      setSystemPrompt(config.systemPrompt ?? '')
    }
  }, [config])

  async function handleSaveConfig() {
    try {
      await saveTraining.mutateAsync({ model: selectedModel, temperature: parseFloat(temperature), systemPrompt })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* demo mode */ }
  }

  async function handleTrain() {
    setTraining(true)
    try {
      await saveTraining.mutateAsync({ model: selectedModel, temperature: parseFloat(temperature), systemPrompt })
    } catch { /* demo mode */ }
    await new Promise((r) => setTimeout(r, 1500))
    setRuns((rs) => [{
      id: `run-${Date.now()}`,
      status: 'success',
      triggeredBy: 'admin@acme.com',
      startedAt: 'just now',
      duration: '1m 38s',
      intents: 5,
      entities: 3,
      accuracy: 95.1,
    }, ...rs])
    setTraining(false)
  }

  const latestSuccess = runs.find((r) => r.status === 'success')
  const selectedGroup = MODEL_TO_GROUP[selectedModel]
  const selectedModelMeta = selectedGroup?.models.find((m) => m.value === selectedModel)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-6 pt-4 pb-0">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Knowledge</h1>
          <Button size="sm" onClick={handleTrain} disabled={training}>
            {training ? (
              <><RefreshCw size={13} className="animate-spin" /> Training…</>
            ) : (
              <><Play size={13} /> Run Training</>
            )}
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* LLM Config */}
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <Cpu size={15} className="text-[var(--accent)]" />
              <CardTitle>LLM Configuration</CardTitle>
            </div>
          </CardHeader>
          <div className="px-4 pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
                >
                  {MODEL_GROUPS.map((g) => (
                    <optgroup key={g.label} label={`${g.label}${g.free ? ' (free)' : ''} · ${g.envVar}`}>
                      {g.models.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {/* Contextual hint for the selected model */}
                {selectedGroup && (
                  <p className="mt-1.5 text-[11px] text-[var(--text-muted)] flex items-start gap-1">
                    <Info size={11} className="shrink-0 mt-0.5" />
                    <span>
                      Requires <code className="font-mono bg-[var(--bg-elevated)] px-0.5 rounded">{selectedGroup.envVar}</code>
                      {selectedGroup.free && <span className="text-[var(--success)] ml-1">· free tier available</span>}
                      {selectedGroup.signupUrl && (
                        <a href={selectedGroup.signupUrl} target="_blank" rel="noreferrer" className="ml-1 underline">
                          Get key ↗
                        </a>
                      )}
                      {selectedModelMeta?.note && <span className="ml-1 text-[var(--text-muted)]">— {selectedModelMeta.note}</span>}
                    </span>
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Temperature: {temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  className="mt-2 w-full accent-[var(--accent)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>Precise (0)</span><span>Creative (1)</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)]">System Prompt</label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none resize-none"
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={handleSaveConfig} disabled={saveTraining.isPending}>
                {saved ? 'Saved!' : saveTraining.isPending ? 'Saving…' : 'Save Config'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Current model metrics */}
        {latestSuccess && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <p className="text-xs text-[var(--text-muted)]">Intent Accuracy</p>
              <p className="text-2xl font-bold text-[var(--success)] mt-1">{latestSuccess.accuracy}%</p>
              <Badge variant="success" dot className="mt-1">Last training</Badge>
            </Card>
            <Card>
              <p className="text-xs text-[var(--text-muted)]">Intents Trained</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{latestSuccess.intents}</p>
            </Card>
            <Card>
              <p className="text-xs text-[var(--text-muted)]">Entities Trained</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{latestSuccess.entities}</p>
            </Card>
          </div>
        )}

        {/* Training history */}
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-[var(--accent)]" />
              <CardTitle>Training History</CardTitle>
            </div>
          </CardHeader>
          <div className="divide-y divide-[var(--border)]">
            {runs.map((run) => {
              const StatusIcon = run.status === 'success' ? CheckCircle : run.status === 'running' ? Clock : AlertCircle
              return (
                <div key={run.id} className="flex items-center gap-4 px-4 py-3">
                  <StatusIcon
                    size={15}
                    className={cn(
                      run.status === 'success' ? 'text-[var(--success)]' :
                      run.status === 'running' ? 'text-[var(--warning)] animate-spin' :
                      'text-[var(--error)]'
                    )}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={run.status === 'success' ? 'success' : run.status === 'running' ? 'warning' : 'error'}
                        dot
                      >
                        {run.status}
                      </Badge>
                      {run.accuracy && (
                        <span className="text-xs text-[var(--text-secondary)]">{run.accuracy}% accuracy</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {run.intents} intents · {run.entities} entities · {run.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-muted)]">{run.startedAt}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{run.triggeredBy}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
