// src/store/index.ts
import { create } from 'zustand'
import { BroadEvent, InterestFilter, UserProfile } from '@/types'

export const DEFAULT_FILTER: InterestFilter = {
  regions: ['domestic'],
  orgs: ['Broadcasting'],
  orgCustom: '',
  eventTypes: ['Seminar'],
  eventTypeCustom: '',
  period: '3m',
  keyword: '',
}

interface AppState {
  user: UserProfile | null
  authReady: boolean          // true once onAuthStateChanged fires for the first time
  events: BroadEvent[]
  filter: InterestFilter
  isSearching: boolean
  isSaving: boolean
  // Actions
  setUser: (u: UserProfile | null) => void
  setAuthReady: () => void
  setEvents: (e: BroadEvent[]) => void
  addEvent: (e: BroadEvent) => void
  updateEvent: (id: string, patch: Partial<BroadEvent>) => void
  removeEvent: (id: string) => void
  setFilter: (f: Partial<InterestFilter>) => void
  setSearching: (v: boolean) => void
  setSaving: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authReady: false,
  events: [],
  filter: DEFAULT_FILTER,
  isSearching: false,
  isSaving: false,

  setUser:      (user)    => set({ user }),
  setAuthReady: ()        => set({ authReady: true }),
  setEvents:    (events)  => set({ events }),
  addEvent:     (e)       => set((s) => ({ events: [...s.events, e] })),
  updateEvent:  (id, patch) =>
    set((s) => ({ events: s.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)) })),
  removeEvent:  (id)      => set((s) => ({ events: s.events.filter((ev) => ev.id !== id) })),
  setFilter:    (f)       => set((s) => ({ filter: { ...s.filter, ...f } })),
  setSearching: (v)       => set({ isSearching: v }),
  setSaving:    (v)       => set({ isSaving: v }),
}))
