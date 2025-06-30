<script setup lang="ts">
import AppHeader from './components/layouts/AppHeader.vue'
</script>

<template>
  <div class="app-container">
    <AppHeader />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>
