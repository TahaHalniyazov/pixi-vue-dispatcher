import { defineStore } from 'pinia'
import type { Tracker, TrackerStatus } from '@/types/tracker'

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickStatus(r: number): TrackerStatus {
  if (r < 0.1) return 'offline'
  if (r < 0.45) return 'busy'
  return 'idle'
}

export const useTrackersStore = defineStore('trackers', {
  state: () => ({
    items: [] as Tracker[],
    selectedId: null as string | null,
    query: '',
    status: 'all' as 'all' | TrackerStatus,
    limitInList: 60,
    focusRequest: 0,
    focusId: null as string | null,
  }),

  getters: {
    filtered(state): Tracker[] {
      const q = state.query.trim().toLowerCase()
      return state.items.filter((t) => {
        if (state.status !== 'all' && t.status !== state.status) return false
        if (!q) return true
        return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
      })
    },

    selected(state): Tracker | null {
      if (!state.selectedId) return null
      return state.items.find((t) => t.id === state.selectedId) ?? null
    },

    list(state): Tracker[] {
      const q = state.query.trim().toLowerCase()
      const filtered = state.items.filter((t) => {
        if (state.status !== 'all' && t.status !== state.status) return false
        if (!q) return true
        return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
      })
      return filtered.slice(0, state.limitInList)
    },
  },

  actions: {
    generate(count = 800) {
      const rnd = mulberry32(1337)
      const now = Date.now()
      const out: Tracker[] = []

      for (let i = 0; i < count; i++) {
        const id = `T-${String(i + 1).padStart(4, '0')}`
        const x = Math.round((rnd() * 2 - 1) * 1800)
        const y = Math.round((rnd() * 2 - 1) * 1800)
        const status = pickStatus(rnd())
        const battery = Math.round(10 + rnd() * 90)
        const speed = status === 'offline' ? 0 : Math.round(rnd() * 60)
        out.push({
          id,
          name: `Worker ${i + 1}`,
          x,
          y,
          status,
          battery,
          speed,
          updatedAt: now - Math.round(rnd() * 120000),
        })
      }

      this.items = out
      if (this.items.length && !this.selectedId) this.selectedId = this.items[0].id
    },

    select(id: string) {
      this.selectedId = id
    },

    setQuery(v: string) {
      this.query = v
    },

    setStatus(v: 'all' | TrackerStatus) {
      this.status = v
    },
    requestFocus() {
      if (!this.selectedId) return
      this.focusId = this.selectedId
      this.focusRequest++
    },
  },
})
