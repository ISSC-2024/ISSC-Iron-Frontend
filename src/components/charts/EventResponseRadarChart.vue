<script setup lang="ts">
/**
 * @description 事件响应情况雷达图组件
 *
 * 该组件使用ECharts实现雷达图，用于展示不同化工车间的事件响应情况。
 * 包含以下数据维度：
 * 1. 响应时效
 * 2. 响应耗时
 * 3. 事件完成率
 * 4. 响应质量
 * 5. 资源利用率
 * 6. 文档完整度
 *
 * 支持图表展开/收起状态的响应式调整
 */
import { ref, onMounted, inject, computed, watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import * as echarts from 'echarts'
import GraphHeader from '../common/GraphHeader.vue'

// 导入所有算法结果文件
import mappo005 from '@/mock/MAPPO/0.005_1000.json'
import mappo001 from '@/mock/MAPPO/0.001_1000.json'
import maddpg005 from '@/mock/MADDPG/0.005_1000.json'
import maddpg001 from '@/mock/MADDPG/0.001_1000.json'
import iqlearning005 from '@/mock/IQL/0.005_1000.json'
import iqlearning001 from '@/mock/IQL/0.001_1000.json'
import dqn005 from '@/mock/DQN/0.005_1000.json'
import dqn001 from '@/mock/DQN/0.001_1000.json'

// 为每个算法分配不同颜色
const algorithmColors = {
  'MAPPO (0.005)': '#4CAF50', // 绿色
  'MAPPO (0.001)': '#2196F3', // 蓝色
  'MADDPG (0.005)': '#FF5722', // 橙色
  'MADDPG (0.001)': '#9C27B0', // 紫色
  'IQL (0.005)': '#FFC107', // 黄色
  'IQL (0.001)': '#607D8B', // 蓝灰色
  'DQN (0.005)': '#E91E63', // 粉色
  'DQN (0.001)': '#795548', // 棕色
}

// 准备算法性能指标数据
const responseData = {
  indicators: [
    { name: '响应时间', max: 25000 },
    { name: '响应及时性', max: 1 },
    { name: '响应质量', max: 1 },
    { name: '资源利用率', max: 1 },
    { name: '事件完成率', max: 1 },
  ],
  data: [
    {
      name: 'MAPPO (0.005)',
      values: [
        mappo005.performance.response_time,
        Math.abs(mappo005.performance.response_timeliness),
        mappo005.performance.response_quality,
        mappo005.performance.resource_utilization,
        mappo005.performance.event_completion_rate,
      ],
      color: algorithmColors['MAPPO (0.005)'],
    },
    {
      name: 'MAPPO (0.001)',
      values: [
        mappo001.performance.response_time,
        Math.abs(mappo001.performance.response_timeliness),
        mappo001.performance.response_quality,
        mappo001.performance.resource_utilization,
        mappo001.performance.event_completion_rate,
      ],
      color: algorithmColors['MAPPO (0.001)'],
    },
    {
      name: 'MADDPG (0.005)',
      values: [
        maddpg005.performance.response_time,
        Math.abs(maddpg005.performance.response_timeliness),
        maddpg005.performance.response_quality,
        maddpg005.performance.resource_utilization,
        maddpg005.performance.event_completion_rate,
      ],
      color: algorithmColors['MADDPG (0.005)'],
    },
    {
      name: 'MADDPG (0.001)',
      values: [
        maddpg001.performance.response_time,
        Math.abs(maddpg001.performance.response_timeliness),
        maddpg001.performance.response_quality,
        maddpg001.performance.resource_utilization,
        maddpg001.performance.event_completion_rate,
      ],
      color: algorithmColors['MADDPG (0.001)'],
    },
    {
      name: 'IQL (0.005)',
      values: [
        iqlearning005.performance.response_time,
        Math.abs(iqlearning005.performance.response_timeliness),
        iqlearning005.performance.response_quality,
        iqlearning005.performance.resource_utilization,
        iqlearning005.performance.event_completion_rate,
      ],
      color: algorithmColors['IQL (0.005)'],
    },
    {
      name: 'IQL (0.001)',
      values: [
        iqlearning001.performance.response_time,
        Math.abs(iqlearning001.performance.response_timeliness),
        iqlearning001.performance.response_quality,
        iqlearning001.performance.resource_utilization,
        iqlearning001.performance.event_completion_rate,
      ],
      color: algorithmColors['IQL (0.001)'],
    },
    {
      name: 'DQN (0.005)',
      values: [
        dqn005.performance.response_time,
        Math.abs(dqn005.performance.response_timeliness),
        dqn005.performance.response_quality,
        dqn005.performance.resource_utilization,
        dqn005.performance.event_completion_rate,
      ],
      color: algorithmColors['DQN (0.005)'],
    },
    {
      name: 'DQN (0.001)',
      values: [
        dqn001.performance.response_time,
        Math.abs(dqn001.performance.response_timeliness),
        dqn001.performance.response_quality,
        dqn001.performance.resource_utilization,
        dqn001.performance.event_completion_rate,
      ],
      color: algorithmColors['DQN (0.001)'],
    },
  ],
}

// 注入展开状态
const isExpanded = inject<Ref<boolean>>('isChartExpanded', ref(false))

// 图表DOM引用
const chartRef = ref<HTMLElement | null>(null)
// 图表实例
let chartInstance: echarts.ECharts | null = null

// 添加全局样式
const addGlobalStyle = () => {
  const styleElement = document.createElement('style')
  styleElement.id = 'event-radar-tooltip-style'
  styleElement.innerHTML = `
    .event-radar-tooltip {
      z-index: 10000 !important;
      position: fixed !important;
      pointer-events: none !important;
      box-shadow: 0 3px 14px rgba(0,0,0,0.2) !important;
      max-width: none !important;
      overflow: visible !important;
    }
  `
  document.head.appendChild(styleElement)
}

// 移除全局样式
const removeGlobalStyle = () => {
  const styleElement = document.getElementById('event-radar-tooltip-style')
  if (styleElement) {
    document.head.removeChild(styleElement)
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  const option: echarts.EChartsOption = {
    color: responseData.data.map((item) => item.color),
    tooltip: {
      trigger: 'item',
      confine: false,
      appendToBody: true,
      className: 'event-radar-tooltip',
      formatter: (params: any) => {
        const { name, value } = params
        const indicators = responseData.indicators
        let result = `<div style="font-weight:bold;margin-bottom:8px;font-size:14px;color:#ffffff;">${name}</div>`
        result += '<div style="display:table;width:100%;">'
        value.forEach((val: number, index: number) => {
          const formattedValue = Number.isInteger(val) ? val : val.toFixed(2)
          result += `
            <div style="display:table-row;">
              <div style="display:table-cell;padding-right:10px;color:#a9d6ff;">${indicators[index].name}:</div>
              <div style="display:table-cell;text-align:right;font-weight:bold;color:#ffffff;">${formattedValue}</div>
            </div>`
        })
        result += '</div>'
        return result
      },
      backgroundColor: 'rgba(8, 20, 40, 0.9)',
      borderColor: 'rgba(32, 160, 255, 0.3)',
      textStyle: {
        color: '#ffffff',
        fontSize: 13,
      },
      extraCssText:
        'border-radius: 8px; backdrop-filter: blur(6px); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 15px rgba(32, 160, 255, 0.15);',
    },
    legend: {
      data: responseData.data.map((item) => item.name),
      bottom: isExpanded.value ? 15 : 10,
      itemWidth: isExpanded.value ? 12 : 10,
      itemHeight: isExpanded.value ? 12 : 10,
      textStyle: {
        fontSize: isExpanded.value ? 12 : 10,
        color: 'rgba(220, 230, 240, 0.9)',
      },
      itemGap: isExpanded.value ? 12 : 6, // 减少非展开状态下的间距
      backgroundColor: 'rgba(15, 30, 60, 0.7)',
      borderRadius: 6,
      padding: isExpanded.value ? 10 : 5,
      borderColor: 'rgba(32, 160, 255, 0.2)',
      borderWidth: 1,
    },
    radar: {
      indicator: responseData.indicators.map((indicator) => ({
        name: indicator.name,
        max: indicator.max,
      })),
      center: ['50%', isExpanded.value ? '50%' : '42%'],
      radius: isExpanded.value ? '60%' : '50%',
      splitNumber: 5,
      shape: 'polygon',
      axisLine: {
        lineStyle: {
          color: 'rgba(32, 160, 255, 0.2)',
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(32, 160, 255, 0.15)',
        },
      },
      splitArea: {
        areaStyle: {
          color: ['rgba(32, 160, 255, 0.03)', 'rgba(15, 30, 60, 0.05)'],
        },
      },
      axisName: {
        color: 'rgba(220, 230, 240, 0.9)',
        fontSize: isExpanded.value ? 13 : 12,
        padding: [3, 5],
        backgroundColor: 'rgba(15, 30, 60, 0.7)',
        borderRadius: 3,
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowBlur: 5,
        rich: {
          // 添加富文本配置实现指标名称加粗
          value: {
            color: 'rgba(220, 230, 240, 0.9)',
            fontWeight: 'bold',
            fontSize: isExpanded.value ? 13 : 12,
          },
        },
        formatter: function (name?: string) {
          // 将指标名称用富文本包装实现加粗
          return '{value|' + (name || '') + '}'
        },
      },
    },
    series: [
      {
        type: 'radar',
        symbolSize: isExpanded.value ? 6 : 4,
        data: responseData.data.map((item) => ({
          value: item.values,
          name: item.name,
          symbol: 'circle',
          // 修改：移除区域填充颜色
          areaStyle: {
            opacity: 0, // 将透明度设为0，移除填充
          },
          // 美化线条样式
          lineStyle: {
            width: isExpanded.value ? 2.5 : 2,
            shadowColor: item.color,
            shadowBlur: 5,
            // 添加虚线效果
            type: 'solid',
            // 添加渐变效果
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: item.color, // 开始颜色
                },
                {
                  offset: 1,
                  color: item.color + 'cc', // 结束颜色，增加透明度
                },
              ],
              global: false, // 缺省为 false
            },
          },
          emphasis: {
            lineStyle: {
              width: isExpanded.value ? 4 : 3,
              shadowBlur: 8,
              type: 'solid', // 悬停时显示实线
            },
            itemStyle: {
              shadowColor: item.color,
              shadowBlur: 10,
            },
            // 悬停时也不显示区域填充
            areaStyle: {
              opacity: 0.1, // 悬停时轻微显示区域
              color: item.color,
            },
          },
        })),
      },
    ],
    grid: {
      top: 10,
      bottom: isExpanded.value ? 80 : 70,
    },
    animation: true,
    animationDuration: 1000,
    animationEasing: 'cubicOut',
  }

  // 设置选项
  chartInstance.setOption(option)
}

// 向图表添加视觉效果
const addVisualEffects = () => {
  if (!chartRef.value || !chartInstance) return

  // 添加渐变背景效果
  chartRef.value.style.background =
    'radial-gradient(ellipse at center, rgba(20, 40, 80, 0.2) 0%, rgba(10, 20, 40, 0) 70%)'
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  // 创建图表实例
  chartInstance = echarts.init(chartRef.value)

  // 更新图表
  updateChart()

  // 添加视觉效果
  addVisualEffects()
}

// 监听容器大小变化
watch(isExpanded, () => {
  if (chartInstance) {
    // 延迟一点时间等待容器尺寸变化完成
    setTimeout(() => {
      chartInstance?.resize()
    }, 300)
  }
})

// 组件挂载时初始化图表
onMounted(() => {
  addGlobalStyle()
  initChart()

  // 添加窗口大小变化监听
  window.addEventListener('resize', () => {
    chartInstance?.resize()
    // 更新效果
    setTimeout(() => {
      addVisualEffects()
    }, 100)
  })
})

// 组件销毁前清理
onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  removeGlobalStyle()
  window.removeEventListener('resize', () => {
    chartInstance?.resize()
  })
})

// 根据展开状态计算样式
const chartStyle = computed(() => {
  if (isExpanded.value) {
    return {
      height: '100%',
    }
  }
  return {}
})
</script>

<template>
  <div class="event-response-radar-container">
    <!-- 标题栏 -->
    <GraphHeader :title="'系统响应性能分析'">
      <template #icon>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,10.5A1.5,1.5 0 0,0 10.5,12A1.5,1.5 0 0,0 12,13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 12,10.5M7.5,12A1.5,1.5 0 0,0 6,13.5A1.5,1.5 0 0,0 7.5,15A1.5,1.5 0 0,0 9,13.5A1.5,1.5 0 0,0 7.5,12M16.5,12A1.5,1.5 0 0,0 15,13.5A1.5,1.5 0 0,0 16.5,15A1.5,1.5 0 0,0 18,13.5A1.5,1.5 0 0,0 16.5,12Z"
          />
        </svg>
      </template>
    </GraphHeader>

    <!-- 雷达图 -->
    <div class="event-response-radar-chart" ref="chartRef" :style="chartStyle"></div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/_variables' as *;
@use '@/assets/styles/_mixins' as *;

// =====================
// EventResponseRadarChart 变量
// =====================

// 背景和基础颜色
$radar-bg1: $color-bg-primary;
$radar-bg2: darken($color-bg-primary, 5%);
$radar-grid-color: rgba($color-primary, 0.05);
$radar-grid-highlight: rgba($color-primary, 0.1);

// 工具提示样式
$radar-tooltip-bg: rgba($color-bg-primary, 0.9);
$radar-tooltip-border: rgba($color-primary, 0.5);

// 图表相关尺寸
$radar-border-radius: $border-radius;
$radar-tooltip-radius: 4px;

// 渐变和效果
$radar-bg-gradient: linear-gradient(135deg, $radar-bg1, $radar-bg2);
$radar-glow1: rgba($color-primary, 0.05);
$radar-glow2: rgba($color-secondary, 0.05);

// 阴影效果
$radar-shadow: $panel-shadow;
$radar-tooltip-shadow:
  0 4px 20px rgba(0, 0, 0, 0.3),
  0 0 15px rgba($color-primary, 0.15);

// =====================
// 组件样式
// =====================
.event-response-radar-container {
  width: 100%;
  height: 100%;
  @include flex-column;
  position: relative;
  background: $radar-bg-gradient;
  border-radius: $radar-border-radius;
  overflow: hidden;
  box-shadow: $radar-shadow;
  @include futuristic-border($color-primary);
}

// 雷达图样式
.event-response-radar-chart {
  width: 100%;
  flex: 1;
  position: relative;
  backdrop-filter: blur(2px);
  isolation: isolate;

  // 网格背景效果
  &::before {
    content: '';
    @include absolute-fill;
    pointer-events: none;
    background-image:
      linear-gradient(to bottom, transparent 49.5%, $radar-grid-color 50%, transparent 50.5%),
      linear-gradient(90deg, $radar-grid-highlight 1px, transparent 1px),
      linear-gradient($radar-grid-color 1px, transparent 1px);
    background-size:
      100% 6px,
      20px 20px,
      20px 20px;
    z-index: -1;
  }

  // 全息投影效果
  &::after {
    content: '';
    @include absolute-fill;
    @include tech-glow-background($color-primary, $color-secondary);
    pointer-events: none;
    z-index: -1;
  }
}

// 工具提示样式
:deep(.event-radar-tooltip) {
  background: $radar-tooltip-bg !important;
  backdrop-filter: blur(10px) !important;
  border-radius: $radar-tooltip-radius !important;
  border: 1px solid $radar-tooltip-border !important;
  box-shadow: $radar-tooltip-shadow !important;
  padding: $spacing-sm $spacing-md !important;
  color: $color-text-primary !important;
  font-family: 'Inter', 'Roboto', sans-serif !important;
}

:deep(.radar-indicator-name) {
  font-weight: bold !important;
  text-shadow: 0 0 5px rgba($color-primary, 0.2) !important;
}
</style>
