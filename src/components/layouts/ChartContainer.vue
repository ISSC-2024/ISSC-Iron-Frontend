<script setup lang="ts">
/**
 * @description 高级图表容器组件
 *
 * 该组件为图表提供统一的容器，实现以下功能：
 * 1. 提供展开/收起功能，允许用户放大查看图表详情
 * 2. 通过provide/inject向子组件提供展开状态
 * 3. 在展开状态下显示覆盖层和关闭按钮
 * 4. 自适应布局，确保图表在各种状态下正确显示
 * 5. 科技感的动画效果和统一的深色风格设计
 */
import { ref, provide, onMounted } from 'vue'

// 图表容器组件
const isExpanded = ref(false)

// 提供给子组件的状态
provide('isChartExpanded', isExpanded)

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

const closeExpand = () => {
  isExpanded.value = false
}

// 容器引用
const chartContainerRef = ref(null)

// 在挂载时添加进入动画
onMounted(() => {
  if (chartContainerRef.value) {
    const container = chartContainerRef.value as HTMLElement
    container.classList.add('chart-container-enter')

    // 错开动画开始时间，实现级联动画效果
    setTimeout(() => {
      container.classList.remove('chart-container-enter')
      container.classList.add('chart-container-active')
    }, Math.random() * 300)
  }
})
</script>

<template>
  <div class="chart-container" ref="chartContainerRef">
    <div class="chart-background-effects">
      <div class="chart-grid"></div>
      <div class="chart-glow"></div>
    </div>

    <div class="chart-header">
      <div class="expand-button" @click="toggleExpand" :title="isExpanded ? '折叠图表' : '展开图表'">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path
            v-if="!isExpanded"
            fill="currentColor"
            d="M10,21V19H6.41L10.91,14.5L9.5,13.09L5,17.59V14H3V21H10M14.5,10.91L19,6.41V10H21V3H14V5H17.59L13.09,9.5L14.5,10.91Z"
          />
          <path
            v-else
            fill="currentColor"
            d="M19.5,3.09L15,7.59V4H13V11H20V9H16.41L20.91,4.5L19.5,3.09M4,13V15H7.59L3.09,19.5L4.5,20.91L9,16.41V20H11V13H4Z"
          />
        </svg>
      </div>
    </div>

    <div class="chart-content">
      <slot></slot>
    </div>

    <div class="chart-border-effect top-left"></div>
    <div class="chart-border-effect top-right"></div>
    <div class="chart-border-effect bottom-left"></div>
    <div class="chart-border-effect bottom-right"></div>
  </div>

  <!-- 展开后的浮层 -->
  <Transition name="overlay-fade">
    <div v-if="isExpanded" class="expanded-overlay" @click="closeExpand">
      <Transition name="container-zoom">
        <div class="expanded-container" @click.stop>
          <div class="expanded-background-effects">
            <div class="expanded-grid"></div>
            <div class="expanded-glow"></div>
          </div>

          <div class="expanded-header">
            <div class="expanded-title">
              <div class="title-icon">
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="currentColor"
                    d="M16,18L18.29,15.71L13.41,10.83L9.41,14.83L2,7.41L3.41,6L9.41,12L13.41,8L19.71,14.29L22,12V18H16Z"
                  />
                </svg>
              </div>
              <span>详细视图</span>
            </div>

            <div class="close-button" @click="closeExpand" title="关闭">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="currentColor"
                  d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
                />
              </svg>
            </div>
          </div>

          <div class="expanded-content">
            <slot name="expanded" v-if="$slots.expanded"></slot>
            <slot v-else></slot>
          </div>

          <div class="expanded-border-effect top-left"></div>
          <div class="expanded-border-effect top-right"></div>
          <div class="expanded-border-effect bottom-left"></div>
          <div class="expanded-border-effect bottom-right"></div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/ChartContainer.scss' as *;
</style>
