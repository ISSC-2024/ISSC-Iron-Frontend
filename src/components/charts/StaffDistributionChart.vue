<script setup lang="ts">
/**
 * @description 钢铁工业资源分布图表组件
 *
 * 该组件使用ECharts实现堆叠水平条形图，展示不同钢铁生产区域的资源分布情况。
 * 包含以下功能：
 * 1. 显示原料资源分布（铁矿石、石灰石、煤炭、焦炭）
 * 2. 显示能源资源分布（电力、蒸汽、天然气）
 * 3. 支持时间戳选择展示不同时间点的数据
 * 4. 支持图表展开/收起状态的响应式调整
 * 5. 展开状态下在柱状图上显示具体数值
 * 6. 支持图表悬停时显示Unity中的管道流动效果
 * 7. 展示optimization_result时间戳数据
 *
 */
import { ref, onMounted, inject, computed, watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import * as echarts from 'echarts'
import unityService from '@/services/UnityService'
import { useMessageStore } from '@/stores/messageStore'
import TextMessageDisplayBox from '../controls/windows/TextMessageDisplayBox.vue'
import GraphHeader from '../common/GraphHeader.vue'

// 导入优化结果数据
import optimizationResult from '@/mock/model4output/optimization_result_2025-05-17_00-00-00.json'

// 当前使用的报告数据
const reportData = ref(optimizationResult as any)

// 获取消息store
const messageStore = useMessageStore()

// 更新图表数据
const updateChartData = () => {
  if (!reportData.value) return

  // 从optimized_resource_allocation中提取原料资源分布数据
  const resourceDistribution = reportData.value.optimized_resource_allocation?.resource_distribution || {}
  const energyAllocation = reportData.value.optimized_resource_allocation?.energy_allocation || {}

  // 更新原料资源数据
  materialsData.materials = {}
  energyData.energy = {}

  // 提取各区域的资源利用率作为原料数据
  Object.keys(resourceDistribution).forEach((area) => {
    if (workshops.includes(area)) {
      const utilization = resourceDistribution[area]?.utilization_rate || 0
      // 模拟原料分布数据（基于利用率）
      materialsData.materials[area] = {
        铁矿石: utilization * 100 + Math.random() * 20,
        石灰石: utilization * 80 + Math.random() * 15,
        煤炭: utilization * 60 + Math.random() * 10,
        焦炭: utilization * 50 + Math.random() * 8,
      }
    }
  })

  // 提取各区域的能源优化数据
  Object.keys(energyAllocation).forEach((area) => {
    if (workshops.includes(area)) {
      const costOptimization = energyAllocation[area]?.cost_optimization || 0
      // 模拟能源分布数据（基于成本优化）
      energyData.energy[area] = {
        电力: costOptimization * 200 + Math.random() * 50,
        蒸汽: costOptimization * 150 + Math.random() * 30,
        天然气: costOptimization * 100 + Math.random() * 20,
      }
    }
  })
}

// 准备原料资源分配数据
const materialsData = {
  materials: {} as { [key: string]: { [key: string]: number } },
  colors: {
    铁矿石: '#FFB74D', // warm amber
    石灰石: '#64B5F6', // cool light blue
    煤炭: '#4DB6AC', // teal
    焦炭: '#BA68C8', // violet
  },
}

// 准备能源资源分配数据
const energyData = {
  energy: {} as { [key: string]: { [key: string]: number } },
  colors: {
    电力: '#FFD54F', // warm yellow
    蒸汽: '#4FC3F7', // cool cyan
    天然气: '#FF8A65', // coral
  },
}

// 注入展开状态
const isExpanded = inject<Ref<boolean>>('isChartExpanded', ref(false))

// 图表DOM引用
const chartRef = ref<HTMLElement | null>(null)
// 图表实例
let chartInstance: echarts.ECharts | null = null

// 资源类型控制（0:原料资源 1:能源资源）
const currentChartType = ref(0)

// 资源类型标题
const resourceTitles = ['原料资源分布', '能源资源分布']

// 资源类型按钮数据
const resourceButtons = [
  { type: 0, label: '原料资源', icon: '🏭' },
  { type: 1, label: '能源资源', icon: '⚡' },
]

// 钢铁生产区域
const workshops = ['原料与采购物流区', '烧结/球团区', '炼焦区', '炼铁区', '炼钢区', '连铸区', '轧制区', '热处理区']

// 原料类型
const materialTypes = ['铁矿石', '石灰石', '煤炭', '焦炭']

// 能源类型
const energyTypes = ['电力', '蒸汽', '天然气']

// 切换到指定图表类型
const switchChartType = (type: number) => {
  currentChartType.value = type
  updateChart()
}

// 类型定义
interface MaterialsData {
  materials: {
    [key: string]: {
      [key: string]: number
    }
  }
  colors: {
    [key: string]: string
  }
}

// 能源资源数据类型
interface EnergyData {
  energy: {
    [key: string]: {
      [key: string]: number
    }
  }
  colors: {
    [key: string]: string
  }
}

// 类型断言
const typedMaterialsData = materialsData as MaterialsData
const typedEnergyData = energyData as EnergyData

// 获取根据展开状态决定的图例名称
const getLegendNames = () => {
  switch (currentChartType.value) {
    case 0: // 原料资源
      return materialTypes
    case 1: // 能源资源
      return energyTypes
    default:
      return []
  }
}

// 添加组件常量标识
const COMPONENT_SOURCE = 'chemical-resource-chart'

// 管道流动处理功能
// 显示管道流动
const showPipeFlow = (params: any) => {
  if (!params || !params.seriesName || !params.name) return

  // 确定资源类型和车间
  const workshop = params.name // 车间名称
  let resourceType = params.seriesName
  let value = params.value
  let fromWorkshop = ''
  let toWorkshop = ''

  // 根据当前图表类型和资源类型定义流动路径
  switch (currentChartType.value) {
    case 0: // 原料资源
      if (resourceType === '铁矿石') {
        fromWorkshop = '原料与采购物流区'
        toWorkshop = workshop !== '原料与采购物流区' ? workshop : '烧结/球团区'
      } else if (resourceType === '石灰石') {
        fromWorkshop = '原料与采购物流区'
        toWorkshop = workshop !== '原料与采购物流区' ? workshop : '炼钢区'
      } else if (resourceType === '煤炭') {
        fromWorkshop = '原料与采购物流区'
        toWorkshop = workshop !== '原料与采购物流区' ? workshop : '炼焦区'
      } else if (resourceType === '焦炭') {
        fromWorkshop = '炼焦区'
        toWorkshop = workshop !== '炼焦区' ? workshop : '炼铁区'
      }
      break
    case 1: // 能源资源
      fromWorkshop = '原料与采购物流区' // 能源主要来源
      toWorkshop = workshop !== '原料与采购物流区' ? workshop : '烧结/球团区'
      break
  }

  // 构建发送给Unity的数据
  const pipeData = {
    from_workshop: fromWorkshop,
    to_workshop: toWorkshop,
    resource_type: resourceType,
    amount: value || 0,
    iteration: 1,
    timestamp: Date.now(),
  }

  // 发送消息到Unity显示管道
  console.log('显示管道流动:', pipeData)
  unityService.sendMessageToUnity('Scripts', 'ReceiveDataFromJS', JSON.stringify(pipeData))
  // 构建文本框显示数据
  const displayData = {
    timestamp: optimizationResult.timestamp,
    resource_type: resourceType,
    from_workshop: fromWorkshop,
    to_workshop: toWorkshop,
    amount: value || 0,
    unit: getUnitByResourceType(),
    status: getResourceStatus(value),
  }

  // 显示消息框
  messageStore.showMessage(
    displayData,
    {
      labelMap: {
        timestamp: '时间戳',
        resource_type: '资源类型',
        from_workshop: '来源区域',
        to_workshop: '目标区域',
        amount: '数值',
        unit: '单位',
        status: '状态',
      },
      valueFormatters: {
        amount: (v: number) => `${v.toFixed(2)}`,
        timestamp: (v: string) => new Date(v).toLocaleString(),
      },
      statusCheckers: {
        status: (v: string) => v.toLowerCase(),
      },
    },
    {
      source: COMPONENT_SOURCE,
      title: `${resourceTitles[currentChartType.value]} - ${optimizationResult.timestamp}`,
    },
  )
}

// 获取资源单位
const getUnitByResourceType = () => {
  switch (currentChartType.value) {
    case 0:
      return '吨'
    case 1:
      return 'kW/MJ'
    default:
      return ''
  }
}

// 获取资源状态
const getResourceStatus = (value: number) => {
  const ranges = getNormalRanges()
  if (!ranges) return '正常'
  return value < ranges[0] || value > ranges[1] ? '警告' : '正常'
}

// 获取正常范围
const getNormalRanges = (): [number, number] | null => {
  switch (currentChartType.value) {
    case 0: // 原料资源
      return [50, 200]
    case 1: // 能源资源
      return [100, 400]
    default:
      return null
  }
}

// 隐藏管道流动
const hidePipeFlow = () => {
  // 隐藏文本框
  messageStore.hideMessage(COMPONENT_SOURCE)
  // 发送消息到Unity隐藏管道
  unityService.sendMessageToUnity('Scripts', 'StopFlow', '')
}

// 将数据转换为echarts所需格式
const getSeriesData = () => {
  switch (currentChartType.value) {
    case 0: // 原料资源
      return materialTypes.map((type) => {
        return {
          name: type,
          type: 'bar' as const,
          stack: '总量',
          emphasis: {
            focus: 'series' as const,
          },
          itemStyle: {
            color: createGradient(typedMaterialsData.colors[type]),
            borderRadius: [0, 6, 6, 0],
          },
          label: {
            position: 'inside' as const,
            formatter: function (params: any) {
              if (isExpanded.value && params.value > 10) {
                return params.value.toFixed(1)
              }
              return ''
            },
            fontSize: 12,
            color: '#fff',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowBlur: 3,
            textShadowOffsetX: 1,
            textShadowOffsetY: 1,
            avoidLabelOverlap: true,
            show: true,
          },
          data: workshops.map((workshop) => typedMaterialsData.materials[workshop]?.[type] || 0),
        }
      })
    case 1: // 能源资源
      return energyTypes.map((type) => {
        return {
          name: type,
          type: 'bar' as const,
          stack: '总量',
          emphasis: {
            focus: 'series' as const,
          },
          itemStyle: {
            color: createGradient(typedEnergyData.colors[type]),
            borderRadius: [0, 6, 6, 0],
          },
          label: {
            position: 'inside' as const,
            formatter: function (params: any) {
              if (isExpanded.value && params.value > 10) {
                return params.value.toFixed(1)
              }
              return ''
            },
            fontSize: 12,
            color: '#fff',
            textShadowColor: 'rgba(0, 0, 0, 0.5)',
            textShadowBlur: 3,
            textShadowOffsetX: 1,
            textShadowOffsetY: 1,
            avoidLabelOverlap: true,
            show: true,
          },
          data: workshops.map((workshop) => typedEnergyData.energy[workshop]?.[type] || 0),
        }
      })
    default:
      return []
  }
}

// 生成渐变颜色，提升科技感
const createGradient = (color: string) => {
  // 使用 echarts 自带的 graphic 生成水平渐变
  return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    {
      offset: 0,
      color: color,
    },
    {
      offset: 1,
      color: 'rgba(255, 255, 255, 0.1)',
    },
  ])
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return

  // 创建图表实例
  chartInstance = echarts.init(chartRef.value)

  // 更新图表
  updateChart()

  // 添加事件监听
  chartInstance.on('mouseover', (params) => {
    showPipeFlow(params)
  })

  chartInstance.on('mouseout', () => {
    hidePipeFlow()
  })
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  // 完全清除图表，避免数据残留问题
  chartInstance.clear()

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      confine: false,
      appendToBody: true,
      className: 'staff-chart-tooltip',
      position: function (point) {
        // 确保tooltip不会太靠边缘
        return [point[0], point[1]]
      },
    },
    legend: {
      data: getLegendNames(),
      orient: 'horizontal',
      bottom: isExpanded.value ? 60 : 0,
      itemWidth: isExpanded.value ? 15 : 10,
      itemHeight: isExpanded.value ? 15 : 10,
      textStyle: {
        fontSize: isExpanded.value ? 12 : 10,
        color: 'rgba(220, 230, 240, 0.9)', // 增加图例文本颜色
      },
      backgroundColor: 'rgba(12, 24, 48, 0.7)', // 添加图例背景色
      borderRadius: 4, // 圆角边框
      padding: 8, // 内边距
      borderColor: 'rgba(32, 160, 255, 0.2)', // 边框颜色
      borderWidth: 1, // 边框宽度
      icon: isExpanded.value ? 'roundRect' : 'circle',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: isExpanded.value ? '120px' : '30px',
      top: '10px',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: 'rgba(32, 160, 255, 0.3)', // 轴线颜色
        },
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(32, 160, 255, 0.1)', // 网格线颜色
        },
      },
      axisLabel: {
        color: 'rgba(220, 230, 240, 0.8)', // 轴标签颜色
      },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: workshops,
      axisLine: {
        lineStyle: {
          color: 'rgba(32, 160, 255, 0.3)', // 轴线颜色
        },
      },
      axisLabel: {
        color: 'rgba(220, 230, 240, 0.8)', // 轴标签颜色
        fontSize: 12, // 增加字体大小
        fontWeight: 'bold', // 加粗
        formatter: function (value: string) {
          const maxLength = 3 // 超过此长度截断
          if (!isExpanded.value && value.length > maxLength) {
            return value.slice(0, maxLength) + '…'
          }
          return value
        },
        rich: {
          a: {
            backgroundColor: 'rgba(20, 40, 80, 0.7)', // 轴标签背景色
            padding: [4, 8], // 内边距
            borderRadius: 3, // 圆角
            color: 'rgba(220, 230, 240, 0.9)', // 文本颜色
          },
        },
      },
      axisTick: { show: false },
    },
    series: getSeriesData(),
    animationDuration: 800,
    animationEasing: 'cubicOut',
    backgroundColor: 'transparent',
  }

  // 使用类型守卫确保chartInstance不为null
  const chart = chartInstance
  if (chart) {
    chart.setOption(option, true)
  }
}

// 监听容器大小变化
watch(isExpanded, () => {
  if (chartInstance) {
    // 展开状态变化时更新图表以显示或隐藏标签
    updateChart()
    setTimeout(() => {
      const chart = chartInstance
      if (chart) {
        chart.resize()
      }
    }, 300)
  }
})

// 组件挂载时初始化图表
onMounted(async () => {
  // 文本框
  chartRef.value?.addEventListener('mouseleave', hidePipeFlow)

  // 初始化数据
  updateChartData()

  // 初始化图表
  initChart()

  // 添加窗口大小变化监听
  window.addEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })
})

// 组件销毁前清理
onBeforeUnmount(() => {
  // 文本框
  chartRef.value?.removeEventListener('mouseleave', hidePipeFlow)

  // 先移除事件监听
  if (chartInstance) {
    chartInstance.off('mouseover')
    chartInstance.off('mouseout')
  }

  // 移除窗口大小变化监听
  window.removeEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })

  // 销毁图表实例
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
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

// 在图表容器添加鼠标离开监听
onMounted(() => {
  chartRef.value?.addEventListener('mouseleave', hidePipeFlow)
})
</script>

<template>
  <div class="resource-distribution-chart-container">
    <GraphHeader :title="'钢铁工业资源分布'">
      <template #icon>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"
          />
        </svg>
      </template>
    </GraphHeader>

    <transition name="fade" mode="out-in">
      <div class="resource-distribution-chart" ref="chartRef" :style="chartStyle"></div>
    </transition>

    <!-- 资源类型切换按钮 -->
    <div class="chart-type-buttons">
      <button
        v-for="button in resourceButtons"
        :key="button.type"
        class="chart-type-button"
        :class="{ active: currentChartType === button.type }"
        @click="switchChartType(button.type)"
      >
        <span class="button-icon">{{ button.icon }}</span>
        <span class="button-label">{{ button.label }}</span>
      </button>
    </div>
  </div>
  <TextMessageDisplayBox />
</template>

<style lang="scss" src="@/assets/styles/StaffDistributionChart.scss"></style>
