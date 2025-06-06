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
    <GraphHeader :title="'传感器数据实时监控'">
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
            <select v-model="selectedRegion" @change="handleRegionChange" class="tech-select">
              <option value="">全部区域</option>
              <option value="PRO">PRO</option>
              <option value="REA">REA</option>
              <option value="SEP">SEP</option>
              <option value="UTL">UTL</option>
              <option value="RMS">RMS</option>
            </select>
            <div class="arrow" :class="{ open: regionDropdownOpen }"></div>
          </div>
        </div>
      </div>

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
    </div>

    <div class="scrolling-list-header">
      <div class="header-item timestamp">时间戳</div>
      <div class="header-item sensor-id">传感器编号</div>
      <div class="header-item" v-for="attribute in selectedAttributes" :key="attribute">
        {{ getAttributeName(attribute) }}
      </div>
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
          :key="sensor.point_id"
          class="list-row"
          :class="{
            'row-highlighted': highlightedSensorId === sensor.point_id,
            'row-alt': index % 2 === 1,
          }"
          @mouseenter="handleHover(sensor)"
          @mouseleave="handleHoverEnd"
          @click.stop="handleClick(sensor)"
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

          <div class="list-item sensor-id">
            <button
              v-if="isExpanded"
              class="sensor-btn"
              @click.stop="showImage(sensor)"
              :title="`点击查看${sensor.point_id}预测图表`"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="sensor-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.point_id }}</span>
            </button>
            <div v-else class="sensor-id-text">
              <svg viewBox="0 0 24 24" width="12" height="12" class="sensor-icon">
                <path
                  fill="currentColor"
                  d="M9,7V9H13V11H9V13H13V15H9V17H13A2,2 0 0,0 15,15V13.5A1.5,1.5 0 0,0 13.5,12A1.5,1.5 0 0,0 15,10.5V9A2,2 0 0,0 13,7H9M16,7V17H18V7H16Z"
                />
              </svg>
              <span>{{ sensor.point_id }}</span>
            </div>
          </div>

          <div class="list-item" v-for="attribute in selectedAttributes" :key="attribute">
            <div
              v-if="attribute === 'temperature'"
              class="value-container"
              :class="{ 'high-value': isHighValue(sensor.temperature, 'temperature', sensor.region) }"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M15 13V5A3 3 0 0 0 9 5V13A5 5 0 1 0 15 13M12 4A1 1 0 0 1 13 5V8H11V5A1 1 0 0 1 12 4Z"
                />
              </svg>
              <span>{{ formatValue(sensor.temperature) }}°C</span>
            </div>

            <div
              v-else-if="attribute === 'pressure'"
              class="value-container"
              :class="{ 'high-value': isHighValue(sensor.pressure, 'pressure', sensor.region) }"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,14.4 5,16.5 6.7,18C8.1,16.7 10,16 12,16C14,16 15.9,16.7 17.3,18C19,16.5 20,14.4 20,12A8,8 0 0,0 12,4M14,6A1,1 0 0,1 15,7A1,1 0 0,1 14,8A1,1 0 0,1 13,7A1,1 0 0,1 14,6M10,6A1,1 0 0,1 11,7A1,1 0 0,1 10,8A1,1 0 0,1 9,7A1,1 0 0,1 10,6M6.91,8.94C7.03,8.95 7.15,8.97 7.26,9.04C7.58,9.22 7.74,9.61 7.66,9.97L7.46,10.94C7.39,11.26 7.14,11.5 6.83,11.5C6.74,11.5 6.65,11.47 6.56,11.44C6.12,11.24 5.88,10.8 5.96,10.36C6.04,9.96 6.41,9.53 6.91,8.94M17.09,8.94C17.59,9.53 17.96,9.96 18.04,10.36C18.11,10.8 17.88,11.24 17.43,11.44C17.35,11.47 17.26,11.5 17.17,11.5C16.86,11.5 16.61,11.26 16.54,10.94L16.34,9.97C16.26,9.61 16.42,9.22 16.73,9.04C16.85,8.97 16.97,8.95 17.09,8.94M12,10C13.1,10 14,10.9 14,12C14,13.1 13.1,14 12,14C10.9,14 10,13.1 10,12C10,10.9 10.9,10 12,10M12,17.5C14.11,17.5 16.11,18.15 17.66,19.34L16.46,20.54C15.23,19.8 13.66,19.5 12,19.5C10.34,19.5 8.77,19.8 7.54,20.54L6.34,19.34C7.89,18.15 9.89,17.5 12,17.5Z"
                />
              </svg>
              <span>{{ formatValue(sensor.pressure) }} kPa</span>
            </div>

            <div
              v-else-if="attribute === 'flow_rate'"
              class="value-container"
              :class="{ 'high-value': isHighValue(sensor.flow_rate, 'flow_rate', sensor.region) }"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M22 17V19H14V17H22M12 17C12 17.5 11.5 18 11 18H8C7.5 18 7 17.5 7 17V3C7 2.5 7.5 2 8 2H11C11.5 2 12 2.5 12 3V17M12 17V14H14C15.1 14 16 13.1 16 12V10C16 8.9 15.1 8 14 8H12V5H16V3H12V17Z"
                />
              </svg>
              <span>{{ formatValue(sensor.flow_rate) }} m³/h</span>
            </div>

            <div
              v-else-if="attribute === 'level'"
              class="value-container"
              :class="{ 'high-value': isHighValue(sensor.level, 'level', sensor.region) }"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M12 3.25C12 3.25 6 10 6 14C6 17.32 8.69 20 12 20S18 17.32 18 14C18 10 12 3.25 12 3.25M14.47 9.97L15.53 11.03L9.53 17.03L8.47 15.97M9.75 10A1.25 1.25 0 0 1 11 11.25A1.25 1.25 0 0 1 9.75 12.5A1.25 1.25 0 0 1 8.5 11.25A1.25 1.25 0 0 1 9.75 10M14.25 14.5A1.25 1.25 0 0 1 15.5 15.75A1.25 1.25 0 0 1 14.25 17A1.25 1.25 0 0 1 13 15.75A1.25 1.25 0 0 1 14.25 14.5Z"
                />
              </svg>
              <span>{{ formatValue(sensor.level) }} %</span>
            </div>

            <div v-else-if="attribute === 'gas_type'" class="value-container gas-type">
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"
                />
              </svg>
              <span>{{ sensor.gas_type }}</span>
            </div>

            <div
              v-else-if="attribute === 'gas_concentration'"
              class="value-container"
              :class="{ 'high-value': isHighValue(sensor.gas_concentration, 'gas_concentration', sensor.gas_type) }"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" class="attribute-icon">
                <path
                  fill="currentColor"
                  d="M13.35 20.13C12.59 20.82 11.42 20.82 10.66 20.12L4.4 14.46C3.42 13.56 3.42 12.03 4.4 11.13L10.66 5.47C11.42 4.77 12.59 4.77 13.35 5.47L19.6 11.13C20.58 12.03 20.58 13.56 19.6 14.46L13.35 20.13M12 7.9L6.76 12.6L12 17.3L17.24 12.6L12 7.9Z"
                />
              </svg>
              <span>{{ formatValue(sensor.gas_concentration) }} ppm</span>
            </div>

            <div v-else class="value-container">
              {{ getAttributeValue(sensor, attribute) }}
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

  <!-- 图片弹窗 -->
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

  <!-- 文本框组件 -->
  <!-- <TextMessageDisplayBox /> -->
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, watch, onUnmounted, nextTick } from 'vue'
import { message } from 'ant-design-vue' // 添加消息提示组件
import UnityService from '@/services/UnityService'
import Algorithm1Api, { type Result } from '@/apis/Algorithm1'
import GraphHeader from '../common/GraphHeader.vue'

// 1. 定义明确的元组类型和接口
type RangeTuple = [number, number]
interface SensorMeta {
  unit: string
  normal_ranges: Record<string, RangeTuple>
  precision?: string
  response_time?: string
  gas_types?: string[]
}

// 2. 使用明确的类型声明并确保元组结构
const sensorMetadata: Record<string, SensorMeta> = {
  temperature: {
    unit: '°C',
    normal_ranges: {
      RMS: [15, 35],
      REA: [80, 150],
      SEP: [50, 120],
      PRO: [15, 35],
      UTL: [20, 90],
    } as Record<string, RangeTuple>,
    precision: '±0.5°C',
    response_time: '1-3秒',
  },
  pressure: {
    unit: 'MPa',
    normal_ranges: {
      RMS: [0.1, 0.5],
      REA: [0.5, 3.0],
      SEP: [0.3, 2.0],
      PRO: [0.1, 0.5],
      UTL: [0.2, 1.5],
    } as Record<string, RangeTuple>,
    precision: '±0.01MPa',
    response_time: '小于1秒',
  },
  flow_rate: {
    unit: 'm³/h',
    normal_ranges: {
      RMS: [5, 50],
      REA: [20, 100],
      SEP: [15, 90],
      PRO: [5, 60],
      UTL: [30, 150],
    } as Record<string, RangeTuple>,
    precision: '±0.5m³/h',
    response_time: '1-2秒',
  },
  level: {
    unit: '%',
    normal_ranges: {
      RMS: [20, 80],
      REA: [30, 60],
      SEP: [20, 70],
      PRO: [20, 80],
      UTL: [30, 70],
    } as Record<string, RangeTuple>,
    precision: '±1%',
    response_time: '2-5秒',
  },
  gas_concentration: {
    unit: 'ppm',
    gas_types: ['H₂S', 'NH₃', 'CO'],
    normal_ranges: {
      'H₂S': [0, 10],
      'NH₃': [0, 25],
      CO: [0, 50],
    } as Record<string, RangeTuple>,
    precision: '±1ppm',
    response_time: '2-4秒',
  },
}

// 3. 修改后的状态加载函数
const loadSavedState = () => {
  const savedRegion = localStorage.getItem('scrollingListSelectedRegion')
  const savedAttributes = localStorage.getItem('scrollingListSelectedAttributes')

  return {
    region: savedRegion || '',
    attributes: savedAttributes ? JSON.parse(savedAttributes) : ['temperature', 'gas_type', 'gas_concentration'],
  }
}

interface Sensor {
  timestamp: string
  point_id: string
  temperature: number
  pressure: number
  flow_rate: number
  level: number
  gas_type: string
  gas_concentration: number
  region: string
}

const isExpanded = inject('isChartExpanded', ref(false))

// 响应式状态
const selectedRegion = ref('')
const selectedAttributes = ref<string[]>([])
const showAttributeDropdown = ref(false)
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
  const savedState = loadSavedState()
  selectedRegion.value = savedState.region
  selectedAttributes.value = savedState.attributes
}

const attributes = [
  { value: 'temperature', label: '温度' },
  { value: 'pressure', label: '压力' },
  { value: 'flow_rate', label: '流量' },
  { value: 'level', label: '液位' },
  { value: 'gas_type', label: '气体类型' },
  { value: 'gas_concentration', label: '气体浓度' },
]

// 动态获取区域和属性的正常范围
const sensors = ref<Sensor[]>([])
const startIndex = ref(0)
const visibleCount = 10
let scrollTimer: number | null = null
// 添加数据更新定时器变量
let updateDataTimer: number | null = null

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
    const response = await Algorithm1Api.getTimeMixerResultsWithPagination(requestParams)

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
    const blobData = await Algorithm1Api.downloadTimeMixerCsv(downloadParams)

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

const processSensorData = (rawData: Result[]): Sensor[] => {
  return rawData.map((item) => {
    const pointIdPrefix = item.point_id.slice(0, 3).toUpperCase()
    const region = item.region || pointIdPrefix

    return {
      timestamp: item.timestamp || new Date().toISOString(),
      point_id: item.point_id || 'UNKNOWN',
      temperature: Number(item.temperature) || 0,
      pressure: Number(item.pressure) || 0,
      flow_rate: Number(item.flow_rate) || 0,
      level: Number(item.level) || 0,
      gas_type: item.gas_type || 'N/A',
      gas_concentration: Number(item.gas_concentration) || 0,
      region: region,
    }
  })
}

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

const handleRegionChange = () => {
  startIndex.value = 0
  loadSensorData() // 区域变更时重新加载数据
}

const toggleAttributeDropdown = () => {
  showAttributeDropdown.value = !showAttributeDropdown.value
}

const toggleRegionDropdown = () => {
  regionDropdownOpen.value = !regionDropdownOpen.value
}

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

const formatTimestamp = (timestamp: string): string => {
  return timestamp.slice(0, 19).replace('T', ' ')
}

const filteredSensors = computed(() => {
  if (!selectedRegion.value) return sensors.value
  return sensors.value.filter((sensor) => sensor.region === selectedRegion.value.toUpperCase())
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

const scrollList = () => {
  if (filteredSensors.value.length > 0) {
    startIndex.value = (startIndex.value + 1) % filteredSensors.value.length
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

  // 设置数据更新定时器，每10秒更新一次（仅在非展开状态下）
  if (!isExpanded.value) {
    updateDataTimer = setInterval(async () => {
      // 更新timestep，最大29
      timestep.value = (timestep.value + 1) % 30
      await loadSensorData()
    }, 10000) as unknown as number
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

  // 清除数据更新定时器
  if (updateDataTimer) {
    clearInterval(updateDataTimer)
    updateDataTimer = null
  }
})

// 处理鼠标悬停
const handleHover = (sensor: Sensor) => {
  // 鼠标悬停时停止滚动
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }
  if (updateDataTimer) {
    clearInterval(updateDataTimer)
    updateDataTimer = null
  }
  // 向Unity发送消息，高亮传感器
  const SensorJson = JSON.stringify(sensor)
  console.log('向Unity发送消息:', SensorJson)
  UnityService.sendMessageToUnity('Sensor', 'SensorHighlightOn', SensorJson)
}

// 处理鼠标离开
const handleHoverEnd = () => {
  // 如果不在展开状态，重新开始滚动
  if (!isExpanded.value && !scrollTimer) {
    scrollTimer = setInterval(scrollList, 2000) as unknown as number
  }
  if (!isExpanded.value && !updateDataTimer) {
    updateDataTimer = setInterval(async () => {
      // 更新timestep，最大29
      timestep.value = (timestep.value + 1) % 30
      await loadSensorData()
    }, 10000) as unknown as number
  }
  // 向Unity发送消息，取消高亮传感器
  UnityService.sendMessageToUnity('Sensor', 'SensorHighlightOff')
}

// 点击处理函数，添加高亮切换逻辑
const handleClick = (sensor: Sensor) => {
  // 切换高亮状态
  if (highlightedSensorId.value === sensor.point_id) {
    highlightedSensorId.value = '' // 如果点击的是当前高亮行，则取消高亮
  } else {
    highlightedSensorId.value = sensor.point_id // 否则设置新的高亮行
  }

  // 显示传感器详情消息
  // messageStore.showMessage(
  //   sensor,
  //   {
  //     labelMap: {
  //       timestamp: '时间戳',
  //       point_id: '传感器编号',
  //       region: '区域',
  //       temperature: '温度',
  //       pressure: '压力',
  //       flow_rate: '流量',
  //       level: '液位',
  //       gas_type: '气体类型',
  //       gas_concentration: '气体浓度',
  //     },
  //     valueFormatters: {
  //       temperature: (v: number) => `${v.toFixed(2)}°C`,
  //       pressure: (v: number) => `${v.toFixed(2)}kPa`,
  //       flow_rate: (v: number) => `${v.toFixed(2)}m³/h`,
  //       level: (v: number) => `${v.toFixed(2)}%`,
  //       gas_concentration: (v: number) => `${v.toFixed(2)}ppm`,
  //     },
  //   },
  //   {
  //     source: 'sensor', // 可选的消息来源标识
  //     title: `传感器详情 - ${sensor.point_id}`, // 设置特定标题
  //   },
  // )

  // 发送消息到Unity
  UnityService.sendMessageToUnity('Sensor', 'SensorContinuousHighlight', JSON.stringify(sensor))
}

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
    const imageBlob = await Algorithm1Api.getPredictionChart({
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

// 当筛选条件变化时，清除高亮状态
watch([selectedRegion, selectedAttributes], () => {
  highlightedSensorId.value = ''
  startIndex.value = 0
})

watch(selectedRegion, (newVal) => {
  localStorage.setItem('scrollingListSelectedRegion', newVal)
})

watch(
  selectedAttributes,
  (newVal) => {
    const sortedAttributes = newVal.sort((a, b) => {
      const indexA = attributes.findIndex((attr) => attr.value === a)
      const indexB = attributes.findIndex((attr) => attr.value === b)
      return indexA - indexB
    })
    selectedAttributes.value = sortedAttributes
    localStorage.setItem('scrollingListSelectedAttributes', JSON.stringify(sortedAttributes))
  },
  { deep: true },
)
</script>

<style lang="scss">
@use '@/assets/styles/ScrollingSensorList.scss';
</style>
