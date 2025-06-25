<script setup lang="ts">
import AppHeader from './components/layouts/AppHeader.vue'
import { useRoute } from 'vue-router'
import { StagewiseToolbar } from '@stagewise/toolbar-vue'
import { VuePlugin } from '@stagewise-plugins/vue'

const route = useRoute()
const isLoginPage = () => route.path === '/login'

// 开发环境下启用Stagewise
const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV
</script>

<template>
  <div class="app-container">
    <AppHeader v-if="!isLoginPage()" />
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
