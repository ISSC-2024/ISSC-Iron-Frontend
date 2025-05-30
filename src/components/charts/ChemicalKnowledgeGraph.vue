<script setup lang="ts">
/**
 * @description 工厂监控点知识图谱组件
 */
import { ref, onMounted, onUnmounted, inject, watch } from 'vue'
import * as echarts from 'echarts'
// 引入 algorithmStore
import { useAlgorithmStore, ModuleType } from '@/stores/algorithmStore'
// 引入Pinia状态管理和类型定义
import { useGraphStore, type NodeData, type LinkData } from '@/stores/graphStore'
// 引入Unity通信服务
import unityService from '@/services/UnityService'
import GraphHeader from '../common/GraphHeader.vue'

// 获取图表容器展开状态
const isChartExpanded = inject('isChartExpanded', ref(false))

// 图表实例引用
const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

// 记录原始节点和连接，用于恢复显示
const originalNodes = ref<NodeData[]>([])
const originalLinks = ref<LinkData[]>([])
// 当前聚焦的区域
const focusedArea = ref<string | null>(null)
// Unity全局聚焦状态
const isUnityGlobalFocused = ref(false)
// Unity全局聚焦区域列表
const unityFocusAreas = ['PRO', 'REA', 'RMS', 'SEP', 'UTL']
// 控制标签显示状态
const showAllLabels = ref(false)

// 使用Pinia存储全局状态
const graphStore = useGraphStore()
// 使用算法状态管理
const algorithmStore = useAlgorithmStore()

// 存储加载的图谱数据
const graphData = ref<{
  nodes: NodeData[]
  links: LinkData[]
  categories: { name: string }[]
}>({
  nodes: [],
  links: [],
  categories: [],
})

// 节点类别颜色映射（每类颜色明显区分）
const categoryColors = [
  '#5470c6', // 区域 - 蓝色
  '#9a60b4', // 传感器 - 紫色
  '#00bcd4', // 数据项 - 青色
  '#67C23A', // 安全 - 绿色
  '#E6A23C', // 警告 - 橙色
  '#F56C6C', // 危险 - 红色
]

const nodeShapeMap = {
  0: 'circle', // 区域
  1: 'circle', // 传感器
  2: 'diamond', // 数据项
  3: 'circle', // 安全
  4: 'triangle', // 警告
  5: 'star', // 危险
}
const nodeFontColorMap: Record<number, string> = {
  0: '#1a237e',
  1: '#4a148c',
  2: '#006064',
  3: '#1b5e20',
  4: '#e65100',
  5: '#b71c1c',
}
const nodeBorderColorMap = {
  0: '#90caf9',
  1: '#ce93d8',
  2: '#80deea',
  3: '#a5d6a7',
  4: '#ffe082',
  5: '#ef9a9a',
}
const nodeShadowColorMap = {
  0: 'rgba(33,150,243,0.4)',
  1: 'rgba(156,39,176,0.3)',
  2: 'rgba(0,188,212,0.3)',
  3: 'rgba(76,175,80,0.3)',
  4: 'rgba(255,152,0,0.3)',
  5: 'rgba(244,67,54,0.3)',
}

// 发送高亮信息到Unity
const sendHighlightToUnity = (areaCode: string | null, highlight: boolean): void => {
  if (!areaCode) return // 如果没有区域代码，则直接返回

  // 构建基本消息结构
  const message: { highlight: boolean; area: string; nodes: Record<string, number> } = {
    highlight: highlight,
    area: areaCode || '',
    nodes: {},
  }

  // 查找该区域下的所有传感器
  const areaSensors = originalNodes.value.filter((node: NodeData) => node.category === 1 && node.area_code === areaCode)

  // 为每个传感器添加权重信息
  areaSensors.forEach((sensor: NodeData) => {
    if (sensor.id && sensor.weight !== undefined) {
      message.nodes[sensor.id.replace(`${areaCode}_`, '')] = Math.round(sensor.weight * 1000) / 1000
    }
  })

  // 发送消息到Unity
  const messageJson = JSON.stringify(message)
  console.log('向Unity发送消息:', messageJson)
  unityService.sendMessageToUnity('Sensor', 'KnowledgeHighlight', messageJson)
}

// 切换Unity全局聚焦状态
const toggleUnityGlobalFocus = () => {
  isUnityGlobalFocused.value = !isUnityGlobalFocused.value

  unityFocusAreas.forEach((areaCode) => {
    // 发送高亮或取消高亮消息
    sendHighlightToUnity(areaCode, isUnityGlobalFocused.value)
  })
}

// 加载数据
const loadGraphData = async () => {
  try {
    // 使用 algorithmStore 获取模块2的数据
    const knowledgeGraphModule = await algorithmStore.getModuleDataFile(ModuleType.Module2)

    if (knowledgeGraphModule && knowledgeGraphModule.default) {
      graphData.value = knowledgeGraphModule.default
      const currentAlgorithm = algorithmStore.getModuleSelectedAlgorithm(ModuleType.Module2)
      console.log(`成功加载知识图谱数据(${currentAlgorithm})`)

      // 加载数据后初始化图表
      initChart()
    } else {
      console.warn('知识图谱数据为空')
    }
  } catch (error) {
    console.error('加载知识图谱数据失败:', error)
  }
}

// 修改初始化图表方法
const initChart = () => {
  if (!chartRef.value || !graphData.value.nodes || !graphData.value.links) return

  // 销毁已有实例
  if (chart) {
    chart.dispose()
  }

  // 创建新实例
  chart = echarts.init(chartRef.value)

  // 确保在初始化时，判断展开状态并应用对应的图例样式

  // 深拷贝节点数据和连接数据，确保不修改原始数据
  const processedNodes = JSON.parse(JSON.stringify(graphData.value.nodes)).map((node: NodeData) => {
    switch (node.category) {
      case 0:
        node.itemStyle = {
          color: categoryColors[0],
          borderColor: nodeBorderColorMap[0],
          borderWidth: 3,
          shadowBlur: 30,
          shadowColor: nodeShadowColorMap[0],
        }
        node.symbol = nodeShapeMap[0]
        node.value = 800
        node.symbolSize = 80
        break
      case 1:
        node.itemStyle = {
          color: categoryColors[1],
          borderColor: nodeBorderColorMap[1],
          borderWidth: 3,
          shadowBlur: 25,
          shadowColor: nodeShadowColorMap[1],
        }
        node.symbol = nodeShapeMap[1]
        node.symbolSize = 60
        break
      case 2:
        node.itemStyle = {
          color: categoryColors[2],
          borderColor: nodeBorderColorMap[2],
          borderWidth: 3,
          shadowBlur: 20,
          shadowColor: nodeShadowColorMap[2],
        }
        node.symbol = nodeShapeMap[2]
        node.symbolSize = 50
        break
      case 3:
        node.itemStyle = {
          color: categoryColors[3],
          borderColor: nodeBorderColorMap[3],
          borderWidth: 3,
          shadowBlur: 20,
          shadowColor: nodeShadowColorMap[3],
        }
        node.symbol = nodeShapeMap[3]
        // 安全：weight越小越大，30~60
        node.symbolSize = 30 + (60 - 30) * (1 - (typeof node.weight === 'number' ? node.weight : 0))
        break
      case 4:
        node.itemStyle = {
          color: categoryColors[4],
          borderColor: nodeBorderColorMap[4],
          borderWidth: 3,
          shadowBlur: 20,
          shadowColor: nodeShadowColorMap[4],
        }
        node.symbol = nodeShapeMap[4]
        // 警告：weight=0.5最大，0/1最小，25~50
        node.symbolSize = 25 + (50 - 25) * (1 - Math.abs((typeof node.weight === 'number' ? node.weight : 0) - 0.5) * 2)
        break
      case 5:
        node.itemStyle = {
          color: categoryColors[5],
          borderColor: nodeBorderColorMap[5],
          borderWidth: 3,
          shadowBlur: 25,
          shadowColor: nodeShadowColorMap[5],
        }
        node.symbol = nodeShapeMap[5]
        // 危险：weight越大越大，30~60
        node.symbolSize = 30 + (60 - 30) * (typeof node.weight === 'number' ? node.weight : 0)
        break
    }
    return node
  })

  // 保存原始数据以便后续恢复
  originalNodes.value = JSON.parse(JSON.stringify(processedNodes))

  // 处理连接线，设置统一颜色和宽度
  const processedLinks = JSON.parse(JSON.stringify(graphData.value.links)).map((link: LinkData) => {
    let width = 2,
      type = 'solid'
    if (typeof link.source === 'string' && typeof link.target === 'string') {
      if (link.source.length <= 3 && link.target.length <= 3) {
        width = 3
        type = 'dashed'
      } else if (link.source.length <= 3 && link.target.includes('_')) {
        width = 2.5
        type = 'solid'
      } else if (link.target && link.target.includes('_danger')) {
        width = 3
        type = 'solid'
      } else if (link.target && link.target.includes('_warning')) {
        width = 2.5
        type = 'dotted'
      } else if (link.target && link.target.includes('_safe')) {
        width = 2.5
        type = 'dotted'
      } else if (link.target && link.target.includes('_')) {
        width = 2
        type = 'solid'
      }
    }
    link.lineStyle = {
      color: '#aaa',
      width,
      type,
      shadowBlur: 8,
    }
    return link
  })

  // 保存原始连接以便后续恢复
  originalLinks.value = JSON.parse(JSON.stringify(processedLinks))

  // 根据当前状态决定显示内容
  let displayNodes: NodeData[], displayLinks: LinkData[], zoomLevel: number, shouldShowLabels: boolean

  if (graphStore.focusedArea) {
    // 如果已聚焦，使用过滤后的数据
    if (graphStore.filteredNodes.length === 0) {
      // 如果没有过滤数据，重新过滤
      console.log('重新生成过滤数据...')
      const { nodes, links } = getFilteredNodesAndLinks(graphStore.focusedArea)
      graphStore.setFilteredData(nodes, links)
    }

    displayNodes = graphStore.filteredNodes
    displayLinks = graphStore.filteredLinks
    zoomLevel = 0.4
    shouldShowLabels = true // 聚焦时显示标签
  } else {
    // 未聚焦，显示全部数据
    displayNodes = processedNodes
    displayLinks = processedLinks
    zoomLevel = 0.15
    shouldShowLabels = graphStore.showLabels // 根据全局标签设置决定
  }

  // 设置图表选项 - 确保即使在初始化时也应用正确的图例样式
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: '#90caf9',
      borderWidth: 1,
      textStyle: {
        color: '#222',
        fontWeight: 'bold',
        fontSize: 14,
        fontFamily: 'Microsoft YaHei',
        textShadowColor: '#b3c6f7',
        textShadowBlur: 2,
      },
      extraCssText: 'box-shadow:0 4px 24px 0 rgba(33,150,243,0.12);border-radius:10px;',
      formatter: (params: any) => {
        const iconMap = ['🌐', '��️', '🔷', '🟢', '⚠️', '🔥']
        if (params.dataType === 'node') {
          const data = params.data as NodeData
          return `<div style="min-width:120px;padding:2px 0 2px 0;">
            <span style="font-size:18px;">${iconMap[data.category] || '●'}</span> <b>${data.name}</b><br/>
            <span style="color:#888;">${['区域', '传感器', '数据项', '安全', '警告', '危险'][data.category]}</span><br/>
            ${data.area ? `区域: ${data.area}<br/>` : ''}
            ${data.sensor_type ? `传感器: ${data.sensor_type}<br/>` : ''}
            ${data.data_item ? `数据项: ${data.data_item}<br/>` : ''}
            ${typeof data.weight === 'number' ? `风险值: <b style='color:#F56C6C;'>${(data.weight * 100).toFixed(2)}%</b><br/>` : ''}
          </div>`
        } else if (params.dataType === 'edge') {
          return `<div style='color:#1976d2;'>连接强度: ${params.data.value}</div>`
        }
        return ''
      },
    },
    legend: {
      type: 'scroll',
      orient: 'vertical',
      right: isChartExpanded.value ? 10 : 5,
      top: isChartExpanded.value ? 20 : 10,
      textStyle: {
        fontSize: isChartExpanded.value ? 12 : 10,
        color: 'rgba(220, 230, 240, 0.9)',
      },
      itemWidth: isChartExpanded.value ? 25 : 15,
      itemHeight: isChartExpanded.value ? 14 : 8,
      itemGap: isChartExpanded.value ? 10 : 5,
      padding: isChartExpanded.value ? [5, 10] : [2, 5],
      backgroundColor: 'rgba(20, 35, 65, 0.8)',
      borderColor: 'rgba(32, 160, 255, 0.3)',
      borderWidth: isChartExpanded.value ? 1 : 0,
      borderRadius: 4,
      shadowColor: 'rgba(0, 0, 0, 0.3)',
      shadowBlur: isChartExpanded.value ? 10 : 0,
      formatter: function (name: any) {
        // 在非展开状态下截断过长的名称
        if (!isChartExpanded.value && name.length > 6) {
          return name.substring(0, 5) + '...'
        }
        return name
      },
    },
    animationDuration: 1800,
    animationEasingUpdate: 'cubicOut',
    backgroundColor: 'transparent',
    series: [
      {
        id: 'knowledge-graph',
        name: '工厂监控点知识图谱',
        type: 'graph',
        layout: 'force',
        data: displayNodes,
        links: displayLinks,
        categories: graphData.value.categories.map((category: { name: string }, index: number) => ({
          ...category,
          itemStyle: {
            color: categoryColors[index],
          },
        })),
        roam: true,
        zoom: zoomLevel,
        center: ['50%', '50%'],
        label: {
          show: shouldShowLabels,
          position: 'right',
          fontWeight: 'bold',
          fontSize: 16,
          color: (params: any) => nodeFontColorMap[params.data.category] || '#333',
          textShadowColor: '#fff',
          textShadowBlur: 4,
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: [4, 8],
          borderRadius: 4,
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.15)',
        },
        color: categoryColors,
        force: {
          repulsion: graphStore.focusedArea ? 2800 : [2200, 3500],
          edgeLength: graphStore.focusedArea ? 400 : [250, 500],
          gravity: 0.02,
          layoutAnimation: true,
          friction: 0.92,
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [4, 12],
        edgeLabel: {
          show: false,
        },
        lineStyle: {
          opacity: 0.85,
          curveness: 0.25,
          color: (params: any) => {
            // 根据source/target动态生成渐变色
            const { source, target } = params.data
            let colorFrom = '#b3c6f7',
              colorTo = '#f7b3b3'
            if (typeof source === 'string' && typeof target === 'string') {
              if (source.length <= 3 && target.length <= 3) {
                colorFrom = '#b3c6f7'
                colorTo = '#b3e5fc'
              } else if (source.length <= 3 && target.includes('_')) {
                colorFrom = '#b3c6f7'
                colorTo = '#ce93d8'
              } else if (target && target.includes('_danger')) {
                colorFrom = '#f7b3b3'
                colorTo = '#F56C6C'
              } else if (target && target.includes('_warning')) {
                colorFrom = '#ffe082'
                colorTo = '#E6A23C'
              } else if (target && target.includes('_safe')) {
                colorFrom = '#a5d6a7'
                colorTo = '#67C23A'
              } else if (target && target.includes('_')) {
                colorFrom = '#80deea'
                colorTo = '#00bcd4'
              }
            }
            return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: colorFrom },
              { offset: 1, color: colorTo },
            ])
          },
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: {
            width: 8,
            shadowColor: '#1976d2',
            shadowBlur: 16,
          },
          scale: true,
          itemStyle: {
            borderColor: '#1976d2',
            borderWidth: 5,
            shadowBlur: 30,
            shadowColor: '#1976d2',
          },
          label: {
            fontSize: 20,
            color: '#1976d2',
            fontWeight: 'bolder',
          },
        },
        focusNodeAdjacency: true,
        draggable: true,
        animation: true,
        animationDurationUpdate: 1200,
        animationEasingUpdate: 'cubicOut',
      },
    ],
  }

  // 应用选项
  chart.setOption(option as echarts.EChartsOption)

  // 同步本地组件状态和Pinia状态
  focusedArea.value = graphStore.focusedArea
  showAllLabels.value = graphStore.showLabels

  // 双击事件 - 区域节点聚焦
  chart.on('dblclick', (params: any) => {
    if (params.dataType === 'node') {
      const nodeData = params.data

      if (nodeData.category === 0) {
        // 如果双击的是区域节点
        const areaCode = nodeData.id

        // 判断是否已经聚焦在该区域，如果是则恢复全部显示
        if (graphStore.focusedArea === areaCode) {
          restoreFullGraph()
          return
        }

        // 记录当前聚焦的区域（更新Pinia状态）
        graphStore.setFocusedArea(areaCode)
        focusedArea.value = areaCode

        // 向Unity发送高亮信息
        sendHighlightToUnity(areaCode, true)

        // 过滤出需要显示的节点和连接
        focusOnArea(areaCode)
      } else {
        // 对于非区域节点的双击，高亮关联节点和边
        chart?.dispatchAction({
          type: 'focusNodeAdjacency',
          seriesIndex: 0,
          dataIndex: params.dataIndex,
        })

        // 临时显示标签
        chart?.setOption({
          series: [
            {
              id: 'knowledge-graph',
              label: {
                show: true,
              },
            },
          ],
        })

        // 3秒后隐藏标签，除非全局标签显示已开启或有聚焦区域
        setTimeout(() => {
          if (!graphStore.showLabels && !graphStore.focusedArea) {
            chart?.setOption({
              series: [
                {
                  id: 'knowledge-graph',
                  label: {
                    show: false,
                  },
                },
              ],
            })
          }
        }, 3000)
      }
    }
  })
}

// 获取过滤后的节点和连接数据（适配四级结构）
const getFilteredNodesAndLinks = (areaId: string): { nodes: NodeData[]; links: LinkData[] } => {
  if (!originalNodes.value.length || !originalLinks.value.length) {
    return { nodes: [], links: [] }
  }
  // 找出该区域下的所有传感器节点ID
  const areaSensors = originalNodes.value
    .filter((node: NodeData) => node.category === 1 && node.id.startsWith(areaId + '_'))
    .map((node: NodeData) => node.id)
  // 找出该区域下所有数据项节点ID
  const areaDataItems = originalNodes.value
    .filter(
      (node: NodeData) => node.category === 2 && areaSensors.some((sensorId) => node.id.startsWith(sensorId + '_')),
    )
    .map((node: NodeData) => node.id)
  // 找出该区域下所有风险节点ID
  const areaRiskNodes = originalNodes.value
    .filter(
      (node: NodeData) =>
        [3, 4, 5].includes(node.category) && areaDataItems.some((dataItemId) => node.id.startsWith(dataItemId + '_')),
    )
    .map((node: NodeData) => node.id)
  // 添加需要显示的节点ID集合
  const showNodeIds = new Set<string>()
  showNodeIds.add(areaId)
  areaSensors.forEach((id) => showNodeIds.add(id))
  areaDataItems.forEach((id) => showNodeIds.add(id))
  areaRiskNodes.forEach((id) => showNodeIds.add(id))
  // 过滤需要显示的节点
  const filteredNodes = originalNodes.value.filter((node: NodeData) => showNodeIds.has(node.id))
  // 过滤需要显示的连接
  const filteredLinks = originalLinks.value.filter(
    (link: LinkData) => showNodeIds.has(link.source as string) && showNodeIds.has(link.target as string),
  )
  return { nodes: filteredNodes, links: filteredLinks }
}

// 切换标签显示状态
const toggleLabels = (): void => {
  // 如果当前有聚焦区域，不执行任何操作
  if (graphStore.focusedArea) {
    return
  }

  // 更新Pinia状态
  graphStore.toggleLabels()

  // 同步本地状态
  showAllLabels.value = graphStore.showLabels

  if (chart) {
    chart.setOption({
      series: [
        {
          id: 'knowledge-graph',
          label: {
            show: graphStore.showLabels,
          },
        },
      ],
    })
  }
}

// 聚焦到特定区域，并显示标签
const focusOnArea = (areaCode: string): void => {
  if (!chart || !originalNodes.value.length || !originalLinks.value.length) return

  // 获取过滤后的节点和连接
  const { nodes, links } = getFilteredNodesAndLinks(areaCode)

  // 保存过滤后的数据到Pinia状态
  graphStore.setFilteredData(nodes, links)

  // 更新图表数据，始终显示所有保留节点的标签
  chart.setOption({
    series: [
      {
        id: 'knowledge-graph',
        data: nodes,
        links: links,
        zoom: 0.3,
        center: ['50%', '50%'],
        label: {
          show: true,
          position: 'right',
          formatter: (params: { data: NodeData }) => {
            const node = params.data
            if (node.category === 0) return node.name
            if (node.category === 1) return node.name
            if (node.category === 2) return node.name
            if ([3, 4, 5].includes(node.category)) return node.name
            return node.name
          },
          color: '#333',
          backgroundColor: 'rgba(255,255,255,0.7)',
          padding: [3, 5],
          borderRadius: 3,
        },
        force: {
          repulsion: 2500,
          edgeLength: 350,
        },
      },
    ],
  })
}

// 恢复显示完整图表，同时隐藏标签（除非全局标签显示已开启）
const restoreFullGraph = (): void => {
  if (!chart || !originalNodes.value.length || !originalLinks.value.length) return

  // 向Unity发送取消高亮信息
  sendHighlightToUnity(graphStore.focusedArea, false)

  // 清除聚焦状态（更新Pinia状态）
  graphStore.setFocusedArea(null)
  focusedArea.value = null

  // 清除过滤数据
  graphStore.clearFilteredData()

  chart.setOption({
    series: [
      {
        id: 'knowledge-graph',
        data: originalNodes.value,
        links: originalLinks.value,
        zoom: 0.15, // 恢复原始缩放
        center: ['50%', '50%'],
        label: {
          show: graphStore.showLabels,
        },
        force: {
          repulsion: [2000, 3000],
          edgeLength: [200, 400],
        },
      },
    ],
  })
}

// 应用当前状态 - 恢复当前聚焦状态或全部显示
const applyCurrentState = (): void => {
  if (!chart) return

  // 如果有聚焦区域但没有过滤后的数据，重新获取
  if (graphStore.focusedArea && (!graphStore.filteredNodes.length || !graphStore.filteredLinks.length)) {
    const { nodes, links } = getFilteredNodesAndLinks(graphStore.focusedArea)
    graphStore.setFilteredData(nodes, links)
  }

  // 根据当前状态决定显示内容
  const displayNodes = graphStore.focusedArea ? graphStore.filteredNodes : originalNodes.value
  const displayLinks = graphStore.focusedArea ? graphStore.filteredLinks : originalLinks.value

  chart.setOption({
    series: [
      {
        id: 'knowledge-graph',
        data: displayNodes,
        links: displayLinks,
        zoom: graphStore.focusedArea ? 0.4 : 0.15,
        label: {
          show: graphStore.focusedArea ? true : graphStore.showLabels,
          position: 'right',
          formatter: (params: { data: NodeData }) => {
            const node = params.data
            if (!node) return ''
            if (node.category === 0) return node.name
            if (node.category === 1) return node.name
            if (node.category === 2) return node.name
            if ([3, 4, 5].includes(node.category)) return node.name
            return node.name
          },
          color: '#333',
          backgroundColor: 'rgba(255,255,255,0.7)',
          padding: [3, 5],
          borderRadius: 3,
        },
        force: {
          repulsion: graphStore.focusedArea ? 2500 : [2000, 3000],
          edgeLength: graphStore.focusedArea ? 350 : [200, 400],
        },
      },
    ],
  })
}

// 监听窗口大小变化
const handleResize = (): void => {
  if (chart) {
    const expanded = isChartExpanded.value

    // 调整图例样式
    chart.setOption({
      legend: {
        right: expanded ? 10 : 5,
        top: expanded ? 20 : 10,
        textStyle: {
          fontSize: expanded ? 12 : 10,
        },
        itemWidth: expanded ? 25 : 15,
        itemHeight: expanded ? 14 : 8,
        itemGap: expanded ? 10 : 5,
        padding: expanded ? [5, 10] : [2, 5],
        borderWidth: expanded ? 1 : 0,
        shadowBlur: expanded ? 10 : 0,
      },
    })

    chart.resize()

    // 调整大小后重新应用当前状态
    setTimeout(() => {
      applyCurrentState()
    }, 100)
  }
}

// 监听展开状态变化，同时调整图例大小
watch(isChartExpanded, (expanded) => {
  // 延迟执行以等待DOM更新
  setTimeout(() => {
    // 如果图表实例不存在，初始化图表
    if (!chart) {
      initChart()
      return
    }

    // 调整图例样式
    chart.setOption({
      legend: {
        right: expanded ? 10 : 5,
        top: expanded ? 20 : 10,
        textStyle: {
          fontSize: expanded ? 12 : 10, // 非展开时使用更小的字体
          color: 'rgba(220, 230, 240, 0.9)',
        },
        itemWidth: expanded ? 25 : 15, // 非展开时使用更小的图例标记
        itemHeight: expanded ? 14 : 8,
        itemGap: expanded ? 10 : 5, // 减小项目间距
        padding: expanded ? [5, 10] : [2, 5], // 减小内边距
        borderWidth: expanded ? 1 : 0, // 非展开时移除边框
        shadowBlur: expanded ? 10 : 0, // 非展开时移除阴影
      },
    })

    // 调整图表大小
    chart.resize()

    // 应用当前状态
    applyCurrentState()
  }, 300)
})

// 添加对算法变化的监听
watch(
  () => [
    algorithmStore.selectedAlgorithms[ModuleType.Module2],
    algorithmStore.algorithms[algorithmStore.selectedAlgorithms[ModuleType.Module2]]?.params,
  ],
  () => {
    console.log('模块2配置已更新，重新加载知识图谱数据')
    loadGraphData()
  },
  { deep: true },
)

// 生命周期钩子
onMounted(() => {
  // 修改为先加载数据，再由loadGraphData中调用initChart
  loadGraphData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chart) {
    chart.dispose()
    chart = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="knowledge-graph-container">
    <GraphHeader :title="'工厂监控点知识图谱'">
      <template #icon>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12,2C17.5,2 22,6.5 22,12C22,17.5 17.5,22 12,22C6.5,22 2,17.5 2,12C2,6.5 6.5,2 12,2M12,4C7.58,4 4,7.58 4,12C4,16.42 7.58,20 12,20C16.42,20 20,16.42 20,12C20,7.58 16.42,4 12,4M12,6C15.31,6 18,8.69 18,12C18,15.31 15.31,18 12,18C8.69,18 6,15.31 6,12C6,8.69 8.69,6 12,6M12,8C9.79,8 8,9.79 8,12C8,14.21 9.79,16 12,16C14.21,16 16,14.21 16,12C16,9.79 14.21,8 12,8Z"
          />
        </svg>
      </template>
      <template #extra>
        <div v-if="graphStore.focusedArea" class="focus-indicator" :class="{ compact: !isChartExpanded }">
          <div class="pulse-dot"></div>
          <span>已聚焦: {{ graphStore.focusedArea }}</span>
          <button class="clear-focus-btn" @click="restoreFullGraph" title="清除聚焦">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path
                fill="currentColor"
                d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
              />
            </svg>
          </button>
        </div>
      </template>
    </GraphHeader>

    <div ref="chartRef" class="chart"></div>

    <!-- 仅在展开状态下显示控制面板 -->
    <div v-if="isChartExpanded" class="graph-controls">
      <button
        class="control-btn toggle-labels-btn"
        @click="toggleLabels"
        :disabled="!!graphStore.focusedArea"
        :class="{ disabled: !!graphStore.focusedArea }"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" class="btn-icon">
          <path
            fill="currentColor"
            d="M9.5,7A1.5,1.5 0 0,1 11,8.5A1.5,1.5 0 0,1 9.5,10A1.5,1.5 0 0,1 8,8.5A1.5,1.5 0 0,1 9.5,7M14,4.5A1.5,1.5 0 0,1 15.5,6A1.5,1.5 0 0,1 14,7.5A1.5,1.5 0 0,1 12.5,6A1.5,1.5 0 0,1 14,4.5M17,2A2,2 0 0,1 19,4A2,2 0 0,1 17,6A2,2 0 0,1 15,4A2,2 0 0,1 17,2M19.5,9A1.5,1.5 0 0,1 21,10.5A1.5,1.5 0 0,1 19.5,12A1.5,1.5 0 0,1 18,10.5A1.5,1.5 0 0,1 19.5,9M17,20A2,2 0 0,1 15,18A2,2 0 0,1 17,16A2,2 0 0,1 19,18A2,2 0 0,1 17,20M7,18A2,2 0 0,1 5,16A2,2 0 0,1 7,14A2,2 0 0,1 9,16A2,2 0 0,1 7,18M7,4A2,2 0 0,1 9,6A2,2 0 0,1 7,8A2,2 0 0,1 5,6A2,2 0 0,1 7,4M9.5,17A1.5,1.5 0 0,1 8,15.5A1.5,1.5 0 0,1 9.5,14A1.5,1.5 0 0,1 11,15.5A1.5,1.5 0 0,1 9.5,17M14,12.5A1.5,1.5 0 0,1 15.5,14A1.5,1.5 0 0,1 14,15.5A1.5,1.5 0 0,1 12.5,14A1.5,1.5 0 0,1 14,12.5M9.5,20.5A0.5,0.5 0 0,1 9,20A0.5,0.5 0 0,1 9.5,19.5A0.5,0.5 0 0,1 10,20A0.5,0.5 0 0,1 9.5,20.5M4.5,19.5A0.5,0.5 0 0,1 4,19A0.5,0.5 0 0,1 4.5,18.5A0.5,0.5 0 0,1 5,19A0.5,0.5 0 0,1 4.5,19.5M19.5,19.5A0.5,0.5 0 0,1 19,19A0.5,0.5 0 0,1 19.5,18.5A0.5,0.5 0 0,1 20,19A0.5,0.5 0 0,1 19.5,19.5M14.5,19.5A0.5,0.5 0 0,1 14,19A0.5,0.5 0 0,1 14.5,18.5A0.5,0.5 0 0,1 15,19A0.5,0.5 0 0,1 14.5,19.5M4.5,14.5A0.5,0.5 0 0,1 4,14A0.5,0.5 0 0,1 4.5,13.5A0.5,0.5 0 0,1 5,14A0.5,0.5 0 0,1 4.5,14.5M19.5,14.5A0.5,0.5 0 0,1 19,14A0.5,0.5 0 0,1 19.5,13.5A0.5,0.5 0 0,1 20,14A0.5,0.5 0 0,1 19.5,14.5M4.5,9.5A0.5,0.5 0 0,1 4,9A0.5,0.5 0 0,1 4.5,8.5A0.5,0.5 0 0,1 5,9A0.5,0.5 0 0,1 4.5,9.5M19.5,9.5A0.5,0.5 0 0,1 19,9A0.5,0.5 0 0,1 19.5,8.5A0.5,0.5 0 0,1 20,9A0.5,0.5 0 0,1 19.5,9.5M4.5,4.5A0.5,0.5 0 0,1 4,4A0.5,0.5 0 0,1 4.5,3.5A0.5,0.5 0 0,1 5,4A0.5,0.5 0 0,1 4.5,4.5M14.5,4.5A0.5,0.5 0 0,1 14,4A0.5,0.5 0 0,1 14.5,3.5A0.5,0.5 0 0,1 15,4A0.5,0.5 0 0,1 14.5,4.5M19.5,4.5A0.5,0.5 0 0,1 19,4A0.5,0.5 0 0,1 19.5,3.5A0.5,0.5 0 0,1 20,4A0.5,0.5 0 0,1 19.5,4.5M9.5,4.5A0.5,0.5 0 0,1 9,4A0.5,0.5 0 0,1 9.5,3.5A0.5,0.5 0 0,1 10,4A0.5,0.5 0 0,1 9.5,4.5Z"
          />
        </svg>
        <span>{{ graphStore.focusedArea ? '标签已显示' : graphStore.showLabels ? '隐藏标签' : '显示标签' }}</span>
      </button>

      <div class="graph-legend">
        <div class="legend-item" v-for="(category, index) in graphData.categories" :key="category.name">
          <div class="legend-color" :style="{ backgroundColor: categoryColors[index] }"></div>
          <div class="legend-label">{{ category.name }}</div>
        </div>
      </div>
    </div>

    <!-- 仅在展开状态下显示操作指南 -->
    <div v-if="isChartExpanded" class="graph-info-panel">
      <div class="info-title">操作指南</div>
      <div class="info-content">
        <div class="info-item">
          <div class="info-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M9,5H15V9H9V5M7,3V11H17V3H7M11,13H13V17H11V13M7,21H17V11H7V21Z" />
            </svg>
          </div>
          <span>双击区域节点以聚焦该区域</span>
        </div>
        <div class="info-item">
          <div class="info-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13,7H11V13H17V11H13V7Z"
              />
            </svg>
          </div>
          <span>双击已聚焦的区域可恢复全图</span>
        </div>
        <div class="info-item">
          <div class="info-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z"
              />
            </svg>
          </div>
          <span>悬停在节点上查看详细信息</span>
        </div>
        <div class="info-item">
          <div class="info-icon">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M16.56,5.44L15.11,6.89C16.84,7.94 18,9.83 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12C6,9.83 7.16,7.94 8.88,6.88L7.44,5.44C5.36,6.88 4,9.28 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12C20,9.28 18.64,6.88 16.56,5.44M13,3H11V13H13"
              />
            </svg>
          </div>
          <span>点击右上角图例可显示/隐藏不同类型节点</span>
        </div>
      </div>
    </div>

    <!-- 非展开状态下的提示  -->
    <div v-if="!isChartExpanded" class="mini-tip">
      <div class="mini-tip-icon">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path
            fill="currentColor"
            d="M13,9H11V7H13M13,17H11V11H13V17M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
          />
        </svg>
      </div>
      <span>展开查看更多</span>
    </div>

    <!-- 非展开状态下的Unity聚焦按钮 -->
    <button
      v-if="!isChartExpanded"
      class="unity-focus-btn"
      :class="{ focused: isUnityGlobalFocused }"
      @click.stop="toggleUnityGlobalFocus"
    >
      <div class="unity-focus-icon">
        <svg viewBox="0 0 24 24" width="16" height="16">
          <!-- 根据状态显示不同的图标 -->
          <path
            fill="currentColor"
            v-if="!isUnityGlobalFocused"
            d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5Z"
          />
          <!-- 已聚焦状态图标 -->
          <path
            fill="currentColor"
            v-else
            d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M13.5,7V5.5C17.33,6.23 20,8.83 20,12C20,15.17 17.33,17.77 13.5,18.5V17C16.25,16.3 18.3,14.25 18.3,12C18.3,9.75 16.25,7.7 13.5,7M6.5,12C6.5,9.75 8.17,7.8 10.5,7.08V5.55C7.11,6.33 5,8.92 5,12C5,15.08 7.11,17.67 10.5,18.45V16.93C8.17,16.2 6.5,14.25 6.5,12Z"
          />
        </svg>
      </div>
      <span class="unity-focus-text">{{ isUnityGlobalFocused ? '取消在Unity聚焦' : '在Unity中聚焦' }}</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/ChemicalKnowledgeGraph.scss';
</style>
