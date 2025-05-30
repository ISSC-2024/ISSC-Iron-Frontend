<template>
  <div class="graph-header">
    <div class="graph-title">
      <div class="title-icon" v-if="$slots.icon">
        <slot name="icon" />
      </div>
      <span>{{ title }}</span>
    </div>
    <div v-if="$slots.actions" class="graph-actions">
      <slot name="actions" />
    </div>
    <div v-if="$slots.extra" class="graph-extra">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  title: string
}>()
</script>

<style scoped>
.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(
    90deg,
    rgba(12, 24, 48, 0.95) 0%,
    rgba(20, 40, 80, 0.95) 50%,
    rgba(12, 24, 48, 0.95) 100%
  );
  border-bottom: 1px solid rgba(74, 144, 226, 0.2);
  position: relative;
  z-index: 5;
}
.graph-header::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(32, 160, 255, 0), rgba(32, 160, 255, 0.5), rgba(32, 160, 255, 0));
}
.graph-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(220, 230, 240, 0.95);
  font-weight: 600;
  font-size: 16px;
  text-shadow: 0 0 10px rgba(32, 160, 255, 0.3);
  letter-spacing: 0.5px;
}
.title-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #20a0ff;
  filter: drop-shadow(0 0 5px rgba(32, 160, 255, 0.5));
}
.graph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.graph-extra {
  margin-left: 16px;
}

/* 优化导出按钮样式，适配深色背景 */
.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(32, 160, 255, 0.12);
  border: 1px solid rgba(32, 160, 255, 0.35);
  color: rgba(220, 230, 240, 0.95);
  padding: 6px 18px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  box-shadow: 0 1px 4px rgba(32, 160, 255, 0.08);
}
.export-button:hover {
  background: rgba(32, 160, 255, 0.22);
  border-color: rgba(32, 160, 255, 0.6);
  color: #fff;
  box-shadow: 0 2px 8px rgba(32, 160, 255, 0.18);
}
.export-button:active {
  background: rgba(32, 160, 255, 0.32);
  color: #fff;
}
</style>
