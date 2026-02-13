import { defineStore } from 'pinia'
import type { Tracker } from '@/types/tracker'

type TrackPoint = { x: number; y: number; t: number }

function hashStr(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function genTrack(
  baseX: number,
  baseY: number,
  id: string,
  durationMs: number,
  pointsCount: number,
): TrackPoint[] {
  const rnd = mulberry32(hashStr(id))

  const waypointsCount = 18
  const way: Array<{ x: number; y: number }> = []

  let x = baseX
  let y = baseY
  let angle = rnd() * Math.PI * 2

  way.push({ x, y })

  for (let i = 1; i < waypointsCount; i++) {
    angle += (rnd() - 0.5) * 0.55
    const step = 120 + rnd() * 180
    x += Math.cos(angle) * step
    y += Math.sin(angle) * step
    way.push({ x, y })
  }

  const stepT = durationMs / (pointsCount - 1)
  const pts: TrackPoint[] = []

  for (let i = 0; i < pointsCount; i++) {
    const u = (i / (pointsCount - 1)) * (way.length - 1)
    const a = Math.floor(u)
    const b = Math.min(a + 1, way.length - 1)
    const k = u - a

    const px = way[a].x + (way[b].x - way[a].x) * k
    const py = way[a].y + (way[b].y - way[a].y) * k

    pts.push({ x: Math.round(px), y: Math.round(py), t: Math.round(i * stepT) })
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      pts[i] = {
        x: Math.round((p0.x + p1.x + p2.x) / 3),
        y: Math.round((p0.y + p1.y + p2.y) / 3),
        t: p1.t,
      }
    }
  }

  return pts
}

export const usePlaybackStore = defineStore('playback', {
  state: () => ({
    trackerId: null as string | null,
    durationMs: 180000,
    points: [] as TrackPoint[],
    progress: 0,
    speed: 1 as 0.5 | 1 | 2 | 4,
    isPlaying: false,
  }),

  getters: {
    currentTimeMs(state) {
      return Math.round(state.progress * state.durationMs)
    },
  },

  actions: {
    loadFor(tracker: Tracker) {
      this.trackerId = tracker.id
      this.durationMs = 180000
      this.points = genTrack(tracker.x, tracker.y, tracker.id, this.durationMs, 220)
      this.progress = 0
      this.isPlaying = false
    },

    setSpeed(v: 0.5 | 1 | 2 | 4) {
      this.speed = v
    },

    setProgress(p: number) {
      this.progress = Math.max(0, Math.min(1, p))
    },

    play() {
      if (!this.points.length) return
      this.isPlaying = true
    },

    pause() {
      this.isPlaying = false
    },

    toggle() {
      this.isPlaying ? this.pause() : this.play()
    },

    reset() {
      this.progress = 0
      this.isPlaying = false
    },

    stepBy(dtMs: number) {
      if (!this.isPlaying) return
      const nextTime = this.currentTimeMs + dtMs * this.speed
      const p = nextTime / this.durationMs
      if (p >= 1) {
        this.progress = 1
        this.isPlaying = false
      } else {
        this.progress = p
      }
    },
  },
})
