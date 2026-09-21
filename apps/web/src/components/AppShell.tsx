import React, { useState } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { NavRail } from './NavRail'
import { TopBar } from './TopBar'
import { useAppStore } from '../store/app'
import { apiFetch } from '../lib/api'
import type { Bot } from '../store/app'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [darkMode, setDarkMode] = useState(true)
  const navigate = useNavigate()
  const { bots, setBots, setBotsLoading, clearAuth } = useAppStore()

  // Bootstrap: on every page refresh the bots list starts empty because it is
  // intentionally excluded from localStorage persistence.  Fetch once from the
  // API so the TopBar bot-selector is always populated for authenticated users.
  React.useEffect(() => {
    if (bots.length > 0) return
    setBotsLoading(true)
    apiFetch<{ data: Bot[] }>('/bots')
      .then((r) => setBots(r.data))
      .catch((err: unknown) => {
        setBotsLoading(false)
        const status = (err as { status?: number })?.status
        if (status === 401 || status === 403) {
          clearAuth()
          navigate({ to: '/sign-in' })
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode)
  }, [darkMode])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-base)]">
      <NavRail
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((d) => !d)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
