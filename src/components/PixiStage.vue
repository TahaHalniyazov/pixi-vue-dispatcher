<template>
  <div ref="host" class="pixi-host"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Application, Graphics, Text } from 'pixi.js'

const host = ref<HTMLDivElement | null>(null)

let app: Application | null = null

onMounted(async () => {
  if (!host.value) return

  app = new Application()

  // Pixi v8: init() обязателен
  await app.init({
    resizeTo: host.value, // размер под контейнер
    backgroundColor: 0x0b1020,
    antialias: true,
  })

  host.value.appendChild(app.canvas)

  const title = new Text({
    text: 'Pixi + Vue + TS ✅',
    style: { fill: 'white', fontSize: 16 },
  })
  title.position.set(12, 12)
  app.stage.addChild(title)

  const card = new Graphics().roundRect(0, 0, 260, 110, 16).fill(0x1f2937)
  card.position.set(12, 44)
  app.stage.addChild(card)
})

onBeforeUnmount(() => {
  app?.destroy(true)
  app = null
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
