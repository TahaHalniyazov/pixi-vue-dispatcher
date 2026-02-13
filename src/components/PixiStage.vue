<template>
  <div ref="host" class="pixi-host"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Text,
  Sprite,
  Circle,
  type Texture,
  type FederatedPointerEvent,
} from 'pixi.js'
import { useTrackersStore } from '@/stores/trackers'
import { useGeozonesStore } from '@/stores/geozones'
import type { TrackerStatus } from '@/types/tracker'
import type { Geozone, Point } from '@/types/geozone'

const host = ref<HTMLDivElement | null>(null)
const trackers = useTrackersStore()
const geozones = useGeozonesStore()

let app: Application | null = null
let world: Container | null = null
let geozonesLayer: Container | null = null
let trackersLayer: Container | null = null
let uiLayer: Container | null = null

let isDragging = false
let dragStartScreen = { x: 0, y: 0 }
let dragStartWorldPos = { x: 0, y: 0 }

const MIN_ZOOM = 0.3
const MAX_ZOOM = 4

let markerTexture: Texture | null = null
const spritesById = new Map<string, Sprite>()

let tooltipBox: Graphics | null = null
let tooltipText: Text | null = null
let hoveredId: string | null = null

let selectionRing: Graphics | null = null
const zoneGraphicsById = new Map<string, Graphics>()

let cameraTween: null | {
  t0: number
  dur: number
  sx: number
  sy: number
  ex: number
  ey: number
} = null

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function setStageHitArea() {
  if (!app) return
  app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height)
}

function colorByStatus(s: TrackerStatus): number {
  if (s === 'idle') return 0x22c55e
  if (s === 'busy') return 0xf59e0b
  return 0x94a3b8
}

function drawWorldGrid() {
  if (!world) return

  const existing = world.getChildByName('grid')
  if (existing) existing.destroy()

  const grid = new Graphics()
  grid.name = 'grid'

  const step = 100
  const half = 2000
  const min = -half
  const max = half

  for (let x = min; x <= max; x += step) {
    const isAxis = x === 0
    grid.moveTo(x, min).lineTo(x, max)
    grid.stroke({ width: isAxis ? 3 : 1, color: isAxis ? 0x60a5fa : 0x1f2937 })
  }
  for (let y = min; y <= max; y += step) {
    const isAxis = y === 0
    grid.moveTo(min, y).lineTo(max, y)
    grid.stroke({ width: isAxis ? 3 : 1, color: isAxis ? 0x60a5fa : 0x1f2937 })
  }

  const frame = new Graphics()
    .rect(min, min, max - min, max - min)
    .stroke({ width: 2, color: 0x334155 })

  world.addChild(frame)
  world.addChild(grid)
}

function zoomAt(screenX: number, screenY: number, factor: number) {
  if (!world) return
  const oldScale = world.scale.x
  const newScale = clamp(oldScale * factor, MIN_ZOOM, MAX_ZOOM)
  if (newScale === oldScale) return

  const wx = (screenX - world.position.x) / oldScale
  const wy = (screenY - world.position.y) / oldScale

  world.scale.set(newScale)
  world.position.set(screenX - wx * newScale, screenY - wy * newScale)
}

function isTrackerTarget(target: unknown) {
  const name = (target as any)?.name
  return typeof name === 'string' && spritesById.has(name)
}

function onPointerDown(e: FederatedPointerEvent) {
  if (!world) return
  if (isTrackerTarget(e.target)) return
  isDragging = true
  dragStartScreen = { x: e.global.x, y: e.global.y }
  dragStartWorldPos = { x: world.position.x, y: world.position.y }
}

function onPointerMove(e: FederatedPointerEvent) {
  if (!world || !isDragging) return
  const dx = e.global.x - dragStartScreen.x
  const dy = e.global.y - dragStartScreen.y
  world.position.set(dragStartWorldPos.x + dx, dragStartWorldPos.y + dy)
}

function onPointerUp() {
  isDragging = false
}

function attachWheel() {
  if (!app) return
  const canvas = app.canvas

  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault()
    const direction = ev.deltaY > 0 ? -1 : 1
    const factor = direction > 0 ? 1.1 : 0.9
    const rect = canvas.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top
    zoomAt(x, y, factor)
  }

  canvas.addEventListener('wheel', onWheel, { passive: false })
  return () => canvas.removeEventListener('wheel', onWheel)
}

function buildMarkerTexture() {
  if (!app) return null
  const g = new Graphics().circle(0, 0, 8).fill(0xffffff)
  const tex = app.renderer.textureGenerator.generateTexture(g)
  g.destroy()
  return tex
}

function ensureTooltip() {
  if (!uiLayer) return

  tooltipBox = new Graphics()
  tooltipText = new Text({
    text: '',
    style: { fill: 'white', fontSize: 12 },
  })

  tooltipBox.visible = false
  tooltipText.visible = false

  uiLayer.addChild(tooltipBox)
  uiLayer.addChild(tooltipText)
}

function showTooltip(e: FederatedPointerEvent, text: string) {
  if (!tooltipBox || !tooltipText) return
  tooltipText.text = text

  const padX = 10
  const padY = 8
  const w = tooltipText.width + padX * 2
  const h = tooltipText.height + padY * 2

  tooltipBox.clear()
  tooltipBox.roundRect(0, 0, w, h, 10).fill(0x111827)
  tooltipBox.stroke({ width: 1, color: 0x334155 })

  const x = e.global.x + 12
  const y = e.global.y + 12

  tooltipBox.position.set(x, y)
  tooltipText.position.set(x + padX, y + padY)

  tooltipBox.visible = true
  tooltipText.visible = true
}

function moveTooltip(e: FederatedPointerEvent) {
  if (!tooltipBox || !tooltipText || !tooltipBox.visible) return
  const x = e.global.x + 12
  const y = e.global.y + 12
  tooltipBox.position.set(x, y)
  tooltipText.position.set(x + 10, y + 8)
}

function hideTooltip() {
  hoveredId = null
  if (!tooltipBox || !tooltipText) return
  tooltipBox.visible = false
  tooltipText.visible = false
}

function ensureSelectionRing() {
  if (!trackersLayer) return
  selectionRing = new Graphics().circle(0, 0, 14).stroke({ width: 3, color: 0xf59e0b })
  selectionRing.visible = false
  trackersLayer.addChild(selectionRing)
}

function syncSelection() {
  if (!selectionRing) return

  const id = trackers.selectedId
  if (!id) {
    selectionRing.visible = false
    return
  }

  const sprite = spritesById.get(id)
  if (!sprite) {
    selectionRing.visible = false
    return
  }

  selectionRing.visible = true
  selectionRing.position.set(sprite.x, sprite.y)

  spritesById.forEach((s, sid) => {
    s.scale.set(sid === id ? 1.2 : 1)
  })
}

function pointInCircle(px: number, py: number, cx: number, cy: number, r: number) {
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

function pointInPolygon(px: number, py: number, pts: Point[]) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function trackerInZone(tX: number, tY: number, z: Geozone) {
  if (z.type === 'circle') return pointInCircle(tX, tY, z.x, z.y, z.r)
  return pointInPolygon(tX, tY, z.points)
}

function drawGeozones() {
  if (!geozonesLayer) return

  const keep = new Set(geozones.zones.map((z) => z.id))
  for (const [id, g] of zoneGraphicsById) {
    if (!keep.has(id)) {
      g.destroy()
      zoneGraphicsById.delete(id)
    }
  }

  for (const z of geozones.zones) {
    let g = zoneGraphicsById.get(z.id)
    if (!g) {
      g = new Graphics()
      zoneGraphicsById.set(z.id, g)
      geozonesLayer.addChild(g)
    }
    g.clear()

    const isSelected = geozones.filterId !== 'all' && geozones.filterId === z.id
    const color = isSelected ? 0x60a5fa : 0x334155
    const fill = isSelected ? 0x0b1020 : 0x0b1020

    if (z.type === 'circle') {
      g.circle(z.x, z.y, z.r).fill({ color: fill, alpha: 0.06 })
      g.circle(z.x, z.y, z.r).stroke({ width: isSelected ? 3 : 2, color, alpha: 0.9 })
    } else {
      g.poly(z.points.map((p) => [p.x, p.y]).flat()).fill({ color: fill, alpha: 0.06 })
      g.poly(z.points.map((p) => [p.x, p.y]).flat()).stroke({
        width: isSelected ? 3 : 2,
        color,
        alpha: 0.9,
      })
    }
  }
}

function applyVisibility() {
  const q = trackers.query.trim().toLowerCase()
  const st = trackers.status
  const zonesEnabled = geozones.enabled
  const zoneSelected = geozones.filterId !== 'all' ? geozones.selected : null

  for (const t of trackers.items) {
    const sprite = spritesById.get(t.id)
    if (!sprite) continue

    let ok = true
    if (st !== 'all' && t.status !== st) ok = false
    if (ok && q) ok = t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)

    if (ok && zonesEnabled && zoneSelected) {
      ok = trackerInZone(t.x, t.y, zoneSelected)
    }

    sprite.visible = ok
    sprite.alpha = ok ? 1 : 1
  }

  syncSelection()
}

function upsertTrackers() {
  if (!trackersLayer || !markerTexture) return

  const next = new Set(trackers.items.map((t) => t.id))

  for (const [id, s] of spritesById) {
    if (!next.has(id)) {
      s.destroy()
      spritesById.delete(id)
    }
  }

  for (const t of trackers.items) {
    let s = spritesById.get(t.id)
    if (!s) {
      s = new Sprite(markerTexture)
      s.name = t.id
      s.anchor.set(0.5)
      s.hitArea = new Circle(0, 0, 10)
      s.eventMode = 'static'
      s.cursor = 'pointer'

      s.on('pointerover', (e) => {
        hoveredId = t.id
        showTooltip(e, `${t.name}\n${t.id}\n${t.status} • ${t.battery}% • ${t.speed} km/h`)
      })
      s.on('pointermove', (e) => {
        if (hoveredId === t.id) moveTooltip(e)
      })
      s.on('pointerout', () => {
        if (hoveredId === t.id) hideTooltip()
      })
      s.on('pointertap', () => {
        trackers.select(t.id)
      })

      trackersLayer.addChild(s)
      spritesById.set(t.id, s)
    }

    s.position.set(t.x, t.y)
    s.tint = colorByStatus(t.status)
  }

  applyVisibility()
  syncSelection()
}

function cameraToWorldPoint(wx: number, wy: number, duration = 280) {
  if (!app || !world) return
  const scale = world.scale.x
  const cx = app.screen.width / 2
  const cy = app.screen.height / 2
  const tx = cx - wx * scale
  const ty = cy - wy * scale
  cameraTween = {
    t0: performance.now(),
    dur: duration,
    sx: world.position.x,
    sy: world.position.y,
    ex: tx,
    ey: ty,
  }
}

function tick(dt: number) {
  if (!cameraTween || !world) return
  const now = performance.now()
  const p = clamp((now - cameraTween.t0) / cameraTween.dur, 0, 1)
  const t = 1 - Math.pow(1 - p, 3)
  world.position.set(
    cameraTween.sx + (cameraTween.ex - cameraTween.sx) * t,
    cameraTween.sy + (cameraTween.ey - cameraTween.sy) * t,
  )
  if (p >= 1) cameraTween = null
}

onMounted(async () => {
  if (!host.value) return

  app = new Application()
  await app.init({
    resizeTo: host.value,
    backgroundColor: 0x0b1020,
    antialias: true,
  })

  host.value.appendChild(app.canvas)

  world = new Container()
  geozonesLayer = new Container()
  trackersLayer = new Container()
  uiLayer = new Container()

  app.stage.addChild(world)
  world.addChild(geozonesLayer)
  world.addChild(trackersLayer)
  app.stage.addChild(uiLayer)

  world.position.set(app.screen.width / 2, app.screen.height / 2)
  world.scale.set(1)

  markerTexture = buildMarkerTexture()
  drawWorldGrid()
  ensureSelectionRing()
  ensureTooltip()

  const hud = new Text({
    text: 'Pan: drag | Zoom: wheel | Select: click tracker | Focus: button',
    style: { fill: 'white', fontSize: 14 },
  })
  hud.position.set(12, 12)
  uiLayer.addChild(hud)

  app.stage.eventMode = 'static'
  setStageHitArea()

  app.stage.on('pointerdown', onPointerDown)
  app.stage.on('pointermove', onPointerMove)
  app.stage.on('pointerup', onPointerUp)
  app.stage.on('pointerupoutside', onPointerUp)

  const detachWheel = attachWheel()

  const onResize = () => setStageHitArea()
  window.addEventListener('resize', onResize)

  app.ticker.add(tick)

  drawGeozones()
  upsertTrackers()

  const stopItems = watch(
    () => trackers.items,
    () => upsertTrackers(),
    { deep: false },
  )

  const stopFilters = watch(
    () => [trackers.query, trackers.status, geozones.enabled, geozones.filterId],
    () => applyVisibility(),
  )

  const stopSelected = watch(
    () => trackers.selectedId,
    () => syncSelection(),
  )

  const stopZones = watch(
    () => [geozones.zones, geozones.filterId],
    () => {
      drawGeozones()
      applyVisibility()
    },
    { deep: true },
  )

  const stopFocus = watch(
    () => trackers.focusRequest,
    () => {
      const id = trackers.focusId
      if (!id) return
      const t = trackers.items.find((x) => x.id === id)
      if (!t) return
      cameraToWorldPoint(t.x, t.y, 300)
    },
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    detachWheel?.()
    app?.ticker.remove(tick)
    stopItems()
    stopFilters()
    stopSelected()
    stopZones()
    stopFocus()
  })
})

onBeforeUnmount(() => {
  if (app) {
    app.destroy(true)
    app = null
  }
})
</script>

<style scoped>
.pixi-host {
  width: 100%;
  height: 100%;
  min-height: 520px;
  border-radius: 16px;
  overflow: hidden;
}
</style>
