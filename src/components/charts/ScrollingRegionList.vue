<template>
  <!--
   * @description 区域风险滚动列表组件
   *
   * 该组件显示区域的实时风险数据列表，包括时间戳、区域和安全状态。
   * 包含以下功能：
   * 1. 非展开状态下自动滚动显示区域数据
   * 2. 展开状态下显示全部区域数据，可滚动查看
   * 3. 根据风险级别自动显示不同颜色的状态指示器（安全/警告/危险）
   * 4. 响应式布局设计，适应不同显示状态
   * 5. 带有固定表头的数据列表
   * 6. 与Unity交互：鼠标悬停高亮区域，离开取消高亮，点击持续高亮/再次点击取消高亮
   *
   -->
  <div class="scrolling-list-container" :class="{ expanded: isExpanded }">
    <GraphHeader :title="'区域状态实时监控'" :centered="true" :glow-effect="true">
      <template #icon>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
          />
        </svg>
      </template>
      <template #actions>
        <button v-if="isExpanded" class="export-button" @click="handleExport">
          <download-outlined />
          <span>导出</span>
        </button>
      </template>
    </GraphHeader>

    <div class="scrolling-list-header">
      <div class="header-item">
        <clock-circle-outlined />
        <span>时间戳</span>
      </div>
      <div class="header-item">
        <environment-outlined />
        <span>受影响区域</span>
      </div>
      <div class="header-item">
        <safety-outlined />
        <span>安全预警</span>
      </div>
    </div>

    <div class="scrolling-list-body" ref="listBody">
      <!-- 加载状态提示 -->
      <div v-if="isLoading" class="loading-indicator">
        <span>正在加载数据...</span>
      </div>
      <div v-else-if="visibleRegions.length === 0" class="empty-data">
        <span>暂无区域数据</span>
      </div>
      <template v-else>
        <div
          v-for="(region, index) in visibleRegions"
          :key="index"
          class="list-row"
          :class="{
            'row-selected': isRegionSelected(region),
            'row-alt': index % 2 === 1,
          }"
          @mouseenter="handleRegionHover(region)"
          @mouseleave="handleRegionLeave(region)"
          @click="handleRegionClick(region)"
        >
          <div class="list-item list-time">
            <clock-circle-outlined class="item-icon" />
            <span>{{ region.timestamp }}</span>
          </div>
          <div class="list-item list-region">
            <environment-outlined class="item-icon" />
            <span>{{ region.regions.join('、') }}</span>
          </div>
          <div class="list-item">
            <div
              class="status-indicator"
              :class="{
                'status-safe': region.risk_level === 'safe',
                'status-warning': region.risk_level === 'warning',
                'status-danger': region.risk_level === 'danger',
              }"
            >
              <check-circle-outlined v-if="region.risk_level === 'safe'" />
              <warning-outlined v-else-if="region.risk_level === 'warning'" />
              <exclamation-circle-outlined v-else-if="region.risk_level === 'danger'" />
              <span>{{ getRiskLevelText(region.risk_level) }}</span>
              <!-- 显示场景数量指示器 -->
              <span v-if="region.scenarios && region.scenarios.length > 0" class="scenario-count">
                ({{ region.scenarios.length }}个场景)
              </span>
            </div>
          </div>
        </div>

        <!-- "加载更多"触发器元素 -->
        <div v-if="isExpanded" ref="loadTriggerRef" class="load-more-trigger">
          <div v-if="isLoadingMore" class="loading-more">
            <span>加载更多...</span>
          </div>
          <div v-else-if="!hasMore" class="no-more-data">
            <span>没有更多数据</span>
          </div>
        </div>
      </template>
    </div>
  </div>
  <TextMessageDisplayBox />
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, onUnmounted, nextTick } from 'vue'
import { useAlgorithmStore, ModuleType, AlgorithmType } from '@/stores/algorithmStore'
import unityService from '@/services/UnityService'
import { message } from 'ant-design-vue'
// 导入文本框组件和消息管理
import TextMessageDisplayBox from '../controls/windows/TextMessageDisplayBox.vue'
import { useMessageStore } from '@/stores/messageStore'
import Algorithm3Api, { type DownloadCsvParams } from '@/apis/Algorithm3'
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons-vue'
import GraphHeader from '../common/GraphHeader.vue'

// 使用算法数据 store
const algorithmStore = useAlgorithmStore()

interface RegionScenario {
  feature: string
  name: string
  description: string
  impact: string
  action: string
}

interface RegionAnomalyData {
  timestamp: string
  anomaly_score: number
  is_anomaly: number
  risk_level: string
  risk_color: string
  affected_areas: string[]
  anomaly_features: string[]
  scenario_count: number
  scenarios: RegionScenario[]
}

interface Region {
  timestamp: string
  regions: string[] // 改为区域数组
  risk_level: 'safe' | 'warning' | 'danger'
  message: string
  anomaly_data?: RegionAnomalyData
  scenarios?: RegionScenario[]
}

// Unity通信数据结构
interface UnityData {
  regions: string[] // 改为区域数组
  risk_level: string
  message: string
}

// 根据风险级别返回对应的中文文本
const getRiskLevelText = (riskLevel: string): string => {
  switch (riskLevel) {
    case '安全':
    case 'safe':
      return '安全'
    case '警告':
    case 'warning':
      return '警告'
    case '危险':
    case 'danger':
      return '危险'
    default:
      return '未知'
  }
}

// 根据风险级别返回对应的英文值
const getRiskLevelKey = (riskLevel: string): 'safe' | 'warning' | 'danger' => {
  switch (riskLevel) {
    case '安全':
      return 'safe'
    case '警告':
      return 'warning'
    case '危险':
      return 'danger'
    default:
      return 'safe'
  }
}

// 解析CSV数据并转换为区域数据
const parseCSVData = async (): Promise<Region[]> => {
  try {
    // 读取完整的CSV文件
    const response = await fetch('/src/mock/steel_anomaly_decision_results.csv')
    const csvData = await response.text()

    const lines = csvData.split('\n').filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(',')
    const regions: Region[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',')
      if (values.length < headers.length) continue

      const row: any = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || ''
      })

      // 解析受影响区域
      const affectedAreas =
        row.affected_areas === '无'
          ? []
          : row.affected_areas
              .split(';')
              .map((area: string) => area.trim())
              .filter((area: string) => area)

      // 解析异常特征
      const anomalyFeatures =
        row.anomaly_features === '无'
          ? []
          : row.anomaly_features
              .split(';')
              .map((feature: string) => feature.trim())
              .filter((feature: string) => feature)

      // 解析场景数据
      const scenarios: RegionScenario[] = []
      const scenarioCount = parseInt(row.scenario_count) || 0

      for (let j = 1; j <= scenarioCount; j++) {
        const scenario = {
          feature: row[`scenario_${j}_feature`] || '',
          name: row[`scenario_${j}_name`] || '',
          description: row[`scenario_${j}_description`] || '',
          impact: row[`scenario_${j}_impact`] || '',
          action: row[`scenario_${j}_action`] || '',
        }
        if (scenario.name) {
          scenarios.push(scenario)
        }
      }

      const anomalyData: RegionAnomalyData = {
        timestamp: row.timestamp,
        anomaly_score: parseFloat(row.anomaly_score) || 0,
        is_anomaly: parseInt(row.is_anomaly) || 0,
        risk_level: row.risk_level,
        risk_color: row.risk_color,
        affected_areas: affectedAreas,
        anomaly_features: anomalyFeatures,
        scenario_count: scenarioCount,
        scenarios: scenarios,
      }
      // 为每个时间戳创建一个Region记录，包含所有受影响的区域
      regions.push({
        timestamp: row.timestamp,
        regions: affectedAreas.length > 0 ? affectedAreas : ['全部区域'], // 包含所有区域
        risk_level: getRiskLevelKey(row.risk_level),
        message: `风险评分: ${row.anomaly_score}, 风险等级: ${row.risk_level}`,
        anomaly_data: anomalyData,
        scenarios: scenarios,
      })
    }

    return regions
  } catch (error) {
    console.error('解析CSV数据失败:', error)
    return []
  }
}

// 从ChartContainer注入的扩展状态
const isExpanded = inject('isChartExpanded', ref(false))

const regions = ref<Region[]>([])
const startIndex = ref(0)
const visibleCount = 100 // 一次显示的行数

// 跟踪当前选中的区域
const selectedRegion = ref<Region | null>(null)

// 加载状态
const isLoading = ref(false)
const isLoadingMore = ref(false)
// 分页参数
const pageSize = 50
const currentSkip = ref(0)
const hasMore = ref(true)

// 滚动相关
const listBody = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null
const loadTriggerRef = ref<HTMLDivElement | null>(null)

// 计算当前可见的区域数据
const visibleRegions = computed(() => {
  if (regions.value.length === 0) return []

  if (isExpanded.value) {
    // 展开状态下，显示所有数据，不滚动
    return regions.value
  } else {
    // 非展开状态下，显示部分数据并滚动
    const total = regions.value.length
    const start = startIndex.value % total

    // 双段拼接保证视觉连续性
    return [...regions.value.slice(start), ...regions.value.slice(0, start)].slice(0, visibleCount)
  }
})

// 判断区域是否被选中
const isRegionSelected = (region: Region): boolean => {
  if (!selectedRegion.value) return false
  return region.timestamp === selectedRegion.value.timestamp
}

// 验证并构造发送给Unity的数据
const prepareUnityData = (region: Region): UnityData | null => {
  // 返回有效的Unity数据
  return {
    regions: region.regions,
    risk_level: region.risk_level,
    message: region.message || '',
  }
}

// 鼠标悬停在区域上时触发高亮
const handleRegionHover = (region: Region) => {
  if (!unityService.isUnityLoaded()) return
  const unityData = prepareUnityData(region)
  if (unityData) {
    unityService.sendMessageToUnity('Sensor', 'RegionHighlightOn', JSON.stringify(unityData))
  }
}

// 鼠标离开区域时取消高亮
const handleRegionLeave = (region: Region) => {
  if (!unityService.isUnityLoaded()) return
  const unityData = prepareUnityData(region)
  if (unityData) {
    unityService.sendMessageToUnity('Sensor', 'RegionHighlightOff', JSON.stringify(unityData))
  }
}

// 配置字段映射
const textFieldConfig = {
  labelMap: {
    regions: '受影响区域',
    risk_level: '风险等级',
    message: '详细信息',
    scenario_name: '风险场景',
    scenario_description: '风险描述',
    scenario_impact: '可能后果',
    scenario_action: '推荐建议',
    anomaly_score: '风险评分',
    affected_areas: '受影响区域',
    anomaly_features: '异常特征',
  },
  valueFormatters: {
    risk_level: (v: string) => getRiskLevelText(v),
    affected_areas: (v: string[]) => (Array.isArray(v) ? v.join(', ') : v),
    anomaly_features: (v: string[]) => (Array.isArray(v) ? v.join(', ') : v),
  },
}

// 鼠标点击的时候触发文本框显示功能
// 引入消息管理
const messageStore = useMessageStore()

const handleRegionClick = (region: Region) => {
  // 检查Unity是否已加载
  if (!unityService.isUnityLoaded()) {
    message.warning('Unity尚未加载完成，无法发送区域数据')
    return
  }

  const unityData = prepareUnityData(region)
  if (!unityData) return

  // 如果点击的是已选中的区域，则取消选中状态
  if (isRegionSelected(region)) {
    selectedRegion.value = null
  } else {
    // 否则设置为选中状态
    selectedRegion.value = region
  }

  // 无论是选中还是取消选中，都发送同一个消息
  //unityService.sendMessageToUnity('Sensor', 'RegionContinuousHighlight', JSON.stringify(unityData))
  // 准备显示的数据
  const displayData: any = {
    regions: region.regions.join(', '),
    risk_level: region.risk_level,
    message: region.message,
  }

  // 如果有异常数据，添加更多信息
  if (region.anomaly_data) {
    displayData.anomaly_score = region.anomaly_data.anomaly_score.toFixed(3)
    displayData.affected_areas = region.anomaly_data.affected_areas
    displayData.anomaly_features = region.anomaly_data.anomaly_features
  }

  // 如果有场景数据，添加场景信息
  if (region.scenarios && region.scenarios.length > 0) {
    region.scenarios.forEach((scenario, index) => {
      displayData[`scenario_${index + 1}_name`] = scenario.name
      displayData[`scenario_${index + 1}_description`] = scenario.description
      displayData[`scenario_${index + 1}_impact`] = scenario.impact
      displayData[`scenario_${index + 1}_action`] = scenario.action
    })
  }
  // 发送消息给文本框
  messageStore.showMessage(displayData, textFieldConfig, {
    source: 'region',
    title: `区域风险分析-${region.regions.join('、')}`,
  })
}

// 滚动列表的函数
const scrollList = async () => {
  try {
    if (regions.value.length > 0) {
      startIndex.value = (startIndex.value + 1) % regions.value.length

      // 获取第一条可见数据并只提取需要的字段
      const firstRegion = visibleRegions.value[0]
      if (firstRegion) {
        const simplifiedData = {
          regions: firstRegion.regions,
          risk_level: firstRegion.risk_level,
          message: firstRegion.message,
        }

        // 异步发送数据给Unity
        await unityService.sendMessageToUnity('Building', 'ReceiveDataFromJS', JSON.stringify(simplifiedData))
      }
    }
  } catch (error) {
    console.error('向Unity发送数据失败:', error)
  }
}

// 加载区域数据
const loadRegionData = async (reset = true) => {
  try {
    if (reset) {
      isLoading.value = true
      currentSkip.value = 0
      regions.value = []
      hasMore.value = true
    } else {
      isLoadingMore.value = true
    }

    // 使用解析CSV数据的方法，获取完整数据
    const csvRegions = await parseCSVData()

    console.log(`加载了 ${csvRegions.length} 条区域数据记录`)

    // 分页处理
    const start = currentSkip.value
    const end = start + pageSize
    const paginatedRegions = csvRegions.slice(start, end)

    // 更新分页信息
    hasMore.value = end < csvRegions.length

    // 添加到当前列表
    if (reset) {
      regions.value = paginatedRegions
    } else {
      regions.value = [...regions.value, ...paginatedRegions]
    }

    // 更新下一页的偏移量
    currentSkip.value = end

    console.log(`当前显示 ${regions.value.length} 条记录，还有更多数据: ${hasMore.value}`)
  } catch (error) {
    console.error(`加载钢铁异常决策数据失败:`, error)
    message.error('加载区域数据失败，请稍后再试')
    if (reset) regions.value = [] // 重置时才清空区域列表
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多数据
const loadMoreData = async () => {
  if (!hasMore.value || isLoadingMore.value) return
  await loadRegionData(false)
}

// 设置滚动监听
const setupScrollObserver = () => {
  if (scrollObserver) {
    scrollObserver.disconnect()
  }

  scrollObserver = new IntersectionObserver(
    (entries) => {
      // 只在展开状态下监听滚动加载更多
      if (!isExpanded.value) return

      const entry = entries[0]
      if (entry && entry.isIntersecting && hasMore.value && !isLoadingMore.value) {
        loadMoreData()
      }
    },
    {
      rootMargin: '100px',
    },
  )

  nextTick(() => {
    if (loadTriggerRef.value) {
      scrollObserver?.observe(loadTriggerRef.value)
    }
  })
}

/**
 * 处理导出操作 - 下载CSV文件
 */
const handleExport = async () => {
  try {
    // 获取当前选中的算法类型
    const selectedAlgorithm = algorithmStore.getModuleSelectedAlgorithm(ModuleType.Module3)

    // 获取当前算法的参数
    const params = algorithmStore.getAlgorithmParams(selectedAlgorithm)

    // 构建下载参数
    const downloadParams: DownloadCsvParams = {
      algorithm: selectedAlgorithm,
      learning_rate: Number(params.learning_rate) || 0.1,
      max_depth:
        selectedAlgorithm === AlgorithmType.xgboost || selectedAlgorithm === AlgorithmType.lightGBM
          ? Number(params.max_depth)
          : null,
      max_epochs: selectedAlgorithm === AlgorithmType.TabNet ? Number(params.max_epochs) : null,
      localize: true,
      filename: `${selectedAlgorithm}_region`,
    }

    // 下载CSV文件
    const blobData = await Algorithm3Api.downloadResultsCsv(downloadParams)

    // 创建下载链接并触发下载
    const url = window.URL.createObjectURL(blobData)
    const link = document.createElement('a')
    link.href = url
    link.download = `${downloadParams.filename || 'algorithm_results'}.csv`
    document.body.appendChild(link)
    link.click()

    // 清理
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)

    message.success('导出成功')
  } catch (error) {
    console.error('导出CSV文件失败:', error)
    message.error('导出失败，请稍后再试')
  }
}

onMounted(async () => {
  // 初始加载数据
  await loadRegionData()
  // 设置滚动观察器
  setupScrollObserver()
  // 监听 sensorlist-finished 事件，sensor发送完消息后，再region发消息，用于字体颜色正确切换
  window.addEventListener('sensorlist-finished', handleSensorListFinished)
})

function handleSensorListFinished() {
  setTimeout(() => {
    scrollList()
    window.dispatchEvent(new Event('regionlist-finished'))
  }, 80) // 80ms 延迟，可根据需要调整
}

onUnmounted(() => {
  // 清除滚动观察器
  if (scrollObserver) {
    scrollObserver.disconnect()
    scrollObserver = null
  }
  // 移除 sensorlist-finished 事件监听
  window.removeEventListener('sensorlist-finished', handleSensorListFinished)
})
</script>

<style lang="scss">
@use '@/assets/styles/ScrollingRegionList.scss';
</style>
