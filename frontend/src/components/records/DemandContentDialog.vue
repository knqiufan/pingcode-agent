<template>
  <el-dialog
    v-model="visible"
    :title="`原需求文档 - ${fileName}`"
    width="70%"
    top="5vh"
    @close="handleClose"
  >
    <div class="content-wrapper" v-loading="loading">
      <div v-if="error" class="error-message">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ error }}</span>
      </div>
      <div v-else-if="content" class="content-area">
        <pre class="content-text">{{ content }}</pre>
      </div>
      <div v-else-if="!loading" class="empty-tip">暂无内容</div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCopy" :disabled="!content">
          <el-icon><CopyDocument /></el-icon>
          复制内容
        </el-button>
        <el-button type="primary" @click="visible = false">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { WarningFilled, CopyDocument } from '@element-plus/icons-vue'
import { getDemandContent } from '@/api/records'

const props = defineProps<{
  modelValue: boolean
  recordId: string | null
  fileName: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const loading = ref(false)
const content = ref('')
const error = ref('')

watch(
  () => props.modelValue,
  (val) => {
    if (val && props.recordId) {
      loadContent()
    }
  }
)

async function loadContent() {
  if (!props.recordId) return

  loading.value = true
  error.value = ''
  content.value = ''

  try {
    const res = await getDemandContent(props.recordId)
    content.value = res.data?.content || ''
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function handleClose() {
  content.value = ''
  error.value = ''
}

async function handleCopy() {
  if (!content.value) return

  try {
    await navigator.clipboard.writeText(content.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.content-wrapper {
  min-height: 300px;
  max-height: 70vh;
  overflow: auto;
}

.content-area {
  background-color: $bg-section;
  border-radius: $border-radius;
  padding: $spacing-md;
}

.content-text {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: $font-size-sm;
  line-height: 1.6;
  color: $text-primary;
}

.error-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-lg;
  color: $error-color;
  font-size: $font-size-base;
}

.empty-tip {
  padding: $spacing-lg;
  text-align: center;
  color: $text-tertiary;
  font-size: $font-size-sm;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
}
</style>
