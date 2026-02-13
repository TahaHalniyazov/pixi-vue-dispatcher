<template>
  <div class="page">
    <aside class="side">
      <h1 class="title">Pixi Vue Dispatcher</h1>
      <p class="muted">MVP: canvas живой → дальше pan/zoom → трекеры → геозоны → playback</p>
    </aside>

    <main class="main">
      <PixiStage />
    </main>
  </div>
</template>

<script setup lang="ts">
import PixiStage from '@/components/PixiStage.vue'
</script>

<style scoped>
.page {
  height: calc(100vh - 32px);
  padding: 16px;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  background: #0b1020;
  box-sizing: border-box;
}

.side {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  color: #fff;
}

.title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 800;
}

.muted {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.4;
}

.main {
  border-radius: 16px;
}
</style>
