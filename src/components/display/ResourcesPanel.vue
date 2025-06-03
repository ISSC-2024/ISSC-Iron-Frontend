<script setup lang="ts">
import { ref } from 'vue'
import unityService from '@/services/UnityService' // 请确保路径正确
import { useMessageStore } from '@/stores/messageStore'
import TextMessageDisplayBox from '../controls/windows/TextMessageDisplayBox.vue' // 引入文本框组件

const messageStore = useMessageStore()

// 记录当前高亮状态
const activeHighlights = ref({
  hr: null as string | null,
  mr: null as string | null,
  bi: null as string | null,
})

// 定义人力资源数据，新增job和age属性
const humanResources = [
  { id: 1, name: '技术员', description: '技术员 (90人)', icon: '👨‍🔬', job: 'Engineer', age: 35 },
  { id: 2, name: '管理员', description: '管理员 (45人)', icon: '👨‍💼', job: 'Operator', age: 42 },
  { id: 3, name: '维修员', description: '维修员 (65人)', icon: '🔧', job: 'Engineer', age: 38 },
  { id: 4, name: '操作员', description: '操作员 (110人)', icon: '👨‍🏭', job: 'Operator', age: 32 },
  { id: 5, name: '安全员', description: '安全员 (30人)', icon: '🛡️', job: 'SafetyOfficer', age: 40 },
]

// 物料资源数据，更新name以匹配Unity要求
const materialResources = [
  { id: 1, name: 'RawMaterialInventory', displayName: '原料库存', description: '乙烯 (900吨)', icon: '🧪' },
  { id: 2, name: 'Catalyst', displayName: '催化剂', description: '钯碳催化剂 (400kg)', icon: '⚗️' },
  { id: 3, name: 'TankCapacity', displayName: '储罐容量', description: '液化气储罐 (400吨)', icon: '🔋' },
]

const businessInfo = [
  { id: 1, name: '生产计划', description: '聚合物生产 (92%)', icon: '📊' },
  { id: 2, name: '订单状态', description: '待处理订单 (7个)', icon: '📋' },
  { id: 3, name: '质检报告', description: '合格率 (98.5%)', icon: '✅' },
]

// 处理人员点击事件（切换显示/隐藏）
const handleHumanResourceClick = (item: any) => {
  const dataJson = {
    name: item.name,
    job: item.job,
    age: item.age,
  }

  // 发送消息到Unity
  unityService.sendMessageToUnity('People', 'PeopleContinuousHighlight', JSON.stringify(dataJson))

  // 更新本地高亮状态
  if (activeHighlights.value.hr === item.name) {
    activeHighlights.value.hr = null
    // 第二次点击时隐藏消息
    messageStore.hideMessage('HumanResource')
  } else {
    activeHighlights.value.hr = item.name
    // 第一次点击时显示消息
    messageStore.showMessage(
      {
        message: `职位: ${item.job}\n年龄: ${item.age}`,
        timestamp: new Date().toISOString(),
      },
      {
        labelMap: {
          timestamp: '时间戳',
          status: '状态',
        },
        valueFormatters: {
          timestamp: (v: string) => new Date(v).toLocaleString(),
        },
      },
      {
        source: 'HumanResource',
        title: `人力资源`,
      },
    )
  }
}

// 处理物料资源点击事件（切换显示/隐藏）
const handleMaterialResourceClick = (item: any) => {
  const dataJson = {
    name: item.name,
    desc: item.description,
  }

  // 发送消息到Unity
  unityService.sendMessageToUnity('Resource', 'ResourceContinuousHighlight', JSON.stringify(dataJson))

  // 更新本地高亮状态
  if (activeHighlights.value.mr === item.name) {
    activeHighlights.value.mr = null
    // 第二次点击时隐藏消息
    messageStore.hideMessage('MaterialResource')
  } else {
    activeHighlights.value.mr = item.name
    // 第一次点击时显示消息
    messageStore.showMessage(
      {
        message: `${item.description}`,
        timestamp: new Date().toISOString(),
      },
      {
        labelMap: {
          timestamp: '时间戳',
          status: '状态',
        },
        valueFormatters: {
          timestamp: (v: string) => new Date(v).toLocaleString(),
        },
      },
      {
        source: 'MaterialResource',
        title: `物料资源`,
      },
    )
  }
}

// 添加人力资源悬停事件处理
const handleHumanResourceHover = (item: any) => {
  const dataJson = {
    name: item.name,
    job: item.job,
    age: item.age,
  }
  // 发送消息到Unity，启用高亮
  unityService.sendMessageToUnity('People', 'PeopleHighlightOn', JSON.stringify(dataJson))
}

// 添加人力资源离开事件处理
const handleHumanResourceLeave = (item: any) => {
  const dataJson = {
    name: item.name,
    job: item.job,
    age: item.age,
  }
  // 发送消息到Unity，禁用高亮
  unityService.sendMessageToUnity('People', 'PeopleHighlightOff', JSON.stringify(dataJson))
}

// 添加物料资源悬停事件处理
const handleMaterialResourceHover = (item: any) => {
  const dataJson = {
    name: item.name,
    desc: item.description,
  }
  // 发送消息到Unity，启用高亮
  unityService.sendMessageToUnity('Resource', 'ResourceHighlightOn', JSON.stringify(dataJson))
}

// 添加物料资源离开事件处理
const handleMaterialResourceLeave = (item: any) => {
  const dataJson = {
    name: item.name,
    desc: item.description,
  }
  // 发送消息到Unity，禁用高亮
  unityService.sendMessageToUnity('Resource', 'ResourceHighlightOff', JSON.stringify(dataJson))
}
</script>

<template>
  <div class="resources-display">
    <div class="resources-content">
      <!-- 人力资源列 -->
      <div class="resource-column">
        <div class="column-title">
          <div class="title-glow"></div>
          <div class="title-icon-small">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"
              />
            </svg>
          </div>
          <span>人力资源</span>
        </div>
        <div class="column-items">
          <div
            class="resource-item"
            v-for="item in humanResources"
            :key="item.id"
            @click="handleHumanResourceClick(item)"
            @mouseenter="handleHumanResourceHover(item)"
            @mouseleave="handleHumanResourceLeave(item)"
            :class="{ 'item-active': activeHighlights.hr === item.name }"
          >
            <div class="resource-icon">
              <div class="icon-container">{{ item.icon }}</div>
              <div class="icon-reflection"></div>
            </div>
            <div class="resource-info">
              <div class="resource-name">{{ item.name }}</div>
              <div class="resource-description">{{ item.description }}</div>
            </div>
            <div class="item-glow"></div>
          </div>
        </div>
      </div>

      <!-- 物料资源列 -->
      <div class="resource-column">
        <div class="column-title">
          <div class="title-glow"></div>
          <div class="title-icon-small">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M13,6V11H18V7.75L22.25,12L18,16.25V13H13V18H16.25L12,22.25L7.75,18H11V13H6V16.25L1.75,12L6,7.75V11H11V6H7.75L12,1.75L16.25,6H13Z"
              />
            </svg>
          </div>
          <span>物料资源</span>
        </div>
        <div class="column-items">
          <div
            class="resource-item"
            v-for="item in materialResources"
            :key="item.id"
            @click="handleMaterialResourceClick(item)"
            @mouseenter="handleMaterialResourceHover(item)"
            @mouseleave="handleMaterialResourceLeave(item)"
            :class="{ 'item-active': activeHighlights.mr === item.name }"
          >
            <div class="resource-icon">
              <div class="icon-container">{{ item.icon }}</div>
              <div class="icon-reflection"></div>
            </div>
            <div class="resource-info">
              <div class="resource-name">{{ item.displayName }}</div>
              <div class="resource-description">{{ item.description }}</div>
            </div>
            <div class="item-glow"></div>
          </div>
        </div>
      </div>

      <!-- 业务信息列 -->
      <div class="resource-column">
        <div class="column-title">
          <div class="title-glow"></div>
          <div class="title-icon-small">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="currentColor"
                d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M9,18H7V16H9V18M9,15H7V9H9V15M13,18H11V13H13V18M13,12H11V9H13V12M17,18H15V11H17V18M17,10H15V9H17V10Z"
              />
            </svg>
          </div>
          <span>业务信息</span>
        </div>
        <div class="column-items">
          <div class="resource-item" v-for="item in businessInfo" :key="item.id">
            <div class="resource-icon">
              <div class="icon-container">{{ item.icon }}</div>
              <div class="icon-reflection"></div>
            </div>
            <div class="resource-info">
              <div class="resource-name">{{ item.name }}</div>
              <div class="resource-description">{{ item.description }}</div>
            </div>
            <div class="item-glow"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 文本框组件 -->
  <TextMessageDisplayBox />
</template>

<style lang="scss" scoped>
@use '@/assets/styles/ResourcesPanel.scss';
</style>
