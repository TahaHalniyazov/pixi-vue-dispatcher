<template>
  <div ref="host" class="pixi-host"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  Application,
  Container,
  Graphics,
  Rectangle,
  Text,
  type FederatedPointerEvent,
} from 'pixi.js'

const host = ref<HTMLDivElement | null>(null)

let app: Application | null = null

// Слои
let world: Container | null = null
let geozonesLayer: Container | null = null
let trackersLayer: Container | null = null
let uiLayer: Container | null = null

// Drag state
let isDragging = false
let dragStartScreen = { x: 0, y: 0 }
let dragStartWorldPos = { x: 0, y: 0 }

// Zoom limits
const MIN_ZOOM = 0.3
const MAX_ZOOM = 4

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function setStageHitArea() {
  if (!app) return
  // чтобы stage ловил pointer события по всему экрану
  app.stage.hitArea = new Rectangle(0, 0, app.screen.width, app.screen.height)
}

function drawWorldGrid() {
  if (!world || !app) return

  // Удаляем старую сетку, если уже рисовали
  const existing = world.getChildByName('grid')
  if (existing) existing.destroy()

  const g = new Graphics()
  g.name = 'grid'

  const step = 100
  const half = 2000 // рисуем квадрат "мира" примерно 4000x4000
  const min = -half
  const max = half

  // линии
  for (let x = min; x <= max; x += step) {
    const isAxis = x === 0
    g.moveTo(x, min).lineTo(x, max)
    g.stroke({ width: isAxis ? 3 : 1, color: isAxis ? 0x60a5fa : 0x1f2937 })
  }
  for (let y = min; y <= max; y += step) {
    const isAxis = y === 0
    g.moveTo(min, y).lineTo(max, y)
    g.stroke({ width: isAxis ? 3 : 1, color: isAxis ? 0x60a5fa : 0x1f2937 })
  }

  // фон-подложка (чтобы был ориентир)
  const bg = new Graphics()
    .rect(min, min, max - min, max - min)
    .stroke({ width: 2, color: 0x334155 })

  world.addChild(bg)
  world.addChild(g)
}

// Zoom к курсору: точка под мышью остаётся на месте
function zoomAt(screenX: number, screenY: number, factor: number) {
  if (!world) return

  const oldScale = world.scale.x
  const newScale = clamp(oldScale * factor, MIN_ZOOM, MAX_ZOOM)
  if (newScale === oldScale) return

  // world point под курсором ДО зума
  const wx = (screenX - world.position.x) / oldScale
  const wy = (screenY - world.position.y) / oldScale

  world.scale.set(newScale)

  // смещаем world так, чтобы эта world-точка осталась под курсором
  world.position.set(screenX - wx * newScale, screenY - wy * newScale)
}

function onPointerDown(e: FederatedPointerEvent) {
  if (!world) return
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

    // “мягкий” зум
    const direction = ev.deltaY > 0 ? -1 : 1
    const factor = direction > 0 ? 1.1 : 0.9

    // координаты мыши относительно canvas
    const rect = canvas.getBoundingClientRect()
    const x = ev.clientX - rect.left
    const y = ev.clientY - rect.top

    zoomAt(x, y, factor)
  }

  canvas.addEventListener('wheel', onWheel, { passive: false })

  // вернём функцию отписки
  return () => canvas.removeEventListener('wheel', onWheel)
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

  // слои: UI отдельно, world отдельно
  world = new Container()
  geozonesLayer = new Container()
  trackersLayer = new Container()
  uiLayer = new Container()

  app.stage.addChild(world)
  world.addChild(geozonesLayer)
  world.addChild(trackersLayer)
  app.stage.addChild(uiLayer)

  // world стартуем по центру экрана
  world.position.set(app.screen.width / 2, app.screen.height / 2)
  world.scale.set(1)

  // сетка
  drawWorldGrid()

  // UI (не масштабируется)
  const hud = new Text({
    text: 'Pan: drag | Zoom: wheel (to cursor)',
    style: { fill: 'white', fontSize: 14 },
  })
  hud.position.set(12, 12)
  uiLayer.addChild(hud)

  // Чтобы stage ловил события по всему экрану
  app.stage.eventMode = 'static'
  setStageHitArea()

  app.stage.on('pointerdown', onPointerDown)
  app.stage.on('pointermove', onPointerMove)
  app.stage.on('pointerup', onPointerUp)
  app.stage.on('pointerupoutside', onPointerUp)

  const detachWheel = attachWheel()

  // resize: обновим hitArea и “центр” (по желанию)
  const onResize = () => setStageHitArea()
  window.addEventListener('resize', onResize)

  // cleanup
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
    detachWheel?.()
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
