import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CurrentUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string | null
  tenantId: string
  role: string
}

export interface Bot {
  id: string
  name: string
  personaName?: string | null
  description?: string | null
  avatarUrl?: string | null
  status: string
  environments: Array<{
    id: string
    kind: string
    name: string
  }>
}

interface AppStore {
  user: CurrentUser | null
  token: string | null
  bots: Bot[]
  botsLoading: boolean
  selectedBotId: string | null
  selectedEnv: 'sandbox' | 'production'

  setAuth: (user: CurrentUser, token: string) => void
  clearAuth: () => void
  setBots: (bots: Bot[]) => void
  setBotsLoading: (loading: boolean) => void
  selectBot: (botId: string) => void
  setEnv: (env: 'sandbox' | 'production') => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      bots: [],
      botsLoading: false,
      selectedBotId: null,
      selectedEnv: 'sandbox',

      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null, bots: [], botsLoading: false, selectedBotId: null }),
      setBots: (bots) =>
        set((state) => ({
          bots,
          botsLoading: false,
          selectedBotId: state.selectedBotId ?? bots[0]?.id ?? null,
        })),
      setBotsLoading: (loading) => set({ botsLoading: loading }),
      selectBot: (botId) => set({ selectedBotId: botId }),
      setEnv: (env) => set({ selectedEnv: env }),
    }),
    {
      name: 'ybot-app',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        selectedBotId: state.selectedBotId,
        selectedEnv: state.selectedEnv,
      }),
    }
  )
)
