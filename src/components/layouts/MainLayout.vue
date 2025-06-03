<script setup lang="ts">
/**
 * @description 主布局组件
 *
 * 该组件实现应用的三列式主布局结构，包含以下功能：
 * 1. 左侧列：用于显示多个图表组件
 * 2. 中间列：主要包含WebGL内容区、控制按钮区和资源展示区
 * 3. 右侧列：用于显示多个图表组件
 * 4. 通过插槽机制实现灵活的内容嵌套
 * 5. 响应式设计，提供合理的空间分配和美观的滚动条样式
 */
// 主布局组件，实现三列式布局
</script>

<template>
  <div class="dashboard-container">
    <!-- 左侧列 -->
    <div class="left-column">
      <div class="column-content">
        <slot name="left-column"></slot>
      </div>
    </div>

    <!-- 中间列 -->
    <div class="middle-column">
      <div class="webgl-container tech-container">
        <!-- 添加四角装饰 -->
        <div class="webgl-corner webgl-corner-top-left"></div>
        <div class="webgl-corner webgl-corner-top-right"></div>
        <div class="webgl-corner webgl-corner-bottom-left"></div>
        <div class="webgl-corner webgl-corner-bottom-right"></div>

        <!-- 旋转光环特效 -->
        <div class="orbit-container">
          <div class="orbit orbit-1">
            <div class="orbital-dot"></div>
          </div>
          <div class="orbit orbit-2">
            <div class="orbital-dot"></div>
          </div>
          <div class="orbit orbit-3">
            <div class="orbital-dot"></div>
          </div>
        </div>

        <!-- 扫描线效果 -->
        <div class="scan-line-horizontal"></div>
        <div class="scan-line-vertical"></div>

        <!-- 数据线装饰 -->
        <div class="data-line data-line-1"></div>
        <div class="data-line data-line-2"></div>
        <div class="data-line data-line-3"></div>
        <div class="data-line data-line-4"></div>

        <!-- 脉冲波纹 -->
        <div class="pulse-ring"></div>

        <slot name="webgl-content"></slot>
      </div>

      <div class="controls-container tech-container">
        <div class="corner corner-top-left"></div>
        <div class="corner corner-top-right"></div>
        <div class="corner corner-bottom-left"></div>
        <div class="corner corner-bottom-right"></div>
        <slot name="controls"></slot>
      </div>

      <div class="resources-container tech-container">
        <div class="corner corner-top-left"></div>
        <div class="corner corner-top-right"></div>
        <div class="corner corner-bottom-left"></div>
        <div class="corner corner-bottom-right"></div>
        <slot name="resources"></slot>
      </div>
    </div>

    <!-- 右侧列 -->
    <div class="right-column">
      <div class="column-content">
        <slot name="right-column"></slot>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/MainLayout.scss';
</style>
