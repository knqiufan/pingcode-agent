<template>
  <el-card class="work-item-card">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <span class="card-title">
            <el-icon><List /></el-icon>
            工作项列表（{{ appStore.requirements.length }} 条）
          </span>
          <el-button-group size="small" class="view-toggle">
            <el-button :type="groupByProject ? '' : 'primary'" @click="groupByProject = false">
              列表视图
            </el-button>
            <el-button :type="groupByProject ? 'primary' : ''" @click="groupByProject = true">
              项目分组
            </el-button>
          </el-button-group>
        </div>
        <div class="header-right">
          <el-button
            text
            type="primary"
            :icon="Plus"
            @click="openAddDialog"
          >
            手动添加
          </el-button>
          <el-button
            type="primary"
            :icon="Upload"
            :loading="appStore.importing"
            :disabled="!appStore.selectedProjectId || !appStore.requirements.length"
            @click="appStore.importToPingCode"
          >
            导入到 PingCode
          </el-button>
        </div>
      </div>
    </template>

    <!-- 分组视图 -->
    <div v-if="groupByProject" class="grouped-view">
      <div v-for="(items, projectName) in groupedRequirements" :key="projectName" class="project-group">
        <div class="group-header">
          <el-tag type="info" size="large">{{ projectName }}</el-tag>
          <span class="group-count">{{ items.length }} 个工作项</span>
        </div>
        <el-table :data="items" stripe class="item-table">
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="类型" width="110" align="center">
            <template #default="{ row }">
              <el-select
                :model-value="row.type_id"
                placeholder="类型"
                size="small"
                clearable
                class="cell-select"
                @change="(v: string) => updateRowField(row, 'type_id', v)"
              >
                <el-option
                  v-for="t in typesForProject"
                  :key="t.id"
                  :label="t.name"
                  :value="t.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="优先级" width="110" align="center">
            <template #default="{ row }">
              <el-select
                :model-value="row.priority_id"
                placeholder="优先级"
                size="small"
                clearable
                class="cell-select"
                @change="(v: string) => updateRowField(row, 'priority_id', v)"
              >
                <el-option
                  v-for="p in prioritiesForProject"
                  :key="p.id"
                  :label="p.name"
                  :value="p.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110" align="center">
            <template #default="{ row }">
              <el-select
                :model-value="row.state_id"
                placeholder="状态"
                size="small"
                clearable
                class="cell-select"
                @change="(v: string) => updateRowField(row, 'state_id', v)"
              >
                <el-option
                  v-for="s in statesForType(row.type_id)"
                  :key="s.id"
                  :label="s.name"
                  :value="s.id"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="负责人" width="100" align="center">
            <template #default="{ row }">
              <span class="assignee-text">{{ row.assignee_name || appStore.pingcodeUserInfo?.display_name || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="预估工时" width="100" align="center">
            <template #default="{ row }">{{ row.estimated_hours }}h</template>
          </el-table-column>
          <el-table-column label="开始时间" width="110" align="center">
            <template #default="{ row }">{{ formatDate(row.start_at) }}</template>
          </el-table-column>
          <el-table-column label="匹配状态" width="180">
            <template #default="{ row }">
              <el-tag v-if="row.match && row.match.score && row.match.score >= 0.6" type="warning" size="small">
                相似: {{ row.match.title }} ({{ (row.match.score * 100).toFixed(0) }}%)
              </el-tag>
              <el-tag v-else-if="row.match && row.match.score && row.match.score < 0.6" type="info" size="small">
                没有相似项目
              </el-tag>
              <el-tag v-else-if="row.match" type="warning" size="small">
                相似: {{ row.match.title }}
              </el-tag>
              <el-tag v-else type="success" size="small">新需求</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center" fixed="right">
            <template #default="{ row }">
              <el-button text type="primary" size="small" @click="openDetailDrawer(row)">
                详情
              </el-button>
              <el-button text type="warning" size="small" @click="openEditDialog(row)">
                编辑
              </el-button>
              <el-button text type="danger" size="small" @click="removeItem(row.id)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 列表视图 -->
    <el-table
      v-else
      :data="appStore.requirements"
      stripe
      class="item-table"
    >
      <el-table-column prop="project_name" label="项目" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <el-tag type="info" size="small" effect="plain">
            {{ row.project_name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="类型" width="110" align="center">
        <template #default="{ row, $index }">
          <el-select
            :model-value="row.type_id"
            placeholder="类型"
            size="small"
            clearable
            class="cell-select"
            @change="(v: string) => appStore.updateRequirement($index, { type_id: v })"
          >
            <el-option
              v-for="t in typesForProject"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="优先级" width="110" align="center">
        <template #default="{ row, $index }">
          <el-select
            :model-value="row.priority_id"
            placeholder="优先级"
            size="small"
            clearable
            class="cell-select"
            @change="(v: string) => appStore.updateRequirement($index, { priority_id: v })"
          >
            <el-option
              v-for="p in prioritiesForProject"
              :key="p.id"
              :label="p.name"
              :value="p.id"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110" align="center">
        <template #default="{ row, $index }">
          <el-select
            :model-value="row.state_id"
            placeholder="状态"
            size="small"
            clearable
            class="cell-select"
            @change="(v: string) => appStore.updateRequirement($index, { state_id: v })"
          >
            <el-option
              v-for="s in statesForType(row.type_id)"
              :key="s.id"
              :label="s.name"
              :value="s.id"
            />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="负责人" width="100" align="center">
        <template #default="{ row }">
          <span class="assignee-text">{{ row.assignee_name || appStore.pingcodeUserInfo?.display_name || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="预估工时" width="100" align="center">
        <template #default="{ row }">
          {{ row.estimated_hours }}h
        </template>
      </el-table-column>
      <el-table-column label="开始时间" width="110" align="center">
        <template #default="{ row }">
          {{ formatDate(row.start_at) }}
        </template>
      </el-table-column>
      <el-table-column label="匹配状态" width="180">
        <template #default="{ row }">
          <el-tag v-if="row.match && row.match.score && row.match.score >= 0.6" type="warning" size="small">
            相似: {{ row.match.title }} ({{ (row.match.score * 100).toFixed(0) }}%)
          </el-tag>
          <el-tag v-else-if="row.match && row.match.score && row.match.score < 0.6" type="info" size="small">
            没有相似项目
          </el-tag>
          <el-tag v-else-if="row.match" type="warning" size="small">
            相似: {{ row.match.title }}
          </el-tag>
          <el-tag v-else type="success" size="small">
            新需求
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="openDetailDrawer(row)">
            详情
          </el-button>
          <el-button text type="warning" size="small" @click="openEditDialog(row)">
            编辑
          </el-button>
          <el-button text type="danger" size="small" @click="removeItem(row.id)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 解决方案建议对话框 -->
    <el-dialog
      v-model="solutionDialogVisible"
      title="解决方案建议"
      width="600px"
      class="solution-dialog"
    >
      <div v-if="currentSolution" class="solution-content">
        <h4 class="solution-title">{{ currentSolution.title }}</h4>
        <div class="solution-text">{{ currentSolution.suggestion }}</div>
      </div>
      <template #footer>
        <el-button type="primary" @click="solutionDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 手动添加需求对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="手动添加需求"
      width="700px"
      class="add-dialog"
    >
      <el-form :model="newItem" label-width="100px" class="add-form">
        <el-form-item label="项目名称" required>
          <el-input
            v-model="newItem.project_name"
            placeholder="请输入项目名称"
          />
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input
            v-model="newItem.title"
            placeholder="请输入工作项标题"
          />
        </el-form-item>
        <el-form-item label="详细描述">
          <el-input
            v-model="newItem.description"
            type="textarea"
            :rows="4"
            placeholder="请输入详细描述"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="newItem.type_id" placeholder="请选择类型" style="width: 100%">
            <el-option
              v-for="t in typeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="newItem.priority" placeholder="请选择优先级" style="width: 100%">
            <el-option label="高" value="High" />
            <el-option label="中" value="Medium" />
            <el-option label="低" value="Low" />
          </el-select>
        </el-form-item>
        <el-form-item label="预估工时">
          <el-input-number
            v-model="newItem.estimated_hours"
            :min="0"
            :step="1"
            placeholder="小时"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addNewRequirement">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑工作项对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑工作项"
      width="700px"
      class="edit-dialog"
    >
      <el-form v-if="editItem" :model="editItem" label-width="100px" class="edit-form">
        <el-form-item label="项目名称">
          <el-input v-model="editItem.project_name" placeholder="项目名称" />
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="editItem.title" placeholder="工作项标题" />
        </el-form-item>
        <el-form-item label="详细描述">
          <el-input
            v-model="editItem.description"
            type="textarea"
            :rows="4"
            placeholder="详细描述"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="editItem.type_id" placeholder="请选择类型" style="width: 100%">
            <el-option
              v-for="t in typeOptions"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="editItem.priority" placeholder="请选择优先级" style="width: 100%">
            <el-option label="高" value="High" />
            <el-option label="中" value="Medium" />
            <el-option label="低" value="Low" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="editItem.assignee_name" placeholder="负责人姓名" />
        </el-form-item>
        <el-form-item label="预估工时">
          <el-input-number
            v-model="editItem.estimated_hours"
            :min="0"
            :step="1"
            placeholder="小时"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="editItem.start_at"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="解决方案建议">
          <el-input
            v-model="editItem.solution_suggestion"
            type="textarea"
            :rows="3"
            placeholder="解决方案建议"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditItem">保存</el-button>
      </template>
    </el-dialog>

    <!-- 工作项详情抽屉 -->
    <el-drawer
      v-model="detailDrawerVisible"
      title="工作项详情"
      size="520px"
      class="detail-drawer"
    >
      <template v-if="detailItem">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="项目名称">{{ detailItem.project_name }}</el-descriptions-item>
          <el-descriptions-item label="标题">{{ detailItem.title }}</el-descriptions-item>
          <el-descriptions-item label="描述">
            <div class="detail-desc">{{ detailItem.description || '-' }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ getTypeLabel(detailItem.type_id) }}
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            {{ getPriorityLabel(detailItem.priority) }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ detailItem.assignee_name || appStore.pingcodeUserInfo?.display_name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="预估工时">{{ detailItem.estimated_hours }}h</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDate(detailItem.start_at) }}</el-descriptions-item>
          <el-descriptions-item label="匹配状态">
            <el-tag
              v-if="detailItem.match && detailItem.match.score && detailItem.match.score >= 0.6"
              type="warning"
              size="small"
            >
              相似: {{ detailItem.match.title }} ({{ (detailItem.match.score * 100).toFixed(0) }}%)
            </el-tag>
            <el-tag
              v-else-if="detailItem.match && detailItem.match.score && detailItem.match.score < 0.6"
              type="info"
              size="small"
            >
              没有相似项目
            </el-tag>
            <el-tag v-else type="success" size="small">新需求</el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="detailItem.solution_suggestion" class="detail-solution">
          <h4 class="detail-section-title">解决方案建议</h4>
          <div class="detail-solution-text">{{ detailItem.solution_suggestion }}</div>
        </div>
      </template>
      <template #footer>
        <el-button type="primary" @click="openEditDialog(detailItem!); detailDrawerVisible = false">
          编辑
        </el-button>
        <el-button @click="detailDrawerVisible = false">关闭</el-button>
      </template>
    </el-drawer>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { List, Upload, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAppStore } from '@/stores/app'
import type { WorkItem } from '@/api/types'
import type { WorkItemPriorityMeta, WorkItemStateMeta } from '@/api/types'
const appStore = useAppStore()
const groupByProject = ref(false)
const solutionDialogVisible = ref(false)
const currentSolution = ref<{ title: string; suggestion: string } | null>(null)
const addDialogVisible = ref(false)
const editDialogVisible = ref(false)
const editItem = ref<WorkItem | null>(null)
const editingIndex = ref(-1)
const detailDrawerVisible = ref(false)
const detailItem = ref<WorkItem | null>(null)

// 类型选项
const typeOptions = [
  { label: '用户故事', value: 'story' },
  { label: '任务', value: 'task' },
  { label: '缺陷', value: 'bug' },
  { label: '特性', value: 'feature' },
  { label: '史诗', value: 'epic' },
]

// 新工作项默认值
const newItem = ref<WorkItem>({
  project_name: '',
  title: '',
  description: '',
  priority: 'Medium',
  estimated_hours: 8,
  start_at: new Date().toISOString(),
  type_id: 'story',
  status: 'new',
})

const groupedRequirements = computed(() => {
  const groups: Record<string, WorkItem[]> = {}
  appStore.requirements.forEach(item => {
    const projectName = item.project_name || '未分类'
    if (!groups[projectName]) {
      groups[projectName] = []
    }
    groups[projectName].push(item)
  })
  return groups
})

const typesForProject = computed(() => {
  const pid = appStore.selectedProjectId
  if (!pid) return []
  return appStore.workItemTypes.filter((t: { project_id: string }) => t.project_id === pid)
})

const prioritiesForProject = computed(() => {
  const pid = appStore.selectedProjectId
  if (!pid) return []
  return appStore.workItemPriorities.filter((p: WorkItemPriorityMeta) => p.project_id === pid)
})

function statesForType(typeId: string | undefined): WorkItemStateMeta[] {
  const pid = appStore.selectedProjectId
  if (!pid) return []
  const list = appStore.workItemStates.filter(
    (s: WorkItemStateMeta) => s.project_id === pid && (!typeId || s.work_item_type_id === typeId)
  )
  return list
}

function updateRowField(row: WorkItem, field: keyof WorkItem, value: string) {
  const index = appStore.requirements.findIndex(item => item.id === row.id)
  if (index !== -1) {
    appStore.updateRequirement(index, { [field]: value })
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function removeItem(id?: string) {
  const index = appStore.requirements.findIndex(item => item.id === id)
  if (index !== -1) {
    appStore.removeRequirement(index)
  }
}

function showSolution(item: WorkItem) {
  currentSolution.value = {
    title: item.title,
    suggestion: item.solution_suggestion || '暂无建议'
  }
  solutionDialogVisible.value = true
}

function openAddDialog() {
  // 重置表单
  newItem.value = {
    project_name: appStore.requirements[0]?.project_name || '',
    title: '',
    description: '',
    priority: 'Medium',
    estimated_hours: 8,
    start_at: new Date().toISOString(),
    type_id: 'story',
    status: 'new',
  }
  addDialogVisible.value = true
}

function addNewRequirement() {
  // 验证必填字段
  if (!newItem.value.title || !newItem.value.project_name) {
    ElMessage.warning('请填写项目名称和标题')
    return
  }

  // 添加新需求
  const requirement: WorkItem = {
    ...newItem.value,
    id: crypto.randomUUID(),
    match: null,
  }

  appStore.requirements.push(requirement)
  addDialogVisible.value = false
  ElMessage.success('添加成功')
}

/** 打开编辑弹窗 */
function openEditDialog(item: WorkItem) {
  editingIndex.value = appStore.requirements.findIndex(r => r.id === item.id)
  if (editingIndex.value === -1) return
  // 深拷贝以避免直接修改 store 数据
  editItem.value = { ...item }
  editDialogVisible.value = true
}

/** 保存编辑 */
function saveEditItem() {
  if (!editItem.value) return
  if (!editItem.value.title) {
    ElMessage.warning('标题不能为空')
    return
  }
  if (editingIndex.value !== -1) {
    appStore.updateRequirement(editingIndex.value, {
      project_name: editItem.value.project_name,
      title: editItem.value.title,
      description: editItem.value.description,
      type_id: editItem.value.type_id,
      priority: editItem.value.priority,
      assignee_name: editItem.value.assignee_name,
      estimated_hours: editItem.value.estimated_hours,
      start_at: editItem.value.start_at,
      solution_suggestion: editItem.value.solution_suggestion,
    })
    ElMessage.success('保存成功')
  }
  editDialogVisible.value = false
}

/** 打开详情抽屉 */
function openDetailDrawer(item: WorkItem) {
  detailItem.value = item
  detailDrawerVisible.value = true
}

/** 获取类型标签 */
function getTypeLabel(typeId?: string): string {
  const option = typeOptions.find(t => t.value === typeId)
  if (option) return option.label
  // 尝试从元数据中查找
  const meta = appStore.workItemTypes.find(
    (t: { id: string }) => t.id === typeId
  )
  return meta?.name || typeId || '-'
}

/** 获取优先级标签 */
function getPriorityLabel(priority?: string): string {
  const map: Record<string, string> = { High: '高', Medium: '中', Low: '低' }
  return map[priority || ''] || priority || '-'
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.work-item-card {
  margin-bottom: $spacing-md;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.header-right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-primary;
}

.view-toggle {
  margin-left: $spacing-sm;
}

.item-table {
  width: 100%;
}

.grouped-view {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.project-group {
  border: 1px solid $border-color;
  border-radius: 4px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background-color: $bg-section;
  border-bottom: 1px solid $border-color;
}

.group-count {
  font-size: $font-size-sm;
  color: $text-tertiary;
}

.cell-select {
  width: 100%;
}

.assignee-text {
  font-size: $font-size-sm;
  color: $text-secondary;
}

.solution-dialog {
  .solution-content {
    padding: $spacing-md 0;
  }

  .solution-title {
    font-size: $font-size-lg;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: $spacing-md;
  }

  .solution-text {
    font-size: $font-size-base;
    color: $text-secondary;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.add-dialog {
  .add-form {
    padding: $spacing-sm 0;
  }
}

.edit-dialog {
  .edit-form {
    padding: $spacing-sm 0;
  }
}

.detail-desc {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.detail-solution {
  margin-top: $spacing-lg;
  padding: $spacing-md;
  background-color: $bg-section;
  border-radius: 4px;
}

.detail-section-title {
  font-size: $font-size-base;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-sm;
}

.detail-solution-text {
  font-size: $font-size-sm;
  color: $text-secondary;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
