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
        const iconMap = ['🌐', '📡', '🔷', '🟢', '⚠️', '🔥']
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
        animationEasingUpdate: 'cubicO1ut',
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
            d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2M15.1,7.07C15.24,7.07 15.38,7.12 15.5,7.23L15.5,7.23L16.77,8.5C17,8.72 17,9.07 16.77,9.28L15.77,10.28L13.72,8.23L14.72,7.23C14.82,7.12 14.96,7.07 15.1,7.07M13.13,8.81L15.19,10.87L9.13,16.93H7.07V14.87L13.13,8.81Z"
          />
        </svg>
      </template>
      <template #actions v-if="focusedArea">
        <div class="focus-indicator" :class="{ compact: isChartExpanded }">
          <div class="pulse-dot"></div>
          <span>{{ focusedArea }}</span>
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

    <div class="graph-header-decoration">
      <div class="header-corner top-left"></div>
      <div class="header-corner top-right"></div>
      <div class="graph-header-glow"></div>
    </div>

    <div class="chart" ref="chartRef"></div>

    <!-- 控制按钮 -->
    <div class="graph-controls" :class="{ 'compact-controls': !isChartExpanded }">
      <button class="control-btn" :class="{ 'compact-btn': !isChartExpanded }" @click="toggleLabels">
        <span class="btn-icon">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M18.5,4L19.66,8.35L18.7,8.61C18.25,7.74 17.79,6.87 17.26,6.43C16.73,6 16.11,6 15.5,6H13V16.5C13,17 13,17.5 13.33,17.75C13.67,18 14.33,18 15,18V19H9V18C9.67,18 10.33,18 10.67,17.75C11,17.5 11,17 11,16.5V6H8.5C7.89,6 7.27,6 6.74,6.43C6.21,6.87 5.75,7.74 5.3,8.61L4.34,8.35L5.5,4H18.5Z"
            />
          </svg>
        </span>
        <span class="btn-text">{{ showAllLabels ? '隐藏标签' : '显示标签' }}</span>
      </button>
    </div>

    <!-- Unity全局聚焦按钮 -->
    <div
      class="unity-focus-btn"
      :class="{ focused: isUnityGlobalFocused }"
      @click="toggleUnityGlobalFocus"
      title="Unity全局聚焦"
    >
      <div class="unity-focus-icon">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M19,19H15V21H19A2,2 0 0,0 21,19V15H19M19,3H15V5H19V9H21V5A2,2 0 0,0 19,3M5,5H9V3H5A2,2 0 0,0 3,5V9H5M5,15H3V19A2,2 0 0,0 5,21H9V19H5V15Z"
          />
        </svg>
      </div>
      <span class="unity-focus-text">{{ isUnityGlobalFocused ? '取消全局聚焦' : '全局聚焦' }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/ChemicalKnowledgeGraph.scss';
</style>
