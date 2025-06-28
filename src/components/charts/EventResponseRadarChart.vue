<script setup lang="ts">
/**
 * @description KPI指标雷达图组件
 *
 * 该组件使用ECharts实现雷达图，用于展示钢铁工业optimization_result数据中的KPI指标。
 * 包含以下数据维度：
 * 1. 生产效率 (production_rate)
 * 2. 能耗水平 (energy_consumption)
 * 3. 成本效率 (cost_efficiency)
 * 4. 质量指数 (quality_index)
 * 5. 环境评分 (environmental_score)
 * 6. 资源利用率 (resource_utilization)
 * 7. 协同效率 (collaboration_efficiency)
 * 8. 优化收敛 (optimization_convergence)
 * 9. 调度效率 (scheduling_efficiency)
 * 10. 风险缓解评分 (risk_mitigation_score)
 *
 * 支持图表展开/收起状态的响应式调整
 */
import { ref, onMounted, inject, computed, watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import * as echarts from 'echarts'
import GraphHeader from '../common/GraphHeader.vue'

// 导入优化结果数据
import optimizationResult from '@/mock/model4output/optimization_result_2025-05-17_00-00-00.json'

// KPI指标定义
const kpiIndicators = [
  { name: '生产效率', key: 'production_rate', max: 1 },
  { name: '能耗水平', key: 'energy_consumption', max: 1 },
  { name: '成本效率', key: 'cost_efficiency', max: 1 },
  { name: '质量指数', key: 'quality_index', max: 1 },
  { name: '环境评分', key: 'environmental_score', max: 1 },
  { name: '资源利用率', key: 'resource_utilization', max: 1 },
  { name: '协同效率', key: 'collaboration_efficiency', max: 1 },
  { name: '优化收敛', key: 'optimization_convergence', max: 2 }, // 这个指标最大值为2
  { name: '调度效率', key: 'scheduling_efficiency', max: 1 },
  { name: '风险缓解', key: 'risk_mitigation_score', max: 1 },
]

// 准备KPI指标数据
const kpiData = {
  indicators: kpiIndicators.map((indicator) => ({
    name: indicator.name,
    max: indicator.max,
  })),
  data: [
    {
      name: optimizationResult.timestamp,
      values: kpiIndicators.map((indicator) => {
        const value = (optimizationResult as any).kpi_metrics?.[indicator.key] || 0
        return value
      }),
      color: '#00E5FF', // 亮青色，高对比
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
    color: kpiData.data.map((item) => item.color),
    tooltip: {
      trigger: 'item',
      confine: false,
      appendToBody: true,
      className: 'event-radar-tooltip',
      formatter: (params: any) => {
        const { name, value } = params
        const indicators = kpiData.indicators
        let result = `<div style="font-weight:bold;margin-bottom:8px;font-size:14px;color:#ffffff;">${name}</div>`
        result += '<div style="display:table;width:100%;">'
        value.forEach((val: number, index: number) => {
          const formattedValue = Number.isInteger(val) ? val : val.toFixed(3)
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
      data: kpiData.data.map((item) => item.name),
      bottom: isExpanded.value ? 15 : 10,
      itemWidth: isExpanded.value ? 12 : 10,
      itemHeight: isExpanded.value ? 12 : 10,
      textStyle: {
        fontSize: isExpanded.value ? 12 : 10,
        color: 'rgba(220, 230, 240, 0.9)',
      },
      itemGap: isExpanded.value ? 12 : 6,
      backgroundColor: 'rgba(15, 30, 60, 0.7)',
      borderRadius: 6,
      padding: isExpanded.value ? 10 : 5,
      borderColor: 'rgba(32, 160, 255, 0.2)',
      borderWidth: 1,
    },
    radar: {
      indicator: kpiData.indicators.map((indicator) => ({
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
          value: {
            color: 'rgba(220, 230, 240, 0.9)',
            fontWeight: 'bold',
            fontSize: isExpanded.value ? 13 : 12,
          },
        },
        formatter: function (name?: string) {
          return '{value|' + (name || '') + '}'
        },
      },
    },
    series: [
      {
        type: 'radar',
        symbolSize: isExpanded.value ? 8 : 6,
        data: kpiData.data.map((item) => ({
          value: item.values,
          name: item.name,
          symbol: 'circle',
          areaStyle: {
            opacity: 0.18,
            color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
              { offset: 0, color: 'rgba(0, 229, 255, 0.35)' },
              { offset: 1, color: 'rgba(0, 229, 255, 0.05)' },
            ]),
          },
          lineStyle: {
            width: isExpanded.value ? 3 : 2.2,
            shadowColor: item.color,
            shadowBlur: 12,
            type: 'solid',
            color: item.color,
          },
          emphasis: {
            lineStyle: {
              width: isExpanded.value ? 5 : 4,
              shadowBlur: 16,
              type: 'solid',
            },
            itemStyle: {
              shadowColor: item.color,
              shadowBlur: 14,
            },
            areaStyle: {
              opacity: 0.28,
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
                { offset: 0, color: 'rgba(0, 229, 255, 0.45)' },
                { offset: 1, color: 'rgba(0, 229, 255, 0.08)' },
              ]),
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
    <GraphHeader :title="'KPI指标性能分析'" :centered="true" :glow-effect="true">
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
@use 'sass:color';

// =====================
// EventResponseRadarChart 变量
// =====================

// 背景和基础颜色
$radar-bg1: $color-bg-primary;
$radar-bg2: color.adjust($color-bg-primary, $lightness: -5%);
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
