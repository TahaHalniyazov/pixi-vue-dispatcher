export type TrackerStatus = 'idle' | 'busy' | 'offline'

export interface Tracker {
  id: string
  name: string
  x: number
  y: number
  status: TrackerStatus
  battery: number
  speed: number
  updatedAt: number
}
