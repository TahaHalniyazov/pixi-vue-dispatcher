import { defineStore } from 'pinia'
import type { Geozone } from '@/types/geozone'

export const useGeozonesStore = defineStore('geozones', {
  state: () => ({
    enabled: true,
    filterId: 'all' as 'all' | string,
    zones: [] as Geozone[],
  }),

  getters: {
    selected(state): Geozone | null {
      if (state.filterId === 'all') return null
      return state.zones.find((z) => z.id === state.filterId) ?? null
    },
  },

  actions: {
    seed() {
      this.zones = [
        { id: 'Z-001', name: 'Zone A (circle)', type: 'circle', x: -400, y: -250, r: 380 },
        {
          id: 'Z-002',
          name: 'Zone B (polygon)',
          type: 'polygon',
          points: [
            { x: 300, y: -500 },
            { x: 900, y: -420 },
            { x: 980, y: 80 },
            { x: 520, y: 380 },
            { x: 260, y: 40 },
          ],
        },
      ]
    },

    setEnabled(v: boolean) {
      this.enabled = v
    },

    setFilterId(v: 'all' | string) {
      this.filterId = v
    },
  },
})
