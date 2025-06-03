<template>
  <div class="graph-header">
    <div class="graph-header-decoration">
      <div class="header-corner top-left"></div>
      <div class="header-corner top-right"></div>
    </div>

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

    <div class="graph-header-glow"></div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{
  title: string
}>()
</script>

<style lang="scss" scoped>
@use '@/assets/styles/_variables' as *;
@use '@/assets/styles/_mixins' as *;

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(
    90deg,
    rgba($color-bg-primary, 0.95) 0%,
    rgba($color-bg-panel, 0.95) 50%,
    rgba($color-bg-primary, 0.95) 100%
  );
  border-bottom: 1px solid rgba($color-primary, 0.15);
  position: relative;
  z-index: 5;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, rgba($color-primary, 0), rgba($color-primary, 0.3), rgba($color-primary, 0));
  }
}

// 装饰元素
.graph-header-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.header-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  z-index: 2;

  &::after {
    content: '';
    position: absolute;
    width: 3px;
    height: 3px;
    background-color: rgba($color-secondary, 0.7);
    border-radius: 50%;
    box-shadow: 0 0 6px 1px rgba($color-primary, 0.4);
  }

  &.top-left {
    top: 0;
    left: 0;
    background:
      linear-gradient(45deg, transparent 50%, rgba($color-primary, 0.5) 50%) no-repeat 0 0 / 8px 8px,
      linear-gradient(to right, rgba($color-primary, 0.5) 2px, transparent 2px) no-repeat 7px 0 / 10px 2px,
      linear-gradient(to bottom, rgba($color-primary, 0.5) 2px, transparent 2px) no-repeat 0 7px / 2px 10px;
    filter: drop-shadow(0 0 3px rgba($color-primary, 0.2));

    &::after {
      top: 0;
      left: 0;
    }
  }

  &.top-right {
    top: 0;
    right: 0;
    background:
      linear-gradient(135deg, transparent 50%, rgba($color-primary, 0.5) 50%) no-repeat 100% 0 / 8px 8px,
      linear-gradient(to left, rgba($color-primary, 0.5) 2px, transparent 2px) no-repeat 0 0 / 10px 2px,
      linear-gradient(to bottom, rgba($color-primary, 0.5) 2px, transparent 2px) no-repeat 100% 7px / 2px 10px;
    filter: drop-shadow(0 0 3px rgba($color-primary, 0.2));

    &::after {
      top: 0;
      right: 0;
    }
  }
}

.graph-header-glow {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 60px;
  background: radial-gradient(ellipse at center, rgba($color-primary, 0.1) 0%, rgba($color-primary, 0) 70%);
  z-index: 0;
}

.graph-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: $color-text-primary;
  font-weight: 600;
  font-size: $font-size-md;
  text-shadow: 0 0 10px rgba($color-primary, 0.2);
  letter-spacing: 0.5px;
  position: relative;
  z-index: 5;
}

.title-icon {
  @include flex-center;
  color: $color-primary;
  filter: drop-shadow(0 0 5px rgba($color-primary, 0.3));
}

.graph-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  z-index: 5;
}

.graph-extra {
  margin-left: 16px;
  position: relative;
  z-index: 5;
}

/* 优化导出按钮样式，适配深色背景 */
.export-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba($color-primary, 0.1);
  border: 1px solid rgba($color-primary, 0.25);
  color: $color-text-primary;
  padding: 6px 18px;
  border-radius: $border-radius;
  cursor: pointer;
  font-size: $font-size-sm;
  font-weight: 500;
  @include transition(all, 0.18s cubic-bezier(0.4, 0, 0.2, 1));
  outline: none;
  box-shadow: 0 1px 4px rgba($color-primary, 0.05);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba($color-primary, 0.1), transparent);
    transition: left 0.7s ease;
  }

  &:hover {
    background: rgba($color-primary, 0.15);
    border-color: rgba($color-primary, 0.4);
    color: $color-white;
    box-shadow: 0 2px 8px rgba($color-primary, 0.15);
    transform: translateY(-1px);

    &::before {
      left: 100%;
    }
  }

  &:active {
    background: rgba($color-primary, 0.25);
    color: $color-white;
    transform: translateY(1px);
    box-shadow: 0 1px 3px rgba($color-primary, 0.1);
  }
}
</style>
