<script setup lang="ts">
import AppHeader from './components/layouts/AppHeader.vue'
import { StagewiseToolbar } from '@stagewise/toolbar-vue'
import { VuePlugin } from '@stagewise-plugins/vue'

// 开发环境下启用Stagewise
const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV
</script>

<template>
  <div class="app-container">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
    <StagewiseToolbar
      v-if="isDev"
      :config="{
        plugins: [VuePlugin],
      }"
    />
  </div>
</template>
