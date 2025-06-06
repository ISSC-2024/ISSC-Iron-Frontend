<template>
  <!-- 
   * @description 化工厂日志滚动列表组件
   * 
   * 该组件显示化工厂的实时日志列表，包括区域、时间戳、消息内容和风险等级。
   * 包含以下功能：
   * 1. 非展开状态下自动滚动显示日志数据
   * 2. 展开状态下显示全部日志数据，可滚动查看
   * 3. 根据风险等级自动显示不同颜色的状态指示器（信息/警告/危险）
   * 4. 响应式布局设计，适应不同显示状态
   * 5. 点击日志行可以将信息发送至Unity进行区域高亮，并显示在文本框中
   * 6. 非展开状态下，消息内容过长会被截断并显示省略号
   *
   -->
  <div class="scrolling-log-container" :class="{ expanded: isExpanded }">
    <GraphHeader :title="'系统运行日志'">
      <template #icon>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M7,7H17V5H19V19H5V5H7V7M17,11H7V9H17V11M15,15H7V13H15V15Z"
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

    <!-- 表头 -->
    <div class="log-header">
      <div class="header-time">
        <clock-circle-outlined />
        <span>时间戳</span>
      </div>
      <div class="header-type">
        <environment-outlined />
        <span>区域</span>
      </div>
      <div class="header-message">
        <message-outlined />
        <span>消息内容</span>
      </div>
    </div>

    <div class="scrolling-log-body" ref="logBody">
      <!-- 加载状态提示 -->
      <div v-if="isLoading" class="loading-indicator">
        <span>正在加载数据...</span>
      </div>
      <div v-else-if="visibleLogs.length === 0" class="empty-data">
        <span>暂无日志数据</span>
      </div>
      <template v-else>
        <div
          v-for="(log, index) in visibleLogs"
          :key="log.timestamp + log.region"
          class="log-row"
          :class="{
            'log-info': log.risk_level === 'safe',
            'log-warning': log.risk_level === 'warning',
            'log-danger': log.risk_level === 'danger',
            'log-selected': isLogSelected(log),
            'log-row-alt': index % 2 === 1,
          }"
          @click="handleLogClick(log)"
          @mouseenter="handleLogHover(log)"
          @mouseleave="handleLogLeave(log)"
        >
          <!-- 时间戳 -->
          <div class="log-time">
            <clock-circle-outlined />
            <span>{{ formatTime(log.timestamp) }}</span>
          </div>
          <!-- 区域 -->
          <div class="log-type">
            <environment-outlined />
            <span>{{ log.region }}</span>
          </div>
          <!-- 消息 -->
          <div class="log-message" :class="{ expanded: isExpanded }" :title="log.message">
            <message-outlined />
            {{ log.message }}
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
  <!-- <TextMessageDisplayBox /> -->
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, onUnmounted, watch, nextTick } from 'vue'
import unityService from '@/services/UnityService'
import { message } from 'ant-design-vue'
import { useAlgorithmStore, ModuleType, AlgorithmType } from '@/stores/algorithmStore'
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  MessageOutlined,
  DownloadOutlined, // 添加下载图标
} from '@ant-design/icons-vue'
import Algorithm3Api, { type AlgorithmResult, type DownloadCsvParams } from '@/apis/Algorithm3'
import GraphHeader from '../common/GraphHeader.vue'

// 日志数据结构接口
interface LogEntry {
  timestamp: string
  region: string
  risk_level: 'safe' | 'warning' | 'danger'
  message: string
}

// 使用算法数据 store
const algorithmStore = useAlgorithmStore()

// 定义有效区域常量
const VALID_REGIONS = ['RMS', 'REA', 'SEP', 'PRO', 'UTL']
const VALID_RISK_LEVELS = ['safe', 'warning', 'danger']

// 从ChartContainer注入的扩展状态
const isExpanded = inject('isChartExpanded', ref(false))

const logs = ref<LogEntry[]>([])
const startIndex = ref(0)
const visibleCount = 100
let scrollTimer: ReturnType<typeof setInterval> | null = null

// 加载状态
const isLoading = ref(false)
const isLoadingMore = ref(false)
// 分页参数
const pageSize = 50
const currentSkip = ref(0)
const hasMore = ref(true)

// 滚动相关
const logBody = ref<HTMLElement | null>(null)
let scrollObserver: IntersectionObserver | null = null
const loadTriggerRef = ref<HTMLDivElement | null>(null)

// 将API返回的数据转换为日志条目
const convertToLogEntries = (results: AlgorithmResult[]): LogEntry[] => {
  return results.map((result) => ({
    timestamp: result.timestamp,
    region: result.region,
    risk_level: result.risk_level as 'safe' | 'warning' | 'danger',
    message: result.message,
  }))
}

// 加载日志数据
const loadLogData = async (reset = true) => {
  try {
    if (reset) {
      isLoading.value = true
      currentSkip.value = 0
      logs.value = []
      hasMore.value = true
    } else {
      isLoadingMore.value = true
    }

    // 获取当前选中的算法类型
    const selectedAlgorithm = algorithmStore.getModuleSelectedAlgorithm(ModuleType.Module3)

    // 获取当前算法的参数
    const params = algorithmStore.getAlgorithmParams(selectedAlgorithm)

    // 构建请求参数
    const requestParams = {
      algorithm: selectedAlgorithm,
      learning_rate: Number(params.learning_rate) || 0.1,
      max_depth:
        selectedAlgorithm === AlgorithmType.xgboost || selectedAlgorithm === AlgorithmType.lightGBM
          ? Number(params.max_depth)
          : null,
      max_epochs: selectedAlgorithm === AlgorithmType.TabNet ? Number(params.max_epochs) : null,
      skip: currentSkip.value,
      limit: pageSize,
    }

    // 调用API获取数据（带分页）
    const response = await Algorithm3Api.getResultsWithPagination(requestParams)

    // 更新分页信息
    hasMore.value = response.pagination.has_more

    // 转换数据格式并添加到当前列表
    if (reset) {
      logs.value = convertToLogEntries(response.data)
    } else {
      logs.value = [...logs.value, ...convertToLogEntries(response.data)]
    }

    // 更新下一页的偏移量
    currentSkip.value += response.data.length
  } catch (error) {
    console.error(`加载模块3日志数据失败:`, error)
    message.error('加载日志数据失败，请稍后再试')
    if (reset) logs.value = [] // 重置时才清空日志
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 加载更多数据
const loadMoreData = async () => {
  if (!hasMore.value || isLoadingMore.value) return
  await loadLogData(false)
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

// 跟踪当前选中的日志项
const selectedLog = ref<LogEntry | null>(null)

// 计算当前可见的日志数据
const visibleLogs = computed(() => {
  if (logs.value.length === 0) return []

  if (isExpanded.value) {
    // 展开状态下，显示所有数据，不滚动
    return logs.value
  } else {
    // 非展开状态下，显示部分数据并滚动
    const total = logs.value.length
    const start = startIndex.value % total

    // 双段拼接保证视觉连续性
    return [...logs.value.slice(start), ...logs.value.slice(0, start)].slice(0, visibleCount)
  }
})

// 判断日志是否被选中
const isLogSelected = (log: LogEntry): boolean => {
  if (!selectedLog.value) return false
  return log.region === selectedLog.value.region
}

// 验证并确保日志数据有效性
const validateLog = (log: LogEntry): { isValid: boolean; log: LogEntry } => {
  // 创建副本防止修改原始数据
  const validatedLog = { ...log }

  // 验证区域
  if (!VALID_REGIONS.includes(validatedLog.region)) {
    console.warn(`非法区域值: ${validatedLog.region}，将使用默认值 RMS`)
    validatedLog.region = 'RMS'
  }

  // 验证风险等级
  if (!VALID_RISK_LEVELS.includes(validatedLog.risk_level)) {
    console.warn(`非法风险等级: ${validatedLog.risk_level}，将使用默认值 safe`)
    validatedLog.risk_level = 'safe'
  }

  return {
    isValid: true,
    log: validatedLog,
  }
}

// 准备发送给Unity的数据
const prepareUnityData = (log: LogEntry) => {
  const { isValid, log: validatedLog } = validateLog(log)

  if (!isValid) return null

  return {
    region: validatedLog.region,
    risk_level: validatedLog.risk_level,
    message: validatedLog.message,
  }
}

// 鼠标悬停在日志行时触发高亮
const handleLogHover = (log: LogEntry) => {
  if (!unityService.isUnityLoaded()) return
  // 鼠标悬停时停止滚动
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }
  const unityData = prepareUnityData(log)
  if (unityData) {
    unityService.sendMessageToUnity('Sensor', 'RegionHighlightOn', JSON.stringify(unityData))
  }
}

// 鼠标离开日志行时取消高亮
const handleLogLeave = (log: LogEntry) => {
  if (!unityService.isUnityLoaded()) return
  // 如果不在展开状态，重新开始滚动
  if (!isExpanded.value && !scrollTimer) {
    scrollTimer = setInterval(scrollList, 2000) as unknown as number
  }
  const unityData = prepareUnityData(log)
  if (unityData) {
    unityService.sendMessageToUnity('Sensor', 'RegionHighlightOff', JSON.stringify(unityData))
  }
}

// 点击日志行时的处理函数 - 持续高亮/取消高亮
//const messageStore = useMessageStore()
const handleLogClick = (log: LogEntry) => {
  // 检查Unity是否已加载
  if (!unityService.isUnityLoaded()) {
    message.warning('Unity尚未加载完成，无法发送日志')
    return
  }

  const unityData = prepareUnityData(log)
  if (!unityData) return

  // 如果点击的是已选中的日志，则取消选中状态
  if (isLogSelected(log)) {
    selectedLog.value = null
  } else {
    // 否则设置为选中状态
    selectedLog.value = log
  }

  // 无论是选中还是取消选中，都发送同一个消息
  unityService.sendMessageToUnity('Sensor', 'RegionContinuousHighlight', JSON.stringify(unityData))

  // 发送消息到文本框相关代码已被注释
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
      filename: `${selectedAlgorithm}_log`,
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

// 格式化时间戳
const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

// 滚动列表的函数
const scrollList = () => {
  if (logs.value.length > 0) {
    startIndex.value = (startIndex.value + 1) % logs.value.length
  }
}

onMounted(async () => {
  // 初始加载数据
  await loadLogData()

  // 设置滚动观察器
  setupScrollObserver()

  // 非展开状态下设置滚动定时器
  scrollTimer = setInterval(scrollList, 2000)
})

// 监听模块3的任何变化（包括算法选择和参数）
watch(
  () => [
    algorithmStore.selectedAlgorithms[ModuleType.Module3],
    algorithmStore.algorithms[algorithmStore.selectedAlgorithms[ModuleType.Module3]]?.params,
  ],
  async () => {
    console.log('模块3配置已更新，重新加载数据')
    await loadLogData()
    // 重置开始索引
    startIndex.value = 0
  },
  { deep: true },
)

onUnmounted(() => {
  // 清除定时器
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }

  // 清除滚动观察器
  if (scrollObserver) {
    scrollObserver.disconnect()
    scrollObserver = null
  }
})
</script>

<style lang="scss" scoped>
@use '@/assets/styles/ScrollingLogList.scss';
</style>
