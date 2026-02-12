<template>
  <el-card class="user-management">
    <template #header>
      <div class="card-header">
        <span>用户管理</span>
        <div class="header-actions">
          <el-input
            v-model="searchText"
            placeholder="搜索用户名"
            size="small"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-button type="primary" size="small" @click="handleSearch">搜索</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreateDialog">
            新增用户
          </el-button>
        </div>
      </div>
    </template>

    <el-table :data="users" stripe style="width: 100%" v-loading="loading">
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="pingcode_display_name" label="PingCode 名称" min-width="120">
        <template #default="{ row }">
          {{ row.pingcode_display_name || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="pingcode_email" label="邮箱" min-width="180">
        <template #default="{ row }">
          {{ row.pingcode_email || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="角色" min-width="150">
        <template #default="{ row }">
          <el-tag
            v-for="role in (row.roles || [])"
            :key="role.id || role"
            size="small"
            :type="(role.name || role) === 'admin' ? 'danger' : ''"
            style="margin: 2px"
          >
            {{ role.display_name || role }}
          </el-tag>
          <span v-if="!row.roles?.length">-</span>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" width="160" align="center">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="editUser(row)">
            编辑
          </el-button>
          <el-button text type="danger" size="small" @click="handleDeleteUser(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="!users.length && !loading" class="empty-tip">暂无用户</div>

    <!-- 分页 -->
    <div v-if="total > 0" class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑用户' : '新增用户'"
      width="500px"
    >
      <el-form :model="formData" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="isEdit"
          />
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            show-password
            placeholder="请输入密码"
          />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="角色">
          <el-checkbox-group v-model="formData.roles">
            <el-checkbox
              v-for="role in allRoles"
              :key="role.id"
              :label="role.id"
              :value="role.id"
            >
              {{ role.display_name }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveUser">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  type UserInfo,
  type Role,
} from '@/api/models'

const loading = ref(false)
const saving = ref(false)
const users = ref<UserInfo[]>([])
const allRoles = ref<Role[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchText = ref('')

const dialogVisible = ref(false)
const isEdit = ref(false)
const editingUserId = ref<string>('')
const formRef = ref<FormInstance>()

const formData = reactive({
  username: '',
  password: '',
  email: '',
  roles: [] as string[],
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 32, message: '用户名长度 2-32 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 64, message: '密码长度 6-64 个字符', trigger: 'blur' },
  ],
}

/** 加载用户列表 */
async function loadUsers() {
  loading.value = true
  try {
    const res = await getUsers({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchText.value || undefined,
    })
    users.value = res.data?.list || []
    total.value = res.data?.total || 0
    // 为每个用户加载详细信息（含角色）
    await enrichUsersWithRoles()
  } catch {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

/** 补充用户角色信息 */
async function enrichUsersWithRoles() {
  for (const user of users.value) {
    try {
      const res = await getUser(user.id)
      if (res.data?.roles) {
        user.roles = res.data.roles
      }
    } catch {
      // 忽略单个用户加载失败
    }
  }
}

/** 加载角色列表 */
async function loadRoles() {
  try {
    const res = await getRoles()
    allRoles.value = res.data || []
  } catch {
    allRoles.value = []
  }
}

function handleSearch() {
  currentPage.value = 1
  loadUsers()
}

function handlePageChange(page: number) {
  currentPage.value = page
  loadUsers()
}

function handleSizeChange(size: number) {
  pageSize.value = size
  currentPage.value = 1
  loadUsers()
}

/** 重置表单 */
function resetForm() {
  Object.assign(formData, {
    username: '',
    password: '',
    email: '',
    roles: [],
  })
  editingUserId.value = ''
}

/** 打开新增对话框 */
function openCreateDialog() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

/** 打开编辑对话框 */
async function editUser(user: UserInfo) {
  isEdit.value = true
  editingUserId.value = user.id
  try {
    const res = await getUser(user.id)
    const detail = res.data
    Object.assign(formData, {
      username: detail?.username || user.username,
      password: '',
      email: detail?.pingcode_email || '',
      roles: (detail?.roles || []).map((r: any) => r.id || r),
    })
  } catch {
    Object.assign(formData, {
      username: user.username,
      password: '',
      email: user.pingcode_email || '',
      roles: [],
    })
  }
  dialogVisible.value = true
}

/** 保存用户 */
async function saveUser() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (isEdit.value && editingUserId.value) {
      await updateUser(editingUserId.value, {
        email: formData.email,
        roles: formData.roles,
      })
      ElMessage.success('用户更新成功')
    } else {
      await createUser({
        username: formData.username,
        password: formData.password,
        email: formData.email || undefined,
      })
      ElMessage.success('用户创建成功')
    }
    dialogVisible.value = false
    await loadUsers()
  } catch {
    // Error handled by interceptor
  } finally {
    saving.value = false
  }
}

/** 删除用户 */
async function handleDeleteUser(user: UserInfo) {
  try {
    await ElMessageBox.confirm(
      `确定删除用户"${user.username}"吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    await deleteUser(user.id)
    ElMessage.success('删除成功')
    await loadUsers()
  } catch {
    // User cancelled or error
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

onMounted(() => {
  loadUsers()
  loadRoles()
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.user-management {
  margin-bottom: $spacing-md;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
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
