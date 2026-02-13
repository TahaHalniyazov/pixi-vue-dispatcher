<template>
  <div class="page">
    <aside class="side">
      <div class="head">
        <div class="title">Pixi Vue Dispatcher</div>
        <div class="sub">
          Objects: <b>{{ store.items.length }}</b>
          <span class="dot">•</span>
          Visible: <b>{{ store.filtered.length }}</b>
        </div>
      </div>

      <div class="controls">
        <input
          class="input"
          type="text"
          :value="store.query"
          placeholder="Search by name / id"
          @input="store.setQuery(($event.target as HTMLInputElement).value)"
        />

        <select
          class="select"
          :value="store.status"
          @change="store.setStatus(($event.target as HTMLSelectElement).value as any)"
        >
          <option value="all">All</option>
          <option value="idle">Idle</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>

        <div class="btns">
          <button class="btn" @click="store.generate(500)">Generate 500</button>
          <button class="btn" @click="store.generate(2000)">Generate 2000</button>
        </div>
      </div>

      <div class="selected" v-if="store.selected">
        <div class="row">
          <div class="k">Selected</div>
          <div class="v">{{ store.selected.name }} ({{ store.selected.id }})</div>
        </div>
        <div class="row">
          <div class="k">Status</div>
          <div class="v">{{ store.selected.status }}</div>
        </div>
        <div class="row">
          <div class="k">Battery</div>
          <div class="v">{{ store.selected.battery }}%</div>
        </div>
        <div class="row">
          <div class="k">Speed</div>
          <div class="v">{{ store.selected.speed }} km/h</div>
        </div>
        <div class="row">
          <div class="k">Position</div>
          <div class="v">{{ store.selected.x }}, {{ store.selected.y }}</div>
        </div>
      </div>

      <div class="list">
        <div
          v-for="t in store.list"
          :key="t.id"
          class="item"
          :class="{ active: t.id === store.selectedId }"
          @click="store.select(t.id)"
        >
          <div class="item-top">
            <span class="name">{{ t.name }}</span>
            <span class="badge" :data-s="t.status">{{ t.status }}</span>
          </div>
          <div class="item-sub">
            <span>{{ t.id }}</span>
            <span class="dot">•</span>
            <span>{{ t.battery }}%</span>
            <span class="dot">•</span>
            <span>{{ t.speed }} km/h</span>
          </div>
        </div>
      </div>
    </aside>

    <main class="main">
      <PixiStage />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import PixiStage from '@/components/PixiStage.vue'
import { useTrackersStore } from '@/stores/trackers'

const store = useTrackersStore()

onMounted(() => {
  if (!store.items.length) store.generate(800)
})
</script>

<style scoped>
.page {
  height: calc(100vh - 32px);
  padding: 16px;
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  background: #0b1020;
  box-sizing: border-box;
}

.side {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 14px;
  color: #fff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.title {
  font-size: 16px;
  font-weight: 800;
}

.sub {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.controls {
  margin-top: 12px;
  display: grid;
  gap: 10px;
}

.input,
.select {
  width: 100%;
  box-sizing: border-box;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  padding: 10px 12px;
  outline: none;
}

.btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn {
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.selected {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  padding: 10px 12px;
  display: grid;
  gap: 6px;
}

.row {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 10px;
  font-size: 13px;
}

.k {
  color: rgba(255, 255, 255, 0.65);
}

.v {
  color: rgba(255, 255, 255, 0.95);
}

.list {
  margin-top: 12px;
  overflow: auto;
  padding-right: 6px;
}

.item {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 10px 10px;
  cursor: pointer;
  margin-bottom: 8px;
}

.item.active {
  border-color: rgba(255, 255, 255, 0.22);
  background: rgba(96, 165, 250, 0.12);
}

.item-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.name {
  font-weight: 700;
  font-size: 13px;
}

.badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.badge[data-s='idle'] {
  background: rgba(34, 197, 94, 0.16);
}

.badge[data-s='busy'] {
  background: rgba(245, 158, 11, 0.16);
}

.badge[data-s='offline'] {
  background: rgba(148, 163, 184, 0.16);
}

.item-sub {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.dot {
  opacity: 0.6;
}

.main {
  border-radius: 16px;
}
</style>
