export type GeozoneType = 'circle' | 'polygon'

export type Point = { x: number; y: number }

export type Geozone =
  | {
      id: string
      name: string
      type: 'circle'
      x: number
      y: number
      r: number
    }
  | {
      id: string
      name: string
      type: 'polygon'
      points: Point[]
    }
