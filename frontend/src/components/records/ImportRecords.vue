<template>
  <el-card class="import-records">
    <template #header>
      <div class="card-header">
        <span>导入记录</span>
        <el-button text type="primary" size="small" @click="refresh">刷新</el-button>
      </div>
    </template>

    <el-table :data="records" stripe style="width: 100%" v-loading="loading">
      <el-table-column prop="file_name" label="文件名" min-width="150" show-overflow-tooltip />
      <el-table-column prop="requirements_count" label="需求数量" width="100" align="center" />
      <el-table-column prop="projects_count" label="项目数量" width="100" align="center" />
      <el-table-column prop="target_project_name" label="目标项目" min-width="120" show-overflow-tooltip />
      <el-table-column prop="imported_count" label="成功导入" width="100" align="center" />
      <el-table-column prop="failed_count" label="导入失败" width="100" align="center" />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="时间" width="160" align="center">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" align="center" fixed="right">
        <template #default="{ row }">
          <el-button text type="danger" size="small" @click="deleteRecord(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!records.length && !loading" class="empty-tip">暂无导入记录</div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getImportRecords,
  deleteImportRecord,
  type ImportRecord,
} from '@/api/records'

const loading = ref(false)
const records = ref<ImportRecord[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function loadRecords() {
  loading.value = true
  try {
    const res = await getImportRecords({
      page: currentPage.value,
      pageSize: pageSize.value,
    })
    records.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch {
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await loadRecords()
}

async function deleteRecord(record: ImportRecord) {
  try {
    await ElMessageBox.confirm(`确定删除记录"${record.file_name}"吗？`, '确认删除', {
      type: 'warning',
    })
    await deleteImportRecord(record.id)
    ElMessage.success('删除成功')
    await loadRecords()
  } catch {
    // User cancelled or error handled
  }
}

function handlePageChange(page: number) {
  currentPage.value = page
  loadRecords()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  loadRecords()
}

function getStatusType(status: string) {
  const map: Record<string, string> = {
    analyzed: '',
    importing: 'warning',
    success: 'success',
    partial_success: 'warning',
    failed: 'danger',
  }
  return map[status] || ''
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    analyzed: '已分析',
    importing: '导入中',
    success: '成功',
    partial_success: '部分成功',
    failed: '失败',
  }
  return map[status] || status
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.import-records {
  margin-bottom: $spacing-md;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-tip {
  padding: $spacing-lg;
  text-align: center;
  color: $text-tertiary;
  font-size: $font-size-sm;
}

.pagination {
  margin-top: $spacing-md;
  display: flex;
  justify-content: center;
}
</style>
