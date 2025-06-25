<script setup lang="ts">
/**
 * @description 应用头部组件
 *
 * 该组件显示应用的顶部标题栏，包含以下功能：
 * 1. 显示应用名称"全域互联的工业智能体协同平台"
 * 2. 实时显示当前系统时间，每秒更新一次
 * 3. 高科技暗色调界面设计，增强用户体验
 * 4. 响应式布局设计
 * 5. 动态视觉效果
 */
import { ref, onMounted } from 'vue'
import AuthService from '@/services/AuthService'

// 时间显示逻辑
const currentTime = ref(new Date().toLocaleTimeString())
const currentDate = ref(formatDate(new Date()))

// 格式化日期为 YYYY-MM-DD 星期X
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const weekDay = weekDays[date.getDay()]

  return `${year}-${month}-${day} 星期${weekDay}`
}

// 登出函数
const handleLogout = async () => {
  try {
    // 等待登出操作完成
    await AuthService.logout()
    // 登出完成后跳转
    window.location.href = '/login'
  } catch (error) {
    console.error('登出失败:', error)
  }
}

onMounted(() => {
  // 设置时间更新
  setInterval(() => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString()
    currentDate.value = formatDate(now)
  }, 1000)
})
</script>

<template>
  <header class="app-header">
    <div class="header-bg-effects">
      <div class="header-glow"></div>
      <div class="header-grid"></div>
      <div class="cyber-lines">
        <div class="cyber-line line-1"></div>
        <div class="cyber-line line-2"></div>
        <div class="cyber-line line-3"></div>
      </div>
      <div class="hexagon-container">
        <div class="hexagon hex-1"></div>
        <div class="hexagon hex-2"></div>
        <div class="hexagon hex-3"></div>
      </div>
    </div>

    <div class="logo">
      <div class="logo-icon">
        <!-- 钢铁行业Logo SVG -->
        <svg viewBox="0 0 24 24" width="32" height="32">
          <!-- 钢铁厂/高炉图标 -->
          <path
            fill="currentColor"
            d="M21,13v9H3V13H21m0-2H3a2,2 0 0,0 -2,2v9a2,2 0 0,0 2,2h18a2,2 0 0,0 2,-2v-9a2,2 0 0,0 -2,-2M6,15v2H4v-2H6m3,0v2H7v-2H9m3,0v2h-2v-2h2m3,0v2h-2v-2h2m3,0v2h-2v-2h2m3,0v2h-2v-2"
          />
          <!-- 烟囱/冶炼效果 -->
          <path fill="currentColor" d="M4,2H7a2,2 0 0,1 2,2v5h-2V4H4V2m7,2h3a1,1 0 0,1 1,1v4h-2V5h-2V4m6,0h4v2h-4" />
          <!-- 钢铁流动效果 -->
          <path fill="#ff5722" d="M8,12h8c0,-1 -2,-2 -4,-2s-4,1 -4,2z" />
        </svg>
        <!-- 添加光环效果 -->
        <div class="logo-halo"></div>
      </div>
      <div class="logo-text-container">
        <span class="logo-text">钢铁行业-全域互联的工业智能体协同平台</span>
        <span class="logo-shine"></span>
        <span class="logo-underline"></span>
        <div class="text-particles">
          <span class="particle" v-for="n in 5" :key="n"></span>
        </div>
      </div>
    </div>

    <div class="header-right">
      <div class="time-display">
        <div class="date">{{ currentDate }}</div>
        <div class="time">
          <span class="time-digit">{{ currentTime }}</span>
          <span class="time-pulse"></span>
        </div>
      </div>

      <button @click="handleLogout" class="logout-btn" title="退出登录">
        <span class="btn-icon">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"
            />
          </svg>
        </span>
        <span>退出</span>
        <span class="btn-glow"></span>
      </button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/AppHeader.scss';

/* 添加钢铁行业特征的CSS样式 */
.logo-icon {
  svg {
    filter: drop-shadow(0 0 3px #ff5722);
  }

  /* 钢铁熔融效果动画 */
  @keyframes melt {
    0% {
      opacity: 0.6;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.6;
    }
  }

  svg path:nth-child(3) {
    animation: melt 2s infinite;
  }
}
</style>
