<template>
  <el-card class="setup-wizard">
    <div class="wizard-header">
      <h2 class="wizard-title">欢迎使用需求智能分析工具</h2>
      <p class="wizard-desc">首次使用需要完成以下配置，请按步骤操作：</p>
    </div>

    <el-steps :active="currentStep" align-center class="wizard-steps">
      <el-step title="连接 PingCode" :icon="Link" />
      <el-step title="配置 AI 模型" :icon="Cpu" />
      <el-step title="同步数据" :icon="Refresh" />
    </el-steps>

    <div class="wizard-content">
      <!-- 步骤 1：连接 PingCode -->
      <div v-if="currentStep === 0" class="step-content">
        <div class="step-icon-wrapper">
          <el-icon :size="48" color="#409eff"><Link /></el-icon>
        </div>
        <h3>连接 PingCode</h3>
        <p>配置您的 PingCode 应用凭证，以便与 PingCode 系统对接。</p>
        <el-button type="primary" size="large" @click="$emit('open-settings')">
          前往设置
        </el-button>
        <el-button v-if="isConnected" type="success" size="large" plain disabled>
          已连接
        </el-button>
      </div>

      <!-- 步骤 2：配置 AI 模型 -->
      <div v-if="currentStep === 1" class="step-content">
        <div class="step-icon-wrapper">
          <el-icon :size="48" color="#e6a23c"><Cpu /></el-icon>
        </div>
        <h3>配置 AI 模型</h3>
        <p>添加一个 LLM 模型配置（OpenAI 兼容接口或 Anthropic），用于智能分析需求文档。</p>
        <el-button type="primary" size="large" @click="$emit('go-to-models')">
          前往模型配置
        </el-button>
        <el-button v-if="hasModel" type="success" size="large" plain disabled>
          已配置
        </el-button>
      </div>

      <!-- 步骤 3：同步数据 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="step-icon-wrapper">
          <el-icon :size="48" color="#67c23a"><Refresh /></el-icon>
        </div>
        <h3>同步 PingCode 数据</h3>
        <p>从 PingCode 拉取项目和工作项数据，用于智能匹配和去重。</p>
        <el-button
          type="primary"
          size="large"
          :loading="syncing"
          @click="$emit('sync')"
        >
          {{ syncing ? '同步中...' : '开始同步' }}
        </el-button>
        <el-button type="text" @click="$emit('skip')">跳过，稍后同步</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Link, Cpu, Refresh } from '@element-plus/icons-vue'
import { getModelConfigs } from '@/api/models'

const props = defineProps<{
  isConnected: boolean
  syncing: boolean
  hasSyncedData: boolean
}>()

defineEmits<{
  (e: 'open-settings'): void
  (e: 'go-to-models'): void
  (e: 'sync'): void
  (e: 'skip'): void
}>()

const hasModel = ref(false)

const currentStep = computed(() => {
  if (!props.isConnected) return 0
  if (!hasModel.value) return 1
  return 2
})

onMounted(async () => {
  try {
    const res = await getModelConfigs()
    const models = res.data || []
    hasModel.value = models.length > 0
  } catch {
    hasModel.value = false
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.setup-wizard {
  max-width: 700px;
  margin: 40px auto;
}

.wizard-header {
  text-align: center;
  margin-bottom: 32px;
}

.wizard-title {
  font-size: 24px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 8px;
}

.wizard-desc {
  font-size: 14px;
  color: $text-secondary;
}

.wizard-steps {
  margin-bottom: 40px;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
  text-align: center;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
  }

  p {
    font-size: 14px;
    color: $text-secondary;
    max-width: 400px;
    margin: 0;
  }
}

.step-icon-wrapper {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background-color: $bg-section;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
