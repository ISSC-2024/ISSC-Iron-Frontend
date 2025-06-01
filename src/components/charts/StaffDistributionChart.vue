<script setup lang="ts">
/**
 * @description 化工车间资源分布图表组件
 *
 * 该组件使用ECharts实现堆叠水平条形图，展示不同化工车间的资源分布情况。
 * 包含以下功能：
 * 1. 显示人力资源分布（技术人员、管理人员、维修人员、安全人员、操作人员）
 * 2. 显示物料资源分布（原料、催化剂、存储容量）
 * 3. 显示电力资源分布
 * 4. 支持图表展开/收起状态的响应式调整
 * 5. 展开状态下在柱状图上显示具体数值
 * 6. 缩略图状态下使用简化的图例和更紧凑的布局
 * 7. 优化的tooltip显示，确保不被容器遮挡
 * 8. 人力资源、物料资源和电力资源图表轮播展示
 * 9. 支持图表悬停时显示Unity中的管道流动效果
 *
 */
import { ref, onMounted, inject, computed, watch, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'
import * as echarts from 'echarts'
import { useAlgorithmStore, ModuleType } from '@/stores/algorithmStore'
import unityService from '@/services/UnityService'
import { useMessageStore } from '@/stores/messageStore'
import TextMessageDisplayBox from '../controls/windows/TextMessageDisplayBox.vue'
import GraphHeader from '../common/GraphHeader.vue'

// 获取算法状态管理
const algorithmStore = useAlgorithmStore()

// 当前使用的报告数据
const reportData = ref({} as any)

// 获取消息store
const messageStore = useMessageStore()

// 动态加载报告数据 - 修改为使用algorithmStore
const loadReportData = async () => {
  try {
    // 使用algorithmStore获取模块4的数据
    const reportModule = await algorithmStore.getModuleDataFile(ModuleType.Module4)

    if (reportModule && reportModule.default) {
      reportData.value = reportModule.default
      const currentAlgorithm = algorithmStore.getModuleSelectedAlgorithm(ModuleType.Module4)
      console.log(`成功加载模块4(${currentAlgorithm})资源分布数据`)
    } else {
      console.warn('模块4资源分布数据为空')
    }
  } catch (error) {
    console.error('加载模块4资源分布数据失败:', error)
  }
  // 更新图表数据
  updateChartData()
  // 重新渲染图表
  updateChart()
}

// 更新图表数据
const updateChartData = () => {
  // 更新人力资源数据
  staffData.staff = {
    原料储存区: {
      技术人员: reportData.value.resources.personnel.subtypes.technician.data[0].value,
      管理人员: reportData.value.resources.personnel.subtypes.manager.data[0].value,
      维修人员: reportData.value.resources.personnel.subtypes.maintenance.data[0].value,
      安全人员: reportData.value.resources.personnel.subtypes.safety.data[0].value,
      操作人员: reportData.value.resources.personnel.subtypes.operator.data[0].value,
    },
    反应器区: {
      技术人员: reportData.value.resources.personnel.subtypes.technician.data[1].value,
      管理人员: reportData.value.resources.personnel.subtypes.manager.data[1].value,
      维修人员: reportData.value.resources.personnel.subtypes.maintenance.data[1].value,
      安全人员: reportData.value.resources.personnel.subtypes.safety.data[1].value,
      操作人员: reportData.value.resources.personnel.subtypes.operator.data[1].value,
    },
    分离提纯区: {
      技术人员: reportData.value.resources.personnel.subtypes.technician.data[2].value,
      管理人员: reportData.value.resources.personnel.subtypes.manager.data[2].value,
      维修人员: reportData.value.resources.personnel.subtypes.maintenance.data[2].value,
      安全人员: reportData.value.resources.personnel.subtypes.safety.data[2].value,
      操作人员: reportData.value.resources.personnel.subtypes.operator.data[2].value,
    },
    成品储存区: {
      技术人员: reportData.value.resources.personnel.subtypes.technician.data[3].value,
      管理人员: reportData.value.resources.personnel.subtypes.manager.data[3].value,
      维修人员: reportData.value.resources.personnel.subtypes.maintenance.data[3].value,
      安全人员: reportData.value.resources.personnel.subtypes.safety.data[3].value,
      操作人员: reportData.value.resources.personnel.subtypes.operator.data[3].value,
    },
    公用工程区: {
      技术人员: reportData.value.resources.personnel.subtypes.technician.data[4].value,
      管理人员: reportData.value.resources.personnel.subtypes.manager.data[4].value,
      维修人员: reportData.value.resources.personnel.subtypes.maintenance.data[4].value,
      安全人员: reportData.value.resources.personnel.subtypes.safety.data[4].value,
      操作人员: reportData.value.resources.personnel.subtypes.operator.data[4].value,
    },
  }

  // 更新物料资源数据
  materialsData.materials = {
    原料储存区: {
      原料: reportData.value.resources.materials.subtypes.raw_material.data[0].value,
      催化剂: reportData.value.resources.materials.subtypes.catalyst.data[0].value,
      存储容量: reportData.value.resources.materials.subtypes.storage.data[0].value,
    },
    反应器区: {
      原料: reportData.value.resources.materials.subtypes.raw_material.data[1].value,
      催化剂: reportData.value.resources.materials.subtypes.catalyst.data[1].value,
      存储容量: reportData.value.resources.materials.subtypes.storage.data[1].value,
    },
    分离提纯区: {
      原料: reportData.value.resources.materials.subtypes.raw_material.data[2].value,
      催化剂: reportData.value.resources.materials.subtypes.catalyst.data[2].value,
      存储容量: reportData.value.resources.materials.subtypes.storage.data[2].value,
    },
    成品储存区: {
      原料: reportData.value.resources.materials.subtypes.raw_material.data[3].value,
      催化剂: reportData.value.resources.materials.subtypes.catalyst.data[3].value,
      存储容量: reportData.value.resources.materials.subtypes.storage.data[3].value,
    },
    公用工程区: {
      原料: reportData.value.resources.materials.subtypes.raw_material.data[4].value,
      催化剂: reportData.value.resources.materials.subtypes.catalyst.data[4].value,
      存储容量: reportData.value.resources.materials.subtypes.storage.data[4].value,
    },
  }

  // 更新电力资源数据
  electricityData.electricity = {
    原料储存区: reportData.value.resources.electricity.data[0].value,
    反应器区: reportData.value.resources.electricity.data[1].value,
    分离提纯区: reportData.value.resources.electricity.data[2].value,
    成品储存区: reportData.value.resources.electricity.data[3].value,
    公用工程区: reportData.value.resources.electricity.data[4].value,
  }
}

// 准备人力资源分配数据
const staffData = {
  staff: {
    原料储存区: {
      技术人员: 0,
      管理人员: 0,
      维修人员: 0,
      安全人员: 0,
      操作人员: 0,
    },
    反应器区: {
      技术人员: 0,
      管理人员: 0,
      维修人员: 0,
      安全人员: 0,
      操作人员: 0,
    },
    分离提纯区: {
      技术人员: 0,
      管理人员: 0,
      维修人员: 0,
      安全人员: 0,
      操作人员: 0,
    },
    成品储存区: {
      技术人员: 0,
      管理人员: 0,
      维修人员: 0,
      安全人员: 0,
      操作人员: 0,
    },
    公用工程区: {
      技术人员: 0,
      管理人员: 0,
      维修人员: 0,
      安全人员: 0,
      操作人员: 0,
    },
  },
  colors: {
    技术人员: '#5470C6',
    管理人员: '#91CC75',
    维修人员: '#FAC858',
    安全人员: '#EE6666',
    操作人员: '#73C0DE',
  },
}

// 注入展开状态
const isExpanded = inject<Ref<boolean>>('isChartExpanded', ref(false))

// 图表DOM引用
const chartRef = ref<HTMLElement | null>(null)
// 图表实例
let chartInstance: echarts.ECharts | null = null

// 资源类型控制
const currentChartType = ref(0) // 0:人力资源 1:物料资源 2:电力资源

// 资源类型标题
const resourceTitles = ['人力资源分布', '物料资源分布', '电力资源分布']

// 资源类型按钮数据
const resourceButtons = [
  { type: 0, label: '人力资源', icon: '👥' },
  { type: 1, label: '物料资源', icon: '🧪' },
  { type: 2, label: '电力资源', icon: '⚡' },
]

// 切换到指定图表类型
const switchChartType = (type: number) => {
  currentChartType.value = type
  // 确保完全清除前一个图表的数据
  updateChart()
}

// 类型定义
interface StaffData {
  staff: {
    [key: string]: {
      [key: string]: number
    }
  }
  colors: {
    [key: string]: string
  }
}

// 物料资源数据类型
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

// 电力资源数据类型
interface ElectricityData {
  electricity: {
    [key: string]: number
  }
  colors: {
    [key: string]: string
  }
}

// 准备物料资源分配数据
const materialsData = {
  materials: {
    原料储存区: {
      原料: 0,
      催化剂: 0,
      存储容量: 0,
    },
    反应器区: {
      原料: 0,
      催化剂: 0,
      存储容量: 0,
    },
    分离提纯区: {
      原料: 0,
      催化剂: 0,
      存储容量: 0,
    },
    成品储存区: {
      原料: 0,
      催化剂: 0,
      存储容量: 0,
    },
    公用工程区: {
      原料: 0,
      催化剂: 0,
      存储容量: 0,
    },
  },
  colors: {
    原料: '#4CAF50',
    催化剂: '#2196F3',
    存储容量: '#FFC107',
  },
}

// 准备电力资源分配数据
const electricityData = {
  electricity: {
    原料储存区: 0,
    反应器区: 0,
    分离提纯区: 0,
    成品储存区: 0,
    公用工程区: 0,
  },
  colors: {
    电力: '#9C27B0',
  },
}

// 类型断言
const typedStaffData = staffData as StaffData
const typedMaterialsData = materialsData as MaterialsData
const typedElectricityData = electricityData as ElectricityData

// 准备数据
const staffTypes = ['技术人员', '管理人员', '维修人员', '安全人员', '操作人员']
// 简化的图例名称（去除"人员"二字）
const simplifiedLegendNames = ['技术', '管理', '维修', '安全', '操作']
const workshops = Object.keys(typedStaffData.staff)

// 物料类型
const materialTypes = ['原料', '催化剂', '存储容量']

// 电力类型
const electricityTypes = ['电力']

// 获取根据展开状态决定的图例名称
const getLegendNames = () => {
  switch (currentChartType.value) {
    case 0: // 人力资源
      return isExpanded.value ? staffTypes : simplifiedLegendNames
    case 1: // 物料资源
      return materialTypes
    case 2: // 电力资源
      return electricityTypes
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
    case 0: // 人力资源
      // 人力资源从原料储存区流向展示的车间
      resourceType = params.seriesName
      fromWorkshop = '原料储存区'
      toWorkshop = workshop !== '原料储存区' ? workshop : '反应器区'
      break
    case 1: // 物料资源
      if (resourceType === '原料') {
        fromWorkshop = '原料储存区'
        toWorkshop = workshop !== '原料储存区' ? workshop : '反应器区'
      } else if (resourceType === '催化剂') {
        fromWorkshop = '公用工程区'
        toWorkshop = workshop !== '公用工程区' ? workshop : '反应器区'
      } else {
        fromWorkshop = workshop
        toWorkshop =
          workshop === '反应器区'
            ? '分离提纯区'
            : workshop === '分离提纯区'
              ? '成品储存区'
              : workshop === '成品储存区'
                ? '原料储存区'
                : '反应器区'
      }
      break
    case 2: // 电力资源
      fromWorkshop = '公用工程区'
      toWorkshop = workshop !== '公用工程区' ? workshop : '反应器区'
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
  unityService.sendMessageToUnity('Pipe', 'PipeHighlightOn', JSON.stringify(pipeData))

  // 构建文本框显示数据
  const displayData = {
    timestamp: new Date().toISOString(),
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
      source: COMPONENT_SOURCE, // 可选的消息来源标识
      title: `${resourceTitles[currentChartType.value]}`, // 设置特定标题
    },
  )
}

// 获取资源单位
const getUnitByResourceType = () => {
  switch (currentChartType.value) {
    case 0:
      return '人'
    case 1:
      return '吨'
    case 2:
      return 'kW'
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
    case 0: // 人力资源
      return [3, 10]
    case 1: // 物料资源
      return [100, 500]
    case 2: // 电力资源
      return [200, 1000]
    default:
      return null
  }
}

// 隐藏管道流动
const hidePipeFlow = () => {
  // 隐藏文本框
  messageStore.hideMessage(COMPONENT_SOURCE)
  // 发送消息到Unity隐藏管道
  unityService.sendMessageToUnity('Pipe', 'PipeHighlightOff', '')
}

// 将数据转换为echarts所需格式
const getSeriesData = () => {
  switch (currentChartType.value) {
    case 0: // 人力资源
      return staffTypes.map((type, index) => {
        return {
          name: isExpanded.value ? type : simplifiedLegendNames[index],
          type: 'bar' as const,
          stack: '总量',
          emphasis: {
            focus: 'series' as const,
          },
          itemStyle: {
            color: typedStaffData.colors[type],
          },
          // 修复重复 show 属性的问题
          label: {
            position: 'inside' as const,
            formatter: function (params: any) {
              // 在展开状态下且值大于3时显示标签
              if (isExpanded.value && params.value > 3) {
                return params.value.toFixed(2)
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
          data: workshops.map((workshop) => typedStaffData.staff[workshop][type]),
        }
      })
    case 1: // 物料资源
      return materialTypes.map((type) => {
        return {
          name: type,
          type: 'bar' as const,
          stack: '总量',
          emphasis: {
            focus: 'series' as const,
          },
          itemStyle: {
            color: typedMaterialsData.colors[type],
          },
          label: {
            position: 'inside' as const,
            formatter: function (params: any) {
              // 在展开状态下且值大于3时显示标签
              if (isExpanded.value && params.value > 3) {
                return params.value.toFixed(2)
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
          data: workshops.map((workshop) => typedMaterialsData.materials[workshop][type]),
        }
      })
    case 2: // 电力资源
      return electricityTypes.map((type) => {
        return {
          name: type,
          type: 'bar' as const,
          stack: '总量',
          emphasis: {
            focus: 'series' as const,
          },
          itemStyle: {
            color: typedElectricityData.colors[type],
          },
          label: {
            position: 'inside' as const,
            formatter: function (params: any) {
              // 在展开状态下且值大于3时显示标签
              if (isExpanded.value && params.value > 3) {
                return params.value.toFixed(2)
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
          data: workshops.map((workshop) => typedElectricityData.electricity[workshop]),
        }
      })
    default:
      return []
  }
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
        rich: {
          a: {
            backgroundColor: 'rgba(20, 40, 80, 0.7)', // 轴标签背景色
            padding: [4, 8], // 内边距
            borderRadius: 3, // 圆角
            color: 'rgba(220, 230, 240, 0.9)', // 文本颜色
          },
        },
      },
    },
    series: getSeriesData(),
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

// 组件挂载时初始化图表 - 修改监听algorithmStore
onMounted(async () => {
  // 文本框
  chartRef.value?.addEventListener('mouseleave', hidePipeFlow)

  // 加载报告数据
  await loadReportData()

  // 初始化图表
  initChart()

  // 添加窗口大小变化监听
  window.addEventListener('resize', () => {
    if (chartInstance) {
      chartInstance.resize()
    }
  })

  // 监听模块4的算法和参数变化
  watch(
    () => [
      algorithmStore.selectedAlgorithms[ModuleType.Module4],
      algorithmStore.algorithms[algorithmStore.selectedAlgorithms[ModuleType.Module4]]?.params,
    ],
    async () => {
      console.log('模块4配置已更新，重新加载数据')
      await loadReportData()
    },
    { deep: true },
  )
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
    <GraphHeader :title="'化工车间资源分布'">
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

    <!-- 资源类型切换按钮 - 改善样式 -->
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

<style lang="scss" scoped>
@use '@/assets/styles/StaffDistributionChart.scss';
</style>
