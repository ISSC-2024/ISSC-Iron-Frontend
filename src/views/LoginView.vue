<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Form, Input, Button, message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { UserOutlined, LockOutlined } from '@ant-design/icons-vue'
import AuthService from '../services/AuthService'

const router = useRouter()
const formRef = ref()
const loading = ref(false)
// 登录类型
const loginType = ref('user') // 默认为用户登录

// 切换登录类型
const switchLoginType = (type: string) => {
  loginType.value = type
  // 清空表单
  formState.username = ''
  formState.password = ''
}

// 表单状态
const formState = reactive({
  username: '',
  password: '',
})

// 表单校验规则
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }] as Rule[],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }] as Rule[],
}

// 登录处理
const handleLogin = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    // 使用认证服务进行登录验证，传递登录类型
    const authResult = await AuthService.login(
      {
        username: formState.username,
        password: formState.password,
      },
      loginType.value,
    ) // 传递登录类型

    if (authResult.success) {
      // 显示成功消息
      message.success(authResult.message)

      // 跳转到行业选择页面
      setTimeout(() => {
        router.push('/industry-selection')
        loading.value = false
      }, 1000)
    } else {
      // 显示错误消息
      message.error(authResult.message)
      loading.value = false
    }
  } catch (error) {
    console.log('表单验证失败:', error)
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="tech-background">
      <div class="grid-lines"></div>
      <div class="glow-sphere"></div>
      <div class="floating-particles">
        <span v-for="i in 12" :key="i" class="particle" :class="`p${i}`"></span>
      </div>
    </div>

    <div class="login-card">
      <div class="card-decoration">
        <div class="corner top-left"></div>
        <div class="corner top-right"></div>
        <div class="corner bottom-left"></div>
        <div class="corner bottom-right"></div>
      </div>

      <h1 class="login-title">全域互联的工业智能体协同平台</h1>
      <div class="title-underline"></div>

      <!-- 登录类型切换按钮 -->
      <div class="login-type-switch">
        <Button
          :type="loginType === 'admin' ? 'primary' : 'default'"
          @click="switchLoginType('admin')"
          class="switch-btn"
          :class="{ active: loginType === 'admin' }"
        >
          管理员登录
        </Button>
        <Button
          :type="loginType === 'user' ? 'primary' : 'default'"
          @click="switchLoginType('user')"
          class="switch-btn"
          :class="{ active: loginType === 'user' }"
        >
          企业登录
        </Button>
      </div>

      <Form layout="vertical" :model="formState" :rules="rules" ref="formRef" class="login-form">
        <Form.Item name="username">
          <Input v-model:value="formState.username" size="large" placeholder="用户名" class="styled-input">
            <template #prefix>
              <UserOutlined />
            </template>
          </Input>
        </Form.Item>

        <Form.Item name="password">
          <Input.Password v-model:value="formState.password" size="large" placeholder="密码" class="styled-input">
            <template #prefix>
              <LockOutlined />
            </template>
          </Input.Password>
        </Form.Item>

        <Form.Item>
          <Button type="primary" size="large" block @click="handleLogin" :loading="loading" class="login-button">
            <span class="btn-text">登录</span>
            <span class="btn-shine"></span>
          </Button>
        </Form.Item>
      </Form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/LoginView.scss';
</style>
