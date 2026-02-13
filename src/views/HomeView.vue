<template>
  <div class="page">
    <aside class="side">
      <div class="head">
        <div class="title">Pixi Vue Dispatcher</div>
        <div class="sub">
          Objects: <b>{{ trackers.items.length }}</b>
          <span class="dot">•</span>
          Visible: <b>{{ trackers.filtered.length }}</b>
        </div>
      </div>

      <div class="controls">
        <input
          class="input"
          type="text"
          :value="trackers.query"
          placeholder="Search by name / id"
          @input="trackers.setQuery(($event.target as HTMLInputElement).value)"
        />

        <select
          class="select"
          :value="trackers.status"
          @change="trackers.setStatus(($event.target as HTMLSelectElement).value as any)"
        >
          <option value="all">All</option>
          <option value="idle">Idle</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>

        <div class="zone">
          <label class="check">
            <input
              type="checkbox"
              :checked="geozones.enabled"
              @change="geozones.setEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span>Geozones</span>
          </label>

          <select
            class="select"
            :value="geozones.filterId"
            @change="geozones.setFilterId(($event.target as HTMLSelectElement).value)"
          >
            <option value="all">All zones</option>
            <option v-for="z in geozones.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
          </select>
        </div>

        <div class="btns">
          <button class="btn" @click="trackers.generate(500)">Generate 500</button>
          <button class="btn" @click="trackers.generate(2000)">Generate 2000</button>
        </div>
      </div>

      <div class="selected" v-if="trackers.selected">
        <div class="row">
          <div class="k">Selected</div>
          <div class="v">{{ trackers.selected.name }} ({{ trackers.selected.id }})</div>
        </div>
        <div class="row">
          <div class="k">Status</div>
          <div class="v">{{ trackers.selected.status }}</div>
        </div>
        <div class="row">
          <div class="k">Battery</div>
          <div class="v">{{ trackers.selected.battery }}%</div>
        </div>
        <div class="row">
          <div class="k">Speed</div>
          <div class="v">{{ trackers.selected.speed }} km/h</div>
        </div>
        <div class="row">
          <div class="k">Position</div>
          <div class="v">{{ trackers.selected.x }}, {{ trackers.selected.y }}</div>
        </div>

        <button class="btn focus" @click="trackers.requestFocus()">Focus on selected</button>
      </div>

      <div class="list">
        <div
          v-for="t in trackers.list"
          :key="t.id"
          class="item"
          :class="{ active: t.id === trackers.selectedId }"
          @click="trackers.select(t.id)"
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
import { useGeozonesStore } from '@/stores/geozones'

const trackers = useTrackersStore()
const geozones = useGeozonesStore()

onMounted(() => {
  if (!trackers.items.length) trackers.generate(800)
  if (!geozones.zones.length) geozones.seed()
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

.zone {
  display: grid;
  gap: 10px;
}

.check {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
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

.focus {
  width: 100%;
  margin-top: 10px;
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
