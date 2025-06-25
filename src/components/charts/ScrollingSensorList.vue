<template>
  <!--
   * @description 传感器数据滚动列表组件
   *
   * 该组件显示传感器的实时数据列表，包括传感器编号、温度、压力和安全状态。
   * 包含以下功能：
   * 1. 非展开状态下自动滚动显示传感器数据，鼠标悬停在数据上时停止滚动
   * 2. 展开状态下显示全部传感器数据，可滚动查看，点击监测点按钮展示预测图表
   * 3. 根据安全状态自动显示不同颜色的状态指示器（安全/警告/危险）
   * 4. 响应式布局设计，适应不同显示状态
   * 5. 带有固定表头的数据列表
   *
   -->
  <div :class="{ 'scrolling-list-container expanded': isExpanded, 'scrolling-list-container': !isExpanded }">
    <!-- 标题栏 -->
    <GraphHeader :title="'传感器数据实时监控'" :centered="true" :glow-effect="true">
      <template #icon>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M19.35,10.04C18.67,6.59 15.64,4 12,4C9.11,4 6.6,5.64 5.35,8.04C2.34,8.36 0,10.91 0,14A6,6 0 0,0 6,20H19A5,5 0 0,0 24,15C24,12.36 21.95,10.22 19.35,10.04Z"
          />
        </svg>
      </template>
      <template #actions>
        <div v-if="isExpanded" class="graph-actions">
          <!-- 时间步控制 -->
          <div class="timestep-control">
            <button class="timestep-button" @click="decrementTimestep" :disabled="timestep === 0">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M20,12H4V13H20V12Z" />
              </svg>
            </button>
            <span class="timestep-value">{{ timestep }}</span>
            <button class="timestep-button" @click="incrementTimestep" :disabled="timestep === 29">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path fill="currentColor" d="M20,12H13V5H11V12H4V13H11V20H13V13H20V12Z" />
              </svg>
            </button>
          </div>
          <!-- 导出按钮 -->
          <button class="export-button" @click="handleExport">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" />
            </svg>
            <span>导出</span>
          </button>
        </div>
      </template>
    </GraphHeader>

    <!-- 背景效果 -->
    <div class="list-background-effects">
      <div class="list-grid"></div>
      <div class="list-glow"></div>
    </div>

    <!-- 左上角下拉框 -->
    <div class="dropdown-container">
      <div class="dropdown region-dropdown" @click="toggleRegionDropdown">
        <div class="select-wrapper">
          <div class="select-label">
            <div class="label-content">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="currentColor"
                  d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"
                />
              </svg>
              <span>区域</span>
            </div>
            <select v-model="selectedRegion" @change="handleRegionChange" class="tech-select" title="选择区域">
              <option value="">全部区域</option>
              <option value="原料与采购物流区">原料与采购物流区</option>
              <option value="烧结/球团区">烧结/球团区</option>
              <option value="炼焦区">炼焦区</option>
              <option value="炼铁区">炼铁区</option>
              <option value="炼钢区">炼钢区</option>
              <option value="连铸区">连铸区</option>
              <option value="轧制区">轧制区</option>
              <option value="热处理区">热处理区</option>
            </select>
            <div class="arrow" :class="{ open: regionDropdownOpen }"></div>
          </div>
        </div>
      </div>
      <!--
      <div class="dropdown attribute-dropdown">
        <div class="select-wrapper">
          <div class="select-container" @click="toggleAttributeDropdown">
            <div class="label-content">
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path
                  fill="currentColor"
                  d="M12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2Z"
                />
              </svg>
              <span>属性</span>
            </div>
            <div class="arrow" :class="{ open: showAttributeDropdown }"></div>
          </div>
        </div>
        <div class="dropdown-content" v-if="showAttributeDropdown">
          <div class="attribute-item" v-for="attribute in attributes" :key="attribute.value">
            <label class="tech-checkbox">
              <input type="checkbox" :value="attribute.value" v-model="selectedAttributes" />
              <span class="checkbox-custom"></span>
              <span class="checkbox-label">{{ attribute.label }}</span>
            </label>
          </div>
        </div>
      </div>
      -->
    </div>

    <div class="scrolling-list-header">
      <div class="header-item timestamp">时间戳</div>
      <div class="header-item region">区域</div>
      <div class="header-item sensor_type">传感器类型</div>
      <div class="header-item measurement">测量量</div>
      <div class="header-item value">测量值</div>

      <!--
      <div class="header-item" v-for="attribute in selectedAttributes" :key="attribute">
        {{ getAttributeName(attribute) }}
      </div>
      -->
    </div>
    <!-- 注意添加.stop阻止事件冒泡，并明暗交替 -->
    <div class="scrolling-list-body" ref="listBody">
      <!-- 添加加载状态提示 -->
      <div v-if="isLoading" class="loading-indicator">
        <span>正在加载数据...</span>
      </div>
      <div v-else-if="visibleSensors.length === 0" class="empty-data">
        <span>暂无传感器数据</span>
      </div>
      <template v-else>
        <div
          v-for="(sensor, index) in visibleSensors"
          :key="sensor.region + sensor.measurement"
          class="list-row"
          :class="{
            'row-highlighted': highlightedSensorId === sensor.region + sensor.measurement,
            'row-alt': index % 2 === 1,
          }"
        >
          <div class="list-item timestamp">
            <div class="timestamp-wrapper">
              <svg viewBox="0 0 24 24" width="12" height="12" class="timestamp-icon">
                <path
                  fill="currentColor"
                  d="M12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22C6.47,22 2,17.5 2,12A10,10 0 0,1 12,2M12.5,7V12.25L17,14.92L16.25,16.15L11,13V7H12.5Z"
                />
              </svg>
              <span>{{ formatTimestamp(sensor.timestamp) }}</span>
            </div>
          </div>
          <!--
          <div class="list-item sensor-id">
            <button
              v-if="isExpanded"
              class="sensor-btn"
              @click.stop="showImage(sensor)"
              :title="`点击查看${sensor.region}预测图表`"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="sensor-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.region }}</span>
            </button>
          </div>
          -->
          <div class="list-item region">
            <div class="sensor-region">
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.region }}</span>
            </div>
          </div>
          <div class="list-item sensor_type">
            <div class="sensor-sensor_type">
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.sensor_type }}</span>
            </div>
          </div>
          <div class="list-item measurement">
            <div class="sensor-measurement">
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.measurement }}</span>
            </div>
          </div>
          <div class="list-item value">
            <div class="sensor-value">
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.value.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- 加载更多触发器元素 -->
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
  <!--
  图片弹窗 
  <div v-if="showImageModal" class="image-modal" @click="closeImageModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M3,17V19H9V17H3M3,5V7H13V5H3M13,21V19H21V17H13V15H21V13H13V11H21V9H13V7H21V5H13V3H21V1H3V3H11V5H3V7H11V9H3V11H11V13H3V15H11V17H3V19H11V21H3"
            />
          </svg>
          传感器预测图表 - {{ currentSensorId }}
        </h3>
        <button class="modal-close-button" @click="closeImageModal">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              fill="currentColor"
              d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
            />
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-image-container">
          <div v-if="isImageLoading" class="loading-container">
            <div class="loading-spinner"></div>
            <span class="loading-text">加载图表中...</span>
          </div>
          <img
            v-else
            :src="currentImage"
            :alt="currentSensorId"
            class="modal-image"
            :class="{ 'image-fade-in': !isImageLoading }"
          />
        </div>
      </div>
    </div>
  </div>
-->

  <!-- 文本框组件 -->
  <!-- <TextMessageDisplayBox /> -->
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, watch, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue' // 添加消息提示组件
import UnityService from '@/services/UnityService'
import Algorithm11Api, { type Result } from '@/apis/Algorithm11'
import GraphHeader from '../common/GraphHeader.vue'

interface Sensor {
  timestamp: string
  region: string
  sensor_type: string
  measurement: string
  value: number
}

const isExpanded = inject('isChartExpanded', ref(false))

// 响应式状态
const selectedRegion = ref('')
const regionDropdownOpen = ref(false)

// 添加高亮状态跟踪变量
const highlightedSensorId = ref('')

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
// 展开状态下调整timestep，控制滚动监视器重设置
const isTimeStepChangedExpanded = ref(false)

// timestep响应式变量
const timestep = ref(0)

// 初始化加载状态
const initializeState = () => {
  //const savedState = loadSavedState()
  //selectedRegion.value = savedState.region
  //selectedAttributes.value = savedState.attributes
}
/*
const attributes = [
  { value: 'temperature', label: '温度' },
  { value: 'pressure', label: '压力' },
  { value: 'flow_rate', label: '流量' },
  { value: 'level', label: '液位' },
  { value: 'gas_type', label: '气体类型' },
  { value: 'gas_concentration', label: '气体浓度' },
]
  */

// 动态获取区域和属性的正常范围
const sensors = ref<Sensor[]>([])
const startIndex = ref(0)
const visibleCount = 10
let scrollTimer: number | null = null

// 加载传感器数据
const loadSensorData = async (reset = true) => {
  try {
    if (reset) {
      isLoading.value = true
      currentSkip.value = 0
      sensors.value = []
      hasMore.value = true
    } else {
      isLoadingMore.value = true
    }

    // 构建请求参数
    const requestParams = {
      region: selectedRegion.value || undefined,
      timestep: timestep.value,
      skip: currentSkip.value,
      limit: pageSize,
    }

    // 调用API获取数据（带分页）
    const response = await Algorithm11Api.getTimeMixerResultsWithPagination(requestParams)

    // 更新分页信息
    hasMore.value = response.pagination.has_more

    // 处理返回的数据
    const processedData = processSensorData(response.data)

    // 转换数据格式并添加到当前列表
    if (reset) {
      sensors.value = processedData
    } else {
      sensors.value = [...sensors.value, ...processedData]
    }

    // 更新下一页的偏移量
    currentSkip.value += response.data.length
  } catch (error) {
    console.error('加载传感器数据失败:', error)
    message.error('加载传感器数据失败，请稍后再试')
    if (reset) sensors.value = [] // 重置时才清空传感器数据
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

// 展开状态下修改时间步
const incrementTimestep = () => {
  if (timestep.value < 29) {
    timestep.value += 1
    isTimeStepChangedExpanded.value = !isTimeStepChangedExpanded.value
  }
}

const decrementTimestep = () => {
  if (timestep.value > 0) {
    timestep.value -= 1
    isTimeStepChangedExpanded.value = !isTimeStepChangedExpanded.value
  }
}
const scrollList = () => {
  if (filteredSensors.value.length > 0) {
    startIndex.value = (startIndex.value + 1) % filteredSensors.value.length
  }
}

/**
 * 处理导出操作 - 下载CSV文件
 */
const handleExport = async () => {
  message.loading('正在导出数据...', 2)
  try {
    // 构建下载参数
    const downloadParams = {
      region: selectedRegion.value || undefined,
      get_all: true, // 获取所有数据导出
      localize: true, // 使用本地化字段名
      filename: selectedRegion.value ? `sensor_data_${selectedRegion.value}` : 'sensor_data_all_regions',
    }

    // 下载CSV文件
    const blobData = await Algorithm11Api.downloadTimeMixerCsv(downloadParams)

    // 创建下载链接并触发下载
    const url = window.URL.createObjectURL(blobData)
    const link = document.createElement('a')
    link.href = url
    link.download = `${downloadParams.filename}.csv`
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

// 加载更多数据
const loadMoreData = async () => {
  if (!hasMore.value || isLoadingMore.value) return
  await loadSensorData(false)
}

// 设置滚动监听
const setupScrollObserver = () => {
  if (scrollObserver) {
    scrollObserver.disconnect()
    scrollObserver = null
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

// 数据映射
const processSensorData = (rawData: Result[]): Sensor[] => {
  return rawData.map((item) => {
    return {
      timestamp: item.timestamp || new Date().toISOString(),
      region: item.region || 'UNKNOWN',
      sensor_type: item.sensor_type || 'UNKNOWN',
      measurement: item.measurement || 'UNKNOWN',
      value: Number(item.value) || 0,
    }
  })
}

/*
// 4. 重构后的判断函数
const isHighValue = (value: number, type: keyof typeof sensorMetadata, key: string): boolean => {
  const sensorMeta = sensorMetadata[type]
  if (!sensorMeta?.normal_ranges) return false

  // 安全类型转换
  const ranges = (sensorMeta.normal_ranges as Record<string, RangeTuple>)[key]

  if (!ranges || ranges.length !== 2) {
    console.warn(`Invalid range for ${type}.${key}`)
    return false
  }

  return value < ranges[0] || value > ranges[1]
}
  */

const handleRegionChange = () => {
  startIndex.value = 0
  loadSensorData() // 区域变更时重新加载数据
}

/*
const toggleAttributeDropdown = () => {
  showAttributeDropdown.value = !showAttributeDropdown.value
}
*/

const toggleRegionDropdown = () => {
  regionDropdownOpen.value = !regionDropdownOpen.value
}

/*
const getAttributeName = (attribute: string): string => {
  const map: Record<string, string> = {
    timestamp: '时间戳',
    point_id: '传感器编号',
    region: '区域',
    temperature: '温度',
    pressure: '压力',
    flow_rate: '流量',
    level: '液位',
    gas_type: '气体类型',
    gas_concentration: '气体浓度',
  }
  return map[attribute] || attribute
}


const getAttributeValue = (sensor: Sensor, attribute: string): any => {
  return sensor[attribute as keyof Sensor]
}

const formatValue = (value: number): string => {
  return value.toFixed(2)
}
  */

const formatTimestamp = (timestamp: string): string => {
  return timestamp.slice(0, 19).replace('T', ' ')
}

const filteredSensors = computed(() => {
  if (!selectedRegion.value) return sensors.value
  return sensors.value.filter((sensor) => sensor.region === selectedRegion.value)
})

const visibleSensors = computed(() => {
  if (filteredSensors.value.length === 0) return []

  if (isExpanded.value) {
    // 展开状态下，显示所有数据，不滚动
    return filteredSensors.value
  } else {
    // 非展开状态下，显示部分数据并滚动
    const total = filteredSensors.value.length
    const start = startIndex.value % total

    // 双段拼接保证视觉连续性
    return [...filteredSensors.value.slice(start), ...filteredSensors.value.slice(0, start)].slice(0, visibleCount)
  }
})

async function sendMessageToUnity() {
  // 只在非展开状态下同步数据和时间步
  if (!isExpanded.value) {
    timestep.value = (timestep.value + 1) % 30
    await loadSensorData()
    // 将当前所有传感器数据发送给Unity
    const sensorsData = sensors.value.map((sensor) => ({
      timestamp: sensor.timestamp,
      region: sensor.region,
      sensor_type: sensor.sensor_type,
      measurement: sensor.measurement,
      value: sensor.value,
    }))
    UnityService.sendMessageToUnity('Sensor', 'ReceiveDataFromJS', JSON.stringify(sensorsData))
  }
}

onMounted(async () => {
  // 初始化选择状态
  initializeState()
  // 加载数据
  await loadSensorData()
  // 设置滚动观察器
  setupScrollObserver()
  // 设置定时器，每2秒滚动一次（保持不变）
  scrollTimer = setInterval(scrollList, 2000) as unknown as number
  // 设置定时器，每10秒执行一次（链式起点），用于发送消息给unity，随后通知regionlist发送消息
  // 先sensor后region是为了保证字体颜色能正常改变
  scrollTimer = setInterval(async () => {
    await sendMessageToUnity()
    window.dispatchEvent(new Event('sensorlist-finished'))
  }, 10000) as unknown as number
})

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

// 只在必要时才重置 startIndex
watch([filteredSensors], () => (startIndex.value = 0))

// 监听区域选择变化
watch(selectedRegion, async () => {
  await loadSensorData()
  // 重置开始索引
  startIndex.value = 0
  //! 设置滚动观察器
  setupScrollObserver()
})

watch(isTimeStepChangedExpanded, async () => {
  await loadSensorData()
  setupScrollObserver()
})

/*
// 图片弹窗相关
const showImageModal = ref(false)
const currentImage = ref('')
const currentSensorId = ref('')
const isImageLoading = ref(false) // 添加加载状态变量


const showImage = async (sensor: Sensor) => {
  //!  清理旧的 URL，防止内存泄露
  if (currentImage.value && currentImage.value.startsWith('blob:')) {
    URL.revokeObjectURL(currentImage.value)
  }
  try {
    // 显示加载状态
    currentImage.value = ''
    currentSensorId.value = sensor.point_id
    showImageModal.value = true
    isImageLoading.value = true

    // 从后端获取图片数据
    const imageBlob = await Algorithm11Api.getPredictionChart({
      point_id: sensor.point_id,
      timestamp: sensor.timestamp,
    })

    // 将 Blob 转换为可显示的 URL
    currentImage.value = URL.createObjectURL(imageBlob)
  } catch (error) {
    console.error('获取预测图表失败:', error)
    message.error('获取预测图表失败，请稍后重试')
    showImageModal.value = false
  } finally {
    isImageLoading.value = false
  }
}

// 在组件卸载时清理 URL
onUnmounted(() => {
  if (currentImage.value.startsWith('blob:')) {
    URL.revokeObjectURL(currentImage.value)
  }
})

const closeImageModal = () => {
  showImageModal.value = false
}
  */

// 当筛选条件变化时，清除高亮状态
watch([selectedRegion], () => {
  highlightedSensorId.value = ''
  startIndex.value = 0
})

watch(selectedRegion, (newVal) => {
  localStorage.setItem('scrollingListSelectedRegion', newVal)
})
</script>

<style lang="scss">
@use '@/assets/styles/ScrollingSensorList.scss';
</style>
