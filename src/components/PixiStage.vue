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
import type { TrackerStatus } from '@/types/tracker'

const host = ref<HTMLDivElement | null>(null)
const store = useTrackersStore()

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

  const id = store.selectedId
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

function applyVisibility() {
  const q = store.query.trim().toLowerCase()
  const st = store.status
  for (const t of store.items) {
    const sprite = spritesById.get(t.id)
    if (!sprite) continue
    let ok = true
    if (st !== 'all' && t.status !== st) ok = false
    if (ok && q) ok = t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    sprite.visible = ok
  }
  if (selectionRing?.visible) syncSelection()
}

function upsertTrackers() {
  if (!trackersLayer || !markerTexture) return

  const next = new Set(store.items.map((t) => t.id))

  for (const [id, s] of spritesById) {
    if (!next.has(id)) {
      s.destroy()
      spritesById.delete(id)
    }
  }

  for (const t of store.items) {
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
        store.select(t.id)
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
    text: 'Pan: drag | Zoom: wheel | Select: click tracker',
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

  upsertTrackers()

  const stopItems = watch(
    () => store.items,
    () => upsertTrackers(),
    { deep: false },
  )

  const stopFilters = watch(
    () => [store.query, store.status],
    () => applyVisibility(),
  )

  const stopSelected = watch(
    () => store.selectedId,
    () => syncSelection(),
  )

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    detachWheel?.()
    stopItems()
    stopFilters()
    stopSelected()
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
