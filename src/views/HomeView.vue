<template>
  <div class="page">
    <aside class="side">
      <div class="head">
        <div class="brand">
          <div class="logo">PX</div>
          <div class="brand-text">
            <div class="title">Pixi Vue Dispatcher</div>
            <div class="sub">Canvas scene + filters + geozones + focus</div>
          </div>
        </div>

        <div class="stats">
          <div class="chip">
            <span class="chip-k">Objects</span>
            <span class="chip-v">{{ trackers.items.length }}</span>
          </div>
          <div class="chip">
            <span class="chip-k">Visible</span>
            <span class="chip-v">{{ trackers.filtered.length }}</span>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="section">
          <div class="section-title">Filters</div>

          <input
            class="input"
            type="text"
            :value="trackers.query"
            placeholder="Search by name / id"
            @input="trackers.setQuery(($event.target as HTMLInputElement).value)"
          />

          <div class="row2">
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

            <select
              class="select"
              :value="geozones.filterId"
              @change="geozones.setFilterId(($event.target as HTMLSelectElement).value)"
            >
              <option value="all">All zones</option>
              <option v-for="z in geozones.zones" :key="z.id" :value="z.id">{{ z.name }}</option>
            </select>
          </div>

          <label class="toggle">
            <input
              type="checkbox"
              :checked="geozones.enabled"
              @change="geozones.setEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span class="toggle-ui"></span>
            <span class="toggle-text">Apply zone filter</span>
          </label>
        </div>

        <div class="section">
          <div class="section-title">Dataset</div>

          <div class="btns">
            <button class="btn" @click="trackers.generate(500)">Generate 500</button>
            <button class="btn" @click="trackers.generate(2000)">Generate 2000</button>
          </div>
        </div>
        <div class="section">
          <div class="section-title">Playback</div>

          <div class="btns">
            <button
              class="btn primary"
              @click="playback.toggle()"
              :disabled="!playback.points.length"
            >
              {{ playback.isPlaying ? 'Pause' : 'Play' }}
            </button>
            <button class="btn" @click="playback.reset()" :disabled="!playback.points.length">
              Reset
            </button>
          </div>

          <div class="row2">
            <select
              class="select"
              :value="String(playback.speed)"
              @change="playback.setSpeed(Number(($event.target as HTMLSelectElement).value) as any)"
            >
              <option value="0.5">0.5x</option>
              <option value="1">1x</option>
              <option value="2">2x</option>
              <option value="4">4x</option>
            </select>

            <div class="chip" style="justify-content: space-between; width: 100%">
              <span class="chip-k">Time</span>
              <span class="chip-v">{{ Math.round(playback.currentTimeMs / 1000) }}s</span>
            </div>
          </div>

          <input
            class="range"
            type="range"
            min="0"
            max="1000"
            :value="Math.round(playback.progress * 1000)"
            @input="playback.setProgress(Number(($event.target as HTMLInputElement).value) / 1000)"
          />
        </div>

        <div class="selected" v-if="trackers.selected">
          <div class="selected-top">
            <div class="selected-title">Selected</div>
            <span class="badge" :data-s="trackers.selected.status">{{
              trackers.selected.status
            }}</span>
          </div>

          <div class="selected-name">
            {{ trackers.selected.name }}
            <span class="muted">({{ trackers.selected.id }})</span>
          </div>

          <div class="kv">
            <div class="k">Battery</div>
            <div class="v">{{ trackers.selected.battery }}%</div>
            <div class="k">Speed</div>
            <div class="v">{{ trackers.selected.speed }} km/h</div>
            <div class="k">Position</div>
            <div class="v">{{ trackers.selected.x }}, {{ trackers.selected.y }}</div>
          </div>

          <button class="btn primary" @click="trackers.requestFocus()">Focus on selected</button>
        </div>
      </div>

      <div class="list">
        <div class="list-head">
          <div class="section-title">Trackers</div>
          <div class="muted">{{ trackers.list.length }} shown</div>
        </div>

        <div
          v-for="t in trackers.list"
          :key="t.id"
          class="item"
          :class="{ active: t.id === trackers.selectedId }"
          @click="trackers.select(t.id)"
        >
          <div class="item-top">
            <div class="name">{{ t.name }}</div>
            <span class="badge" :data-s="t.status">{{ t.status }}</span>
          </div>

          <div class="item-sub">
            <span class="mono">{{ t.id }}</span>
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
import { watch, onMounted } from 'vue'
import PixiStage from '@/components/PixiStage.vue'
import { useTrackersStore } from '@/stores/trackers'
import { useGeozonesStore } from '@/stores/geozones'
import { usePlaybackStore } from '@/stores/playback'
const trackers = useTrackersStore()
const geozones = useGeozonesStore()
const playback = usePlaybackStore()

onMounted(() => {
  if (!trackers.items.length) trackers.generate(800)
  if (!geozones.zones.length) geozones.seed()
  if (trackers.selected) playback.loadFor(trackers.selected)
})

watch(
  () => trackers.selectedId,
  () => {
    if (trackers.selected) playback.loadFor(trackers.selected)
  },
  { immediate: true },
)
</script>

<style scoped>
.page {
  height: 100vh;
  padding: 16px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
  background:
    radial-gradient(1200px 800px at 20% 10%, rgba(96, 165, 250, 0.18), transparent 50%),
    radial-gradient(1000px 700px at 80% 70%, rgba(34, 197, 94, 0.14), transparent 55%), #0b1020;
}

.side {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  display: grid;
  grid-template-rows: auto auto 1fr;
  min-width: 0;
}

.head {
  padding: 14px 14px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}

.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 900;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.95);
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.35), rgba(34, 197, 94, 0.25));
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.brand-text {
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.95);
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
}

.stats {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.chip {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
}

.chip-k {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
}

.chip-v {
  font-size: 13px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.panel {
  padding: 12px 14px 10px;
  display: grid;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.section {
  display: grid;
  gap: 10px;
}

.section-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.input,
.select {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.28);
  color: rgba(255, 255, 255, 0.92);
  padding: 10px 12px;
  outline: none;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.input:focus,
.select:focus {
  border-color: rgba(96, 165, 250, 0.55);
  background: rgba(0, 0, 0, 0.35);
}

.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  user-select: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.toggle input {
  display: none;
}

.toggle-ui {
  width: 42px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.3);
  position: relative;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.toggle-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.85);
  transition: transform 0.2s ease;
}

.toggle input:checked + .toggle-ui {
  background: rgba(34, 197, 94, 0.25);
  border-color: rgba(34, 197, 94, 0.35);
}

.toggle input:checked + .toggle-ui::after {
  transform: translateX(18px);
}

.toggle-text {
  margin-top: 1px;
}

.btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.btn {
  border-radius: 14px;
  padding: 10px 12px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  transition:
    transform 0.06s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn:active {
  transform: translateY(1px);
}

.btn.primary {
  background: rgba(96, 165, 250, 0.18);
  border-color: rgba(96, 165, 250, 0.35);
}

.btn.primary:hover {
  background: rgba(96, 165, 250, 0.24);
}

.selected {
  border-radius: 16px;
  padding: 12px 12px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.18));
}

.selected-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.selected-title {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.6);
}

.selected-name {
  margin-top: 8px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.kv {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 6px 10px;
  font-size: 13px;
}

.k {
  color: rgba(255, 255, 255, 0.62);
}

.v {
  color: rgba(255, 255, 255, 0.92);
}

.list {
  padding: 12px 14px 14px;
  overflow: auto;
  min-height: 0;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}

.item {
  border-radius: 14px;
  padding: 10px 10px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.06s ease;
  margin-bottom: 10px;
}

.item:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
}

.item:active {
  transform: translateY(1px);
}

.item.active {
  background: rgba(96, 165, 250, 0.14);
  border-color: rgba(96, 165, 250, 0.28);
}

.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.name {
  font-weight: 800;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.92);
}

.item-sub {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.68);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.dot {
  opacity: 0.6;
}

.mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
    monospace;
}

.muted {
  color: rgba(255, 255, 255, 0.62);
}

.badge {
  font-size: 11px;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(255, 255, 255, 0.06);
}

.badge[data-s='idle'] {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.26);
}

.badge[data-s='busy'] {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(245, 158, 11, 0.26);
}

.badge[data-s='offline'] {
  background: rgba(148, 163, 184, 0.16);
  border-color: rgba(148, 163, 184, 0.26);
}

.main {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

@media (max-width: 980px) {
  .page {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 100vh;
  }

  .main {
    min-height: 520px;
  }
}

.range {
  width: 100%;
  height: 36px;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.range::-webkit-slider-runnable-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.range::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  margin-top: -6px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.22);
}
</style>
